import {cssPrefix} from "./constants";
import {standardHTMLAttributes} from "./standardHtmlAttributes";
import {CustomActionTargetSelectorBehavior, SerializedCustomAction} from "./settings/dataModels";

const elementMap = new Map();

export function escapeToHTML(text: string | null | string[], wrapperTag?: string) {
    if(!text)
        return "";
    const div = document.createElement("div");
    if(!wrapperTag && Array.isArray(text)) {
        text = text.join(", ");
    }
    if(typeof text === "string") {
        div.textContent = text;
        return wrapperTag ? `<${wrapperTag}>${div.innerHTML}</${wrapperTag}>` : div.innerHTML;
    }
    return text.map(s => {
        div.textContent = s;
        return `<${wrapperTag}>${div.innerHTML}</${wrapperTag}>`
    }).join(", ");
}

export function findElementByIndex(index: number | string | null): null | Node {
    if (index === null || index === undefined)
        return null;

    index = Number.parseInt(index as string);

    if (elementMap.has(index)) {
        return elementMap.get(index);
    }

    return null;
}

export type DocumentSkeletonizationOptions = {
    wrapTextNodes?: boolean;
    revealPseudoElements?: boolean;
    attributesToKeep?: string[];
    keepMetaTags?: boolean;
    includeTitle?: boolean;
}

export function getDOMSkeleton(options: DocumentSkeletonizationOptions = {}, baseNode?: HTMLElement): string {
    const wrapTextNodes = options?.wrapTextNodes || false;
    const revealPseudoElements = options?.revealPseudoElements || false;
    const attributesToKeep = options?.attributesToKeep || ["standard", "aria", "style", "id"];
    const keepMetaTags = options?.keepMetaTags !== false;
    const includeTitle = options?.includeTitle !== false;

    elementMap.clear();
    let nodeIndex = 0;

    function getSimplifiedDomRecursive(node: Node, keepWhitespace: boolean, isInsideInvisible: boolean): Node[] {
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
            const a10fyClass = `${cssPrefix}${nodeIndex}`;
            if (attributesToKeep.includes("class"))
                resultNode.classList.add(a10fyClass);

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
            if (!attributesToKeep.includes("class"))
                resultNode.setAttribute("class", a10fyClass);

            if (["svg"].includes(node.tagName.toLowerCase()))
                return result;

            keepWhitespace ||= ["preserve", "preserve-spaces"].includes(nodeStyle.getPropertyValue("white-space-collapse"));
            keepWhitespace ||= node.tagName.toLowerCase() === "pre";

            let styleToSet = "";
            let nodeIsInvisible = false;
            if (nodeStyle.getPropertyValue("display") === "none") {
                nodeIsInvisible = true;
                styleToSet = "display: none;";
            }
            else if (["hidden", "collapse"].includes(nodeStyle.getPropertyValue("visibility"))) {
                nodeIsInvisible = true;
                styleToSet = "visibility: hidden;";
            }
            else if (nodeStyle.getPropertyValue("opacity") === "0") {
                nodeIsInvisible = true;
                styleToSet = "opacity: 0;";
            }

            if (styleToSet) {
                const existingStyleString = resultNode.getAttribute("style");
                if(attributesToKeep.includes("style") && existingStyleString)
                    resultNode.setAttribute("style", `${existingStyleString};${styleToSet}`);
                else
                    resultNode.setAttribute("style", styleToSet);
            }
            if(isInsideInvisible) {
                resultNode.setAttribute("style", "");
            }

            const nChildren = node.childNodes.length;
            node.childNodes.forEach((child, idx) => {
                const childResult = getSimplifiedDomRecursive(child, keepWhitespace, nodeIsInvisible || isInsideInvisible);
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

    if (baseNode) {
        const simplifiedDom = getSimplifiedDomRecursive(baseNode, false, false);
        if (simplifiedDom)
            return simplifiedDom.map(
                element => (element instanceof HTMLElement) ? element.outerHTML : element instanceof Text ? element.textContent : ""
            ).join("");
    }
    else {
        const simplifiedDom = getSimplifiedDomRecursive(document.body, false, false);
        if (simplifiedDom) {
            const bodyHTML = simplifiedDom.map(
                element => (element instanceof HTMLElement) ? element.outerHTML : element instanceof Text ? element.textContent : ""
            ).join("");
            const metaTagsHTML = !keepMetaTags ? "" : Array.from(document.getElementsByTagName("meta")).map(
                (element) => element.outerHTML
            ).join("");
            const titleHTML = includeTitle ? `<title>${escapeToHTML(document.title)}</title>` : "";
            return `<html><head>${metaTagsHTML}${titleHTML}</head>${bodyHTML}</html>`
        }
    }

    return "";
}

export function gatherElementsOnPathToRoot(element: HTMLElement, options: {selector?: string, shouldHaveImage?: boolean}) {
    const shouldHaveImage = options.shouldHaveImage === true;
    const elements = [];
    let currentElement: HTMLElement | null = element;
    while(currentElement) {
        if ((!options.selector || currentElement.matches(options.selector)) && (
            !shouldHaveImage
            || currentElement.tagName.toLowerCase() === "img"
            || !["", "none"].includes(window.getComputedStyle(currentElement).backgroundImage)
            || !["", "none"].includes(window.getComputedStyle(currentElement, ":before").backgroundImage)
            || !["", "none"].includes(window.getComputedStyle(currentElement, ":after").backgroundImage)
        )) {
            elements.push(currentElement);
        }
        currentElement = currentElement.parentElement;
    }
}


export async function gatherElementsForCustomActions(actions: SerializedCustomAction[], baseElement: HTMLElement | null) {
    const actionsToElementsMapping = new Map<string, Element | null>();

    for(const action of actions) {
        if (action.targetsFilter.selector === "") {
            actionsToElementsMapping.set(action.id, null);
        }
    }

    const searchForElements = (element: Element, isFallback= false) => {
        let currentElement: Element | null = element;
        while(currentElement) {
            for(const action of actions) {
                if(isFallback && (actionsToElementsMapping.has(action.id) || !action.targetsFilter.allowSearchInPageSelection))
                    continue;

                if ((!action.targetsFilter.selector || currentElement.matches(action.targetsFilter.selector)) && (
                    !action.targetsFilter.imageRequired
                    || currentElement.tagName.toLowerCase() === "img"
                    || !["", "none"].includes(window.getComputedStyle(currentElement).backgroundImage)
                    || !["", "none"].includes(window.getComputedStyle(currentElement, ":before").backgroundImage)
                    || !["", "none"].includes(window.getComputedStyle(currentElement, ":after").backgroundImage)
                )) {
                    if (action.targetsFilter.selectorBehavior === CustomActionTargetSelectorBehavior.exact && currentElement === baseElement) {
                        actionsToElementsMapping.set(action.id, currentElement);
                    }
                    else if (action.targetsFilter.selectorBehavior === CustomActionTargetSelectorBehavior.deepest) {
                        if (!actionsToElementsMapping.has(action.id))
                            actionsToElementsMapping.set(action.id, currentElement);
                    } else if(action.targetsFilter.selectorBehavior === CustomActionTargetSelectorBehavior.closestToRoot) {
                        actionsToElementsMapping.set(action.id, currentElement);
                    }
                }
            }
            currentElement = currentElement.parentElement;
        }

        for (let action of actions) {
            if (!actionsToElementsMapping.has(action.id) && action.targetsFilter.allowSearchInDescendants) {
                const matchingChildren = element.querySelectorAll(action.targetsFilter.selector || "*");
                for (let child of Array.from(matchingChildren)) {
                    if (!action.targetsFilter.imageRequired
                        || child.tagName.toLowerCase() === "img"
                        || !["", "none"].includes(window.getComputedStyle(child).backgroundImage)
                        || !["", "none"].includes(window.getComputedStyle(child, ":before").backgroundImage)
                        || !["", "none"].includes(window.getComputedStyle(child, ":after").backgroundImage)
                    ) {
                        actionsToElementsMapping.set(action.id, child);
                        break;
                    }
                }
            }
        }
    }
    if(baseElement)
        searchForElements(baseElement);
    const selection = window.getSelection();
    if(selection) {
        if(selection.focusNode instanceof Element)
            searchForElements(selection.focusNode, true)
        if(selection.anchorNode instanceof Element)
            searchForElements(selection.anchorNode, true)
    }

    return actionsToElementsMapping;
}
