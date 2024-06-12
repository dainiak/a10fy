import { cssPrefix, cssPrefixFallbackSymbol } from "./constants";

const elementMap = new Map();

function findElementByIndex(index) {
    if (elementMap.has(index)) {
        const element = elementMap.get(index);
        if (element[cssPrefixFallbackSymbol] === index)
            return element;
    }

    for (let element of document.getElementsByTagName("*"))
        if (element[cssPrefixFallbackSymbol] === index)
            return element;

    return null;
}

function getDocumentSkeleton() {
    elementMap.clear();
    let nodeIndex = 0;

    function getSimplifiedDomRecursive(node, keepWhitespace) {
        keepWhitespace ||= false;
        if (node.nodeType === Node.TEXT_NODE) {
            if (keepWhitespace)
                return node.textContent;
            return document.createTextNode(node.textContent.replace(/(&nbsp;|\s|\n)+/g, " "));
        }
        else if (node.nodeType === Node.COMMENT_NODE || ["script", "style", "noscript"].includes(node.tagName.toLowerCase())) {
            return null;
        }
        else if (node.nodeType === Node.ELEMENT_NODE) {
            const nodeStyle = window.getComputedStyle(node);
            const resultNode = node.cloneNode(false);

            nodeIndex++;
            resultNode.setAttribute("class", `${cssPrefix}${nodeIndex}`);
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

            if (nodeStyle.getPropertyValue("display") === "none") {
                resultNode.style = "display: none";
                return resultNode;
            }
            if(["hidden", "collapse"].includes(nodeStyle.getPropertyValue("visibility"))) {
                resultNode.style = "visibility: collapse";
                return resultNode;
            }
            if(nodeStyle.getPropertyValue("opacity") === "0") {
                resultNode.style = "opacity: 0";
                return resultNode;
            }

            const nChildren = node.childNodes.length;
            node.childNodes.forEach((child, idx) => {
                const childResult = getSimplifiedDomRecursive(child, keepWhitespace, cssPrefix);
                if (childResult === null)
                    return;
                if ((idx === 0 || idx === nChildren-1) && nodeStyle.getPropertyValue("display") === "block" && childResult.nodeType === Node.TEXT_NODE && childResult.textContent === " ")
                    return;
                if (idx > 0 && idx < nChildren-1 && childResult.nodeType === Node.TEXT_NODE && childResult.textContent === " ")
                    return;
                resultNode.appendChild(childResult);
            });

            return resultNode;
        }
    }

    return getSimplifiedDomRecursive(document.body, false).outerHTML;

    // Array.from(tempDiv.getElementsByTagName("*")).forEach(
    //     (node) => {
    //         // if node is a text element, remove all extra whitespaces
    //         if(node.nodeType === Node.TEXT_NODE){
    //             node.textContent = node.textContent.replace(/(&nbsp;|\s|\n)+/g, " ")
    //         }
    //         else if (node.nodeType === Node.COMMENT_NODE || ["script", "style", "noscript"].includes(node.tagName.toLowerCase())) {
    //             node.remove();
    //         }
    //         else {
    //             if (window.getComputedStyle(node).display === "none")
    //                 node.style = "display: none";
    //             else
    //                 node.removeAttribute("style");
    //         }
    //
    //         // remove all data attributes
    //         Object.keys(node.dataset).forEach(key => {delete node.dataset[key]});
    //         // remove inner content of svg elements
    //         if(node.tagName === "svg") {
    //             node.innerHTML = "";
    //         }
    //         // remove all classes that do not start with cssPrefix
    //         Array.from(node.classList).forEach(
    //             (className) => !className.startsWith(cssPrefix) && node.classList.remove(className)
    //         );
    //     }
    // );
    // let htmlSkeleton = tempDiv.innerHTML;
    // tempDiv.remove();
    // return htmlSkeleton.trim().replace(/>\s+</g, "><");
}

function getStringTypingSimulationSequence(element, string) {
    const atomicActions = [() => element.focus()];

    for (const char of string) {
        const charData = {
            key: char,
            code: `Key${char.toUpperCase()}`,
            keyCode: char.codePointAt(0),
            charCode: char.codePointAt(0),
            bubbles: true
        };

        atomicActions.push(() => {document.activeElement.dispatchEvent(new KeyboardEvent('keydown', charData))});
        atomicActions.push(() => {document.activeElement.dispatchEvent(new KeyboardEvent('keypress', charData))});
        atomicActions.push(() => {document.activeElement.value += char});
        atomicActions.push(() => {document.activeElement.dispatchEvent(new Event('input', {bubbles: true}))});
        atomicActions.push(() => {document.activeElement.dispatchEvent(new KeyboardEvent('keyup', charData))});
    }
    atomicActions.push(() => {document.activeElement.dispatchEvent(new Event('change', {bubbles: true}))});

    return atomicActions;
}

function pressEnter(element) {
    element.dispatchEvent(new KeyboardEvent(
        'keydown', {key: "Enter", code: "Enter", keyCode: 13, charCode: 13, bubbles: true}
    ))
}

const domActions = [
    {
        name: "click",
        description: "Call the click() method on the element. Avoid using this command to submit forms. Use submit or pressEnter commands instead.",
        atomicActions: (element) => [() => element.click()]
    },
    {
        name: "focus",
        description: "Call the focus() method on the element.",
        atomicActions: (element) => [() => element.focus()]
    },
    {
        name: "scrollIntoView",
        description: "Call the scrollIntoView() method on the element.",
        atomicActions: (element) => [() => element.scrollIntoView()]
    },
    // {
    //     name: "select",
    //     description: "Call the select() method on the element.",
    //     action: (element, _) => element.select()
    // },
    {
        name: "submit",
        description: "Call the submit() method on a form element. This command is also valid when the element is a button or input element inside a form element. In this case, the form element containing the button or input element will be submitted. For search forms, prefer using this command instead of clicking the search button/icon if there is any.",
        atomicActions: element => [() => {
            if(typeof element.submit === "function")
                element.submit();
            else {
                const form = element.querySelector("form");
                if (form)
                    form.submit();
                for (let parent = element.parentElement; parent; parent = parent.parentElement)
                    if (parent.tagName.toLowerCase() === "form") {
                        parent.submit();
                        break;
                    }
            }
        }]
    },
    {
        name: "setValue",
        description: "Set the value attribute of the element to the provided value.",
        action: (element, value) => {
            if (!["input", "textarea", "select"].includes(element.tagName.toLowerCase()))
                throw new Error(`Element is not an input, textarea or select element.`);
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
    {
        name: "clearInput",
        description: "Clear the input value of the element.",
        atomicActions: (element) => [
            () => element.value = "",
            () => element.dispatchEvent(new Event('input', { bubbles: true })),
            () => element.dispatchEvent(new Event('change', { bubbles: true }))
        ]
    },
    {
        name: "typeString",
        description: "Simulate typing the provided string value into the DOM element character-by-character.",
        atomicActions: (element, value) => getStringTypingSimulationSequence(element, value)
    },
    {
        name: "setText",
        description: "Set the textContent of the element to the provided value.",
        atomicActions: (element, value) => [() => element.textContent = value]
    },
    {
        name: "remove",
        description: "Remove the element from DOM.",
        atomicActions: (element) => [() => element.remove()]
    },
    {
        name: "hide",
        description: 'Hide the element by setting style as "display: none".',
        atomicActions: (element) => [() => element.style.display = "none"]
    },
    {
        name: "setStyle",
        description: "Modify the CSS style attribute of the element according to the provided commandParams. If commandParams is an object, set each key-value pair as a style property. If commandParams is a string, set the complete style attribute equal to the provided string.",
        atomicActions: (element, value) => {
            if(typeof value === "object")
                return [() => {for(let attr in value) element.style.setAttribute(attr, value[attr])}]
            return [() => element.style = value]
        }
    },
    {
        name: "setAttribute",
        description: "Set the attribute of the element to the provided value. The commandParams is an array with two elements: the attribute name and the new attribute value. Do not use this command to set the value of input elements. Use setValue instead.",
        atomicActions: (element, [attribute, value]) => [() => element.setAttribute(attribute, value)]
    },
    {
        name: "removeAttribute",
        description: "Remove the attribute from the element. The commandParams is the attribute name.",
        atomicActions: (element, attribute) => [() => element.removeAttribute(attribute)]
    },
    {
        name: "pressEnter",
        description: "Simulate pressing the Enter key on the element. You can use this command to try submit forms if there is no other obvious way to do it.",
        atomicActions: (element) => [() => pressEnter(element)]
    },
    {
        name: "searchForm",
        description: "Search for the provided query in the search form of a webpage. The element for this command is the form's input field. The commandParams is the query string to be searched.",
        atomicActions: (element, query) => [
            () => element.value = "",
            () => element.dispatchEvent(new Event('input', { bubbles: true })),
            () => element.dispatchEvent(new Event('change', { bubbles: true })),
            ...getStringTypingSimulationSequence(element, query),
            () => pressEnter(document.activeElement)
        ]
    }
]

function getPageActionDescriptions() {
    return domActions.map(action => {
        return {
            name: action.name,
            description: action.description
        }
    });
}

function enqueueAction(rootNode, actionQueue, action) {
    const {actionName, actionTargetIndex, actionParams} = action;
    const element = findElementByIndex(rootNode, actionTargetIndex);
    if (!element) {
        const errorMessage = `Element with index ${actionTargetIndex} not found`;
        console.error(errorMessage);
        return errorMessage;
    }

    for (let actionData of domActions){
        if(actionData.name === actionName){
            actionQueue.enqueue(actionData.atomicActions(element, actionParams));
            return;
        }
    }
    console.log(`Action ${actionName} not found`)
}


export {getDocumentSkeleton, enqueueAction, getPageActionDescriptions};