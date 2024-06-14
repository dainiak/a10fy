import {extensionActions} from "./helpers/constants";
import {getDocumentSkeleton, enqueueAction, findElementByIndex} from "./helpers/domManipulation";

import ActionQueue from "./helpers/actionQueue";


const pageActionQueue = new ActionQueue();
setInterval(
    pageActionQueue.executeNext,
    20
);


chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (sender.tab)
            return;
        if (request.action === extensionActions.getDocumentInfo) {
            sendResponse({
                html: getDocumentSkeleton(document.body.innerHTML),
                text: document.body.innerText,
                url: document.location.href,
                title: document.title
            });
        } else if (request.action === extensionActions.executePageAction)
            enqueueAction(
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

            const properties = {};
            for (const propertyName of request.propertyNames)
                switch(propertyName) {
                    case "style": properties.style = element.style; break;
                    case "computedStyle": properties.computedStyle = window.getComputedStyle(element); break;
                    case "id": properties.id = element.id; break;
                    case "innerHTML": properties.innerHTML = element.innerHTML; break;
                    case "outerHTML": properties.outerHTML = element.outerHTML; break;
                    case "innerText": properties.innerText = element.innerText; break;
                    case "textContent": properties.textContent = element.textContent; break;
                    default: properties[propertyName] = element.getAttribute(propertyName); break;
                }

            sendResponse(properties);
        }
    }
);