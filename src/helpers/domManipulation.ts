import {cssPrefix, cssPrefixFallbackSymbol, ActionRequest} from "./constants";
import ActionQueue from "./actionQueue";
import {llmPageActions} from "./llmPageActions";
import {standardHTMLAttributes} from "./standardHtmlAttributes";

const elementMap = new Map();


function findElementByIndex(index: number | string | null) {
    if (index === null || index === undefined)
        return null;

    index = Number.parseInt(index as string);

    if (elementMap.has(index)) {
        const element = elementMap.get(index);
        if (element[cssPrefixFallbackSymbol] === index)
            return element;
    }

    // @ts-ignore
    for (const element of document.getElementsByTagName("*"))
        if (element[cssPrefixFallbackSymbol] === index)
            return element;

    return null;
}

type DocumentSkeletonizationOptions = {
    wrapTextNodes?: boolean;
    revealPseudoElements?: boolean;
    attributesToKeep?: string[];
}

function getDocumentSkeleton(rootElement: HTMLElement, options: DocumentSkeletonizationOptions = {}): string {
    const wrapTextNodes = options?.wrapTextNodes || false;
    const revealPseudoElements = options?.revealPseudoElements || false;
    const attributesToKeep = options?.attributesToKeep || ["standard", "aria", "style", "id"];

    elementMap.clear();
    let nodeIndex = 0;

    function getSimplifiedDomRecursive(node: Node, keepWhitespace: boolean): Node[] {
        if (!(node instanceof Text || node instanceof HTMLElement || node instanceof Comment))
            return [];
        keepWhitespace ||= false;
        if (node instanceof Text) {
            const text = (keepWhitespace ? node.textContent : node.textContent?.replace(/(&nbsp;|\s|\n)+/g, " ")) || "";
            if (wrapTextNodes && (node.parentNode?.children.length || 0) > 1) {
                const wrapper = document.createElement("span");
                wrapper.textContent = text;
                wrapper.setAttribute("class", `${cssPrefix}${nodeIndex}`);
                ++nodeIndex;
                Object.assign(node, {[cssPrefixFallbackSymbol]: nodeIndex})
                elementMap.set(nodeIndex, node);
                return [wrapper];
            }
            return [document.createTextNode(text)];
        } else if (node instanceof Comment || ["script", "style", "noscript"].includes(node.tagName.toLowerCase())) {
            return [];
        } else if (node instanceof HTMLElement) {
            const result = [];
            const nodeStyle = window.getComputedStyle(node);
            const resultNode = node.cloneNode(false) as HTMLElement;

            if (revealPseudoElements) {
                const pseudoStyleBefore = window.getComputedStyle(node, "before");
                let contentBefore = pseudoStyleBefore.getPropertyValue("content");
                contentBefore = contentBefore === "none" ? "" : contentBefore.replace(/["']/g, "").trim();
                if (pseudoStyleBefore.getPropertyValue("display") !== "none" && contentBefore)
                    result.push(document.createTextNode(contentBefore));
            }
            result.push(resultNode);
            if (revealPseudoElements) {
                const pseudoStyleAfter = window.getComputedStyle(node, "after");
                let contentAfter = pseudoStyleAfter.getPropertyValue("content");
                contentAfter = contentAfter === "none" ? "" : contentAfter.replace(/["']/g, "").trim();
                if (pseudoStyleAfter.getPropertyValue("display") !== "none" && contentAfter)
                    result.push(document.createTextNode(contentAfter));
            }

            ++nodeIndex;
            if (attributesToKeep.includes("class"))
                resultNode.classList.add(`${cssPrefix}${nodeIndex}`);
            else
                resultNode.setAttribute("class", `${cssPrefix}${nodeIndex}`);
            Object.assign(node, {[cssPrefixFallbackSymbol]: nodeIndex});
            elementMap.set(nodeIndex, node);

            const srcAttribute = node.getAttribute("src");
            if (srcAttribute?.startsWith("data:")) {
                resultNode.removeAttribute("src");
            }

            Array.from(resultNode.attributes).forEach((attribute) => {
                const tagName = node.tagName.toLowerCase();
                const attrName = attribute.name;
                const needToKeep = (
                    attributesToKeep.includes("style") && attrName === "style"
                    || attributesToKeep.includes("class") && attrName === "class"
                    || attributesToKeep.includes("id") && attrName === "id"
                    || attributesToKeep.includes("non-data") && !attrName.startsWith("data-")
                    || attributesToKeep.includes("data") && attrName.startsWith("data-")
                    || attributesToKeep.includes("aria") && attrName.startsWith("aria-")
                    || attributesToKeep.includes("essential") && standardHTMLAttributes.hasOwnProperty(tagName) && standardHTMLAttributes[tagName].essential.includes(attrName)
                    || attributesToKeep.includes("standard") && standardHTMLAttributes.hasOwnProperty(tagName) && (standardHTMLAttributes[tagName].essential.includes(attrName) || standardHTMLAttributes[tagName].other.includes(attrName))
                );
                if (needToKeep)
                    return;
                resultNode.removeAttribute(attrName);
            });

            if (["svg"].includes(node.tagName.toLowerCase()))
                return result;

            keepWhitespace ||= ["preserve", "preserve-spaces"].includes(nodeStyle.getPropertyValue("white-space-collapse"));
            keepWhitespace ||= node.tagName.toLowerCase() === "pre";

            let styleToSet = "";
            if (nodeStyle.getPropertyValue("display") === "none")
                styleToSet = "display: none;";
            else if (["hidden", "collapse"].includes(nodeStyle.getPropertyValue("visibility")))
                styleToSet = "visibility: hidden;";
            else if (nodeStyle.getPropertyValue("opacity") === "0")
                styleToSet = "opacity: 0;";

            if (styleToSet) {
                const existingStyleString = resultNode.getAttribute("style");
                if(attributesToKeep.includes("style") && existingStyleString)
                    resultNode.setAttribute("style", `${existingStyleString};${styleToSet}`);
                else
                    resultNode.setAttribute("style", styleToSet);
            }

            const nChildren = node.childNodes.length;
            node.childNodes.forEach((child, idx) => {
                const childResult = getSimplifiedDomRecursive(child, keepWhitespace);
                if (!childResult.length)
                    return;
                for (const childNode of childResult) {
                    if ((idx === 0 || idx === nChildren - 1) && nodeStyle.getPropertyValue("display") === "block" && childNode.nodeType === Node.TEXT_NODE && childNode.textContent === " ")
                        continue;
                    if (idx > 0 && idx < nChildren - 1 && childNode.nodeType === Node.TEXT_NODE && childNode.textContent === " ")
                        continue;
                    resultNode.appendChild(childNode);
                }
            });

            return result;
        }
        return [];
    }

    const simplifiedDomBody = getSimplifiedDomRecursive(rootElement, false);
    if (simplifiedDomBody)
        return simplifiedDomBody.map(
            element => (element instanceof HTMLElement) ? element.outerHTML : element instanceof Text ? element.textContent : ""
        ).join("");
    return "";
}

function enqueuePageAction(actionQueue: ActionQueue, action: ActionRequest) {
    const {actionName, elementIndex, actionParams} = action;
    const element = findElementByIndex(elementIndex);

    if (llmPageActions.hasOwnProperty(actionName)) {
        actionQueue.enqueue(llmPageActions[actionName].atomicActions(element, actionParams));
    } else {
        console.log(`Action ${actionName} not found`)
    }
}


export {getDocumentSkeleton, enqueuePageAction, findElementByIndex};