(() => {
    const cssPrefix = "a10fy_";
    function injectCssClasses() {
        Array.from(document.getElementsByTagName("*")).forEach(
            (element, idx) => {
                element.classList.add(cssPrefix + idx);
            }
        );
    }

    function performAction(action, index, value) {
        const element = document.querySelector(`.${cssPrefix}${index}`);
        if (!element)
            return;
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
            case "remove":
                element.remove();
                break;
            case "hide":
                element.style.display = "none";
                break;
        }
    }

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if (request.action) {
                performAction(action.action, action.index, action.value);
            }
            else if (request.actions) {
                request.actions.forEach(
                    (action) => {
                        performAction(action.action, action.index, action.value);
                    }
                );
            }
        }
    );

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
                else if (node.nodeType === Node.COMMENT_NODE){
                    node.remove();
                }
                else if (node.tagName.toLowerCase() === "script" && node.innerHTML && node.innerHTML.trim()){
                    node.innerHTML = "/* some script here */";
                }
                else if (node.tagName.toLowerCase() === "style" && node.innerHTML && node.innerHTML.trim()){
                    node.innerHTML = "/* some style here */";
                }
                else if (node.tagName.toLowerCase() === "noscript"){
                    node.remove();
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

    window.addEventListener("load", () => {
        injectCssClasses();

        chrome.runtime.sendMessage({
            documentHTML: getHtmlSkeleton(document.body.innerHTML),
            documentText: document.body.innerText,
            documentURL: document.location.href,
            documentTitle: document.title,
        });
    });

    // window.navigation.addEventListener("navigate", () => {
    //     console.log("page changed");
    // });
})();