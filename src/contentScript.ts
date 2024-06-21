import {extensionActions, ElementPropertiesResult} from "./helpers/constants";
import {getDocumentSkeleton, findElementByIndex} from "./helpers/domManipulation";
import {enqueuePageAction} from "./helpers/llmPageActions";

import ActionQueue from "./helpers/actionQueue";


const pageActionQueue = new ActionQueue();
setInterval(
    () => pageActionQueue.executeNext(),
    20
);


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
            const element = findElementByIndex(request.elementIndex);
            if (!element) {
                sendResponse({error: "Element not found."});
                return;
            }

            const properties: ElementPropertiesResult = {};
            for (const propertyName of request.propertyNames)
                switch(propertyName) {
                    case "value": properties.value = (element as HTMLInputElement).value; break;
                    case "style": properties.style = (element as HTMLElement).style; break;
                    case "computedStyle": properties.computedStyle = window.getComputedStyle(element as HTMLElement); break;
                    case "id": properties.id = (element as HTMLElement).id; break;
                    case "innerHTML": properties.innerHTML = (element as HTMLElement).innerHTML; break;
                    case "outerHTML": properties.outerHTML = (element as HTMLElement).outerHTML; break;
                    case "innerText": properties.innerText = (element as HTMLElement).innerText; break;
                    case "textContent": properties.textContent = element.textContent; break;
                    default: properties[propertyName] = (element as HTMLElement).getAttribute(propertyName); break;
                }

            sendResponse(properties);
        }
    }
);