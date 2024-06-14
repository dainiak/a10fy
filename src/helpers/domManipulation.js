import {cssPrefix, cssPrefixFallbackSymbol} from "./constants";

const elementMap = new Map();

function findElementByIndex(index) {
    if (index === null || index === undefined)
        return null;

    index = Number.parseInt(index);

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

function getDocumentSkeleton(options) {
    const wrapTextNodes = options?.wrapTextNodes || false;

    elementMap.clear();
    let nodeIndex = 0;

    function getSimplifiedDomRecursive(node, keepWhitespace) {
        keepWhitespace ||= false;
        if (node.nodeType === Node.TEXT_NODE) {
            const text = keepWhitespace ? node.textContent : node.textContent.replace(/(&nbsp;|\s|\n)+/g, " ");
            if (wrapTextNodes && node.parentNode?.children.length > 1) {
                const wrapper = document.createElement("span");
                wrapper.textContent = text;
                wrapper.setAttribute("class", `${cssPrefix}${nodeIndex}`);
                ++nodeIndex;
                node[cssPrefixFallbackSymbol] = nodeIndex;
                return wrapper;
            }
            return document.createTextNode(text);
        } else if (node.nodeType === Node.COMMENT_NODE || ["script", "style", "noscript"].includes(node.tagName.toLowerCase())) {
            return null;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const nodeStyle = window.getComputedStyle(node);
            const resultNode = node.cloneNode(false);

            ++nodeIndex;
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

            if (nodeStyle.getPropertyValue("display") === "none")
                resultNode.style = "display: none";
            if (["hidden", "collapse"].includes(nodeStyle.getPropertyValue("visibility")))
                resultNode.style = "visibility: hidden";
            if (nodeStyle.getPropertyValue("opacity") === "0")
                resultNode.style = "opacity: 0";

            const nChildren = node.childNodes.length;
            node.childNodes.forEach((child, idx) => {
                const childResult = getSimplifiedDomRecursive(child, keepWhitespace);
                if (childResult === null)
                    return;
                if ((idx === 0 || idx === nChildren - 1) && nodeStyle.getPropertyValue("display") === "block" && childResult.nodeType === Node.TEXT_NODE && childResult.textContent === " ")
                    return;
                if (idx > 0 && idx < nChildren - 1 && childResult.nodeType === Node.TEXT_NODE && childResult.textContent === " ")
                    return;
                resultNode.appendChild(childResult);
            });

            return resultNode;
        }
    }

    return getSimplifiedDomRecursive(document.body, false).outerHTML;
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

        atomicActions.push(() => {
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', charData));
            document.activeElement.dispatchEvent(new KeyboardEvent('keypress', charData));
            document.activeElement.value += char;
            document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
            document.activeElement.dispatchEvent(new KeyboardEvent('keyup', charData));
            document.activeElement.dispatchEvent(new Event('change', {bubbles: true}));
        });
    }

    return atomicActions;
}

function pressEnter(element) {
    element.dispatchEvent(new KeyboardEvent(
        'keydown', {key: "Enter", code: "Enter", keyCode: 13, charCode: 13, bubbles: true}
    ))
}

const llmPageActions = {
    click: {
        description: "Call the click() method on a DOM element. Avoid using this command to submit forms. Use submit or pressEnter commands instead.",
        atomicActions: (element) => [() => element.click()]
    },
    focus: {
        description: "Call the focus() method on a DOM element.",
        atomicActions: (element) => [() => element.focus()]
    },
    scrollIntoView: {
        description: "Call the scrollIntoView() method on a DOM element.",
        atomicActions: (element) => [() => element.scrollIntoView()]
    },
    submit: {
        description: "Call the submit() method on a form DOM element. This command is also valid when the element is a button or input element inside a form element. In this case, the form element containing the button or input element will be submitted. For search forms, prefer using this command instead of clicking the search button/icon if there is any.",
        atomicActions: element => [() => {
            if (typeof element.submit === "function")
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
    setValue: {
        description: "Set the 'value' attribute of a DOM element to a given string (actionParams is a string).",
        action: (element, value) => [() => {
            if (!["input", "textarea", "select"].includes(element.tagName.toLowerCase()))
                throw new Error(`Element is not an input, textarea or select element.`);
            element.value = value;
            element.dispatchEvent(new Event('input', {bubbles: true}));
            element.dispatchEvent(new Event('change', {bubbles: true}));
        }]
    },
    clearInput: {
        description: "Clear the input value of a DOM element.",
        atomicActions: (element) => [() => {
            element.value = "";
            element.dispatchEvent(new Event('input', {bubbles: true}));
            element.dispatchEvent(new Event('change', {bubbles: true}));
        }]
    },
    typeString: {
        description: "Simulate typing the provided string value into the DOM element character-by-character (actionParams is a string).",
        atomicActions: (element, value) => getStringTypingSimulationSequence(element, value)
    },
    setText: {
        description: "Set the textContent of the element to the provided value (actionParams is a string).",
        atomicActions: (element, value) => [() => element.textContent = value]
    },
    remove: {
        description: "Remove the element from DOM.",
        atomicActions: (element) => [() => element.remove()]
    },
    hide: {
        description: 'Hide the element by setting style as "display: none".',
        atomicActions: (element) => [() => element.style.display = "none"]
    },
    setStyle: {
        description: "Modify the CSS style attribute of the element according to the provided actionParams. If actionParams is an object, set each key-value pair as a style property. If actionParams is a string, set the complete style attribute equal to the provided string.",
        atomicActions: (element, value) => {
            if (typeof value === "object")
                return [() => {
                    for (let attr in value) element.style.setAttribute(attr, value[attr])
                }]
            return [() => element.style = value]
        }
    },
    setAttribute: {
        description: "Set the attribute of the element to the provided value. The actionParams is an object whose key-value pairs correspond to the attribute names and values to be set. Do not use this command to set the 'value' of HTML input elements. Use setValue instead.",
        atomicActions: (element, value) => [() => {
            for (let attr in value) element.style.setAttribute(attr, value[attr])
        }]
    },
    removeAttribute: {
        description: "Remove the attribute from the element. The actionParams is the attribute name.",
        atomicActions: (element, attribute) => [() => element.removeAttribute(attribute)]
    },
    pressEnter: {
        description: "Simulate pressing the Enter key on the element. You can use this command to try submit forms if there is no other obvious way to do it.",
        atomicActions: (element) => [() => pressEnter(element)]
    },
    searchForm: {
        description: "Search for the provided query in the search form of a webpage. The element for this command is the form's input field. The actionParams is the query string to be searched.",
        atomicActions: (element, query) => [
            () => element.value = "",
            () => {
                element.dispatchEvent(new Event('input', {bubbles: true}));
                element.dispatchEvent(new Event('change', {bubbles: true}));
            },
            ...getStringTypingSimulationSequence(element, query),
            () => pressEnter(document.activeElement)
        ]
    },
    navigate: {
        description: "Navigate to the provided URL. The actionParams is a string which is either the URL to navigate to, or \"back\" to navigate to the previous page in the browser history, or \"forward\" to navigate to the next page in the browser history, or \"reload\" to reload the current page.",
        atomicActions: (_, url) => {
            if (url === "back")
                return [() => window.history.back()];
            if (url === "forward")
                return [() => window.history.forward()];
            if (url === "reload")
                return [() => window.location.reload()];
            return [() => window.location = url];
        }
    }
}


function enqueueAction(actionQueue, action) {
    const {actionName, elementIndex, actionParams} = action;
    const element = findElementByIndex(elementIndex);

    if (llmPageActions.hasOwnProperty(actionName)) {
        actionQueue.enqueue(llmPageActions[actionName].atomicActions(element, actionParams));
    }
    else {
        console.log(`Action ${actionName} not found`)
    }
}


export {getDocumentSkeleton, enqueueAction, findElementByIndex, llmPageActions};