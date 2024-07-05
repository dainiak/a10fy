import {extensionActions, ElementPropertiesResult} from "./helpers/constants";
import {getDocumentSkeleton, findElementByIndex} from "./helpers/domManipulation";
import {enqueuePageAction} from "./helpers/llmPageActions";

import ActionQueue from "./helpers/actionQueue";

let lastContextMenuEvent: MouseEvent | null = null;

const pageActionQueue = new ActionQueue();
setInterval(
    () => pageActionQueue.executeNext(),
    20
);


function getDomElementProperties(element: Node, propertyNames: Array<string>){
    const properties: ElementPropertiesResult = {};
    for (const propertyName of propertyNames)
        switch(propertyName) {
            case "value": if(element instanceof HTMLInputElement) properties.value = element.value; break;
            case "style": if(element instanceof HTMLElement) properties.style = element.style; break;
            case "computedStyle": if(element instanceof HTMLElement) properties.computedStyle = window.getComputedStyle(element); break;
            case "id": if(element instanceof HTMLElement) properties.id = element.id; break;
            case "innerHTML": if(element instanceof HTMLElement) properties.innerHTML = element.innerHTML; break;
            case "outerHTML": if(element instanceof HTMLElement) properties.outerHTML = element.outerHTML; break;
            case "innerText": if(element instanceof HTMLElement) properties.innerText = element.innerText; break;
            case "textContent": properties.textContent = element.textContent; break;
            case "boundingRect":
                if(element instanceof HTMLElement)
                    properties.boundingRect = element.getBoundingClientRect();
                else {
                    while (element && !(element instanceof HTMLElement) && element.parentNode) element = element.parentNode;
                    if (element instanceof HTMLElement) properties.boundingRect = element.getBoundingClientRect();
                }
                break;
            default: if(element instanceof HTMLElement) properties[propertyName] = element.getAttribute(propertyName); break;
        }

    return properties;
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (sender.tab)
            return;
        if (request.action === extensionActions.getDocumentInfo) {
            sendResponse({
                html: getDocumentSkeleton(),
                text: document.body.innerText,
                url: document.location.href,
                title: document.title
            });
        } else if (request.action === extensionActions.executePageAction)
            enqueuePageAction(
                pageActionQueue,
                {
                    actionName: request.actionName,
                    elementIndex: request.elementIndex,
                    actionParams: request.actionParams
                }
            );
        else if (request.action === extensionActions.getUserQuery) {
            const query = prompt("Enter your query:");
            sendResponse(query);
        }
        else if (request.action === extensionActions.getDomElementProperties) {
            const element = findElementByIndex(request.elementIndex) as HTMLElement;
            if (!element) {
                sendResponse({error: "Element not found."});
                return;
            }
            sendResponse(getDomElementProperties(element, request.propertyNames));
        }
    }
);


document.addEventListener("contextmenu", (event) => {
    lastContextMenuEvent = event;
    const element = event.target as HTMLElement;
    const properties = getDomElementProperties(element, ["boundingRect"]);
    chrome.runtime.sendMessage({
        action: extensionActions.registerContextMenuEvent,
        boundingRect: properties.boundingRect,
        viewportRect: {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        }
    });
});
