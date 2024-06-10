(() => {
    const cssPrefix = "a10fy_";
    const cssPrefixFallbackSymbol = Symbol(cssPrefix);

    function injectCssClasses() {
        Array.from(document.getElementsByTagName("*")).forEach(
            (element, idx) => {
                element.classList.add(cssPrefix + idx);
                element[cssPrefixFallbackSymbol] = idx;
            }
        );
    }

    function findElementByIndex(index) {
        let element = document.querySelector(`.${cssPrefix}${index}`);
        if(element)
            return element;
        for (let element of document.getElementsByTagName("*"))
            if (element[cssPrefixFallbackSymbol] === index)
                return element
    }

    function typeString(element, s) {
        element.focus();

        for (const char of s) {
            const charData = {
                key: char,
                code: `Key${char.toUpperCase()}`,
                keyCode: char.codePointAt(0),
                charCode: char.codePointAt(0),
                bubbles: true
            };

            element.dispatchEvent(new KeyboardEvent('keydown', charData));
            element.dispatchEvent(new KeyboardEvent('keypress', charData));

            element.value += char;
            element.dispatchEvent(new Event('input', {
                inputType: 'insertText',
                cancelable: false,
                data: char,
                bubbles: true
            }));

            element.dispatchEvent(new KeyboardEvent('keyup', charData));
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const domActions = [
        {
            name: "click",
            description: "Call the click() method on the element.",
            action: (element, _) => element.click()
        },
        {
            name: "focus",
            description: "Call the focus() method on the element.",
            action: (element, _) => element.focus()
        },
        {
            name: "scrollIntoView",
            description: "Call the scrollIntoView() method on the element.",
            action: (element, _) => element.scrollIntoView()
        },
        // {
        //     name: "select",
        //     description: "Call the select() method on the element.",
        //     action: (element, _) => element.select()
        // },
        {
            name: "submit",
            description: "Call the submit() method on the element. If the element is a form element, submit the form.",
            action: (element, _) => {
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
            }
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
            name: "typeString",
            description: "Simulate typing the provided string value into the element.",
            action: (element, value) => typeString(element, value)
        },
        {
            name: "setText",
            description: "Set the textContent of the element to the provided value.",
            action: (element, value) => element.textContent = value
        },
        {
            name: "remove",
            description: "Remove the element from DOM.",
            action: (element, _) => element.remove()
        },
        {
            name: "hide",
            description: 'Hide the element by setting style as "display: none".',
            action: (element, _) => element.style.display = "none"
        }
    ]

    function performAction(actionName, actionTargetIndex, actionParams) {
        const element = findElementByIndex(actionTargetIndex);
        if (!element) {
            const errorMessage = `Element with index ${actionTargetIndex} not found`;
            console.error(errorMessage);
            return errorMessage;
        }

        for (let actionData of domActions){
            if(actionData.name === actionName){
                actionData.action(element, actionParams);
                return;
            }
        }
        console.log(`Action ${actionName} not found`)
    }

    function getHtmlSkeleton(htmlString) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString;
        Array.from(tempDiv.getElementsByTagName("*")).forEach(
            (node) => {
                // if node is a text element, remove all leading and trailing white spaces
                if(node.nodeType === Node.TEXT_NODE){
                    if(!node.previousSibling)
                        node.textContent = node.textContent.replace(/^(&nbsp;|\s)*/, "")
                    if(!node.nextSibling)
                        node.textContent = node.textContent.replace(/(&nbsp;|\s)*$/, "")

                    node.textContent = node.textContent.replace(/(&nbsp;|\s)+/g, " ")
                    console.log(node.textContent);
                }
                else if (node.nodeType === Node.COMMENT_NODE || ["script", "style", "noscript"].includes(node.tagName.toLowerCase())) {
                    node.remove();
                }
                else {
                    if (window.getComputedStyle(node).display === "none")
                        node.style = "display: none";
                    else
                        node.removeAttribute("style");
                }

                // remove all data attributes
                Object.keys(node.dataset).forEach(key => {delete node.dataset[key]});
                // remove inner content of svg elements
                if(node.tagName === "svg") {
                    node.innerHTML = "";
                }
                // remove all classes that do not start with cssPrefix
                Array.from(node.classList).forEach(
                    (className) => !className.startsWith(cssPrefix) && node.classList.remove(className)
                );
            }
        );
        let htmlSkeleton = tempDiv.innerHTML;
        tempDiv.remove();
        return htmlSkeleton.trim().replace(/>\s+</g, "><");
    }

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(sender.tab)
                return;
            if (request.action === "getDocumentInfo") {
                injectCssClasses();
                sendResponse({
                    html: getHtmlSkeleton(document.body.innerHTML),
                    text: document.body.innerText,
                    url: document.location.href,
                    title: document.title,
                });
            }
            else if (request.action === "performCommand")
                performAction(request.command, request.index, request.value);
            else if (request.action === "getUserQuery") {
                const query = prompt("Enter your query:");
                sendResponse(query);
            }
        }
    );

    // window.addEventListener("load", () => {
    //     injectCssClasses();
    //
    //     chrome.runtime.sendMessage({
    //         document: {
    //             html: getHtmlSkeleton(document.body.innerHTML),
    //             text: document.body.innerText,
    //             url: document.location.href,
    //             title: document.title,
    //         }
    //     });
    // });

    // window.addEventListener("load", () => {
    //     injectCssClasses();
    // });

    // window.navigation.addEventListener("navigate", () => {
    //     console.log("page changed");
    // });
})();