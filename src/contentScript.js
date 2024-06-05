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

    function performAction(action, index, value) {
        const element = findElementByIndex(index);
        if (!element) {
            console.error(`Element with index ${index} not found`);
            return;
        }

        switch (action) {
            case "click":
                element.click();
                break;
            case "focus":
                element.focus();
                break;
            case "scrollIntoView":
                element.scrollIntoView();
                break;
            case "select":
                element.select();
                break;
            case "submit":
                element.submit();
                break;
            case "setChecked":
                element.checked = true;
                break;
            case "setUnchecked":
                element.checked = false;
                break;
            case "setValue":
                element.value = value;
                break;
            case "setText":
                element.textContent = value;
                break;
            case "remove":
                element.remove();
                break;
            case "hide":
                element.style.display = "none";
                break;
        }
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
            if (request.action === "getDocumentInfo")
                sendResponse({
                    html: getHtmlSkeleton(document.body.innerHTML),
                    text: document.body.innerText,
                    url: document.location.href,
                    title: document.title,
                });
            if (request.action === "performAction")
                performAction(request.action, request.index, request.value);
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

    // window.navigation.addEventListener("navigate", () => {
    //     console.log("page changed");
    // });
})();