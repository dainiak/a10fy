import {cssPrefix, cssPrefixFallbackSymbol, ActionRequest} from "./constants";
import ActionQueue from "./actionQueue";
import {llmPageActions} from "./llmPageActions";

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
}

function getDocumentSkeleton(rootElement: HTMLElement, options: DocumentSkeletonizationOptions = {}):string {
    const wrapTextNodes = options?.wrapTextNodes || false;

    elementMap.clear();
    let nodeIndex = 0;

    function getSimplifiedDomRecursive(node: Node, keepWhitespace: boolean)  {
        if (!(node instanceof Text || node instanceof HTMLElement || node instanceof Comment))
            return null;
        keepWhitespace ||= false;
        if (node instanceof Text) {
            const text = (keepWhitespace ? node.textContent : node.textContent?.replace(/(&nbsp;|\s|\n)+/g, " ")) || "";
            if (wrapTextNodes && (node.parentNode?.children.length || 0) > 1) {
                const wrapper = document.createElement("span");
                wrapper.textContent = text;
                wrapper.setAttribute("class", `${cssPrefix}${nodeIndex}`);
                ++nodeIndex;
                // @ts-ignore
                node[cssPrefixFallbackSymbol] = nodeIndex;
                elementMap.set(nodeIndex, node);
                return wrapper;
            }
            return document.createTextNode(text);
        } else if (node instanceof Comment || ["script", "style", "noscript"].includes(node.tagName.toLowerCase())) {
            return null;
        } else if (node instanceof HTMLElement) {
            const nodeStyle = window.getComputedStyle(node);
            const resultNode = node.cloneNode(false) as HTMLElement;

            ++nodeIndex;
            resultNode.setAttribute("class", `${cssPrefix}${nodeIndex}`);
            // @ts-ignore
            node[cssPrefixFallbackSymbol] = nodeIndex;
            elementMap.set(nodeIndex, node);

            const srcAttribute = node.getAttribute("src");
            if (srcAttribute?.startsWith("data:")) {
                resultNode.removeAttribute("src");
            }
            for (let i = 0; i < resultNode.attributes.length; i++) {
                const attribute = resultNode.attributes[i];
                if (attribute.name.startsWith("data-")) {
                    resultNode.removeAttribute(attribute.name);
                }
            }

            if (["svg"].includes(node.tagName.toLowerCase()))
                return resultNode;

            keepWhitespace ||= ["preserve", "preserve-spaces"].includes(nodeStyle.getPropertyValue("white-space-collapse"));
            keepWhitespace ||= node.tagName.toLowerCase() === "pre";

            if (nodeStyle.getPropertyValue("display") === "none")
                resultNode.setAttribute("style", "display: none");
            if (["hidden", "collapse"].includes(nodeStyle.getPropertyValue("visibility")))
                resultNode.setAttribute("style", "visibility: hidden");
            if (nodeStyle.getPropertyValue("opacity") === "0")
                resultNode.setAttribute("style", "opacity: 0");

            const nChildren = node.childNodes.length;
            node.childNodes.forEach((child, idx) => {
                const childResult = getSimplifiedDomRecursive(child, keepWhitespace);
                if (childResult == null)
                    return null;
                if ((idx === 0 || idx === nChildren - 1) && nodeStyle.getPropertyValue("display") === "block" && childResult.nodeType === Node.TEXT_NODE && childResult.textContent === " ")
                    return null;
                if (idx > 0 && idx < nChildren - 1 && childResult.nodeType === Node.TEXT_NODE && childResult.textContent === " ")
                    return null;
                resultNode.appendChild(childResult);
            });

            return resultNode;
        }
    }

    const simplifiedDomBody = getSimplifiedDomRecursive(rootElement, false);
    if (simplifiedDomBody instanceof HTMLElement)
        return simplifiedDomBody.outerHTML;
    return "";
}

function enqueuePageAction(actionQueue: ActionQueue, action: ActionRequest) {
    const {actionName, elementIndex, actionParams} = action;
    const element = findElementByIndex(elementIndex);

    if (llmPageActions.hasOwnProperty(actionName)) {
        actionQueue.enqueue(llmPageActions[actionName].atomicActions(element, actionParams));
    }
    else {
        console.log(`Action ${actionName} not found`)
    }
}


export {getDocumentSkeleton, enqueuePageAction, findElementByIndex};