import { extensionActions } from "./helpers/constants.js";
import { getDocumentSkeleton, getPageActionDescriptions, enqueueAction } from "./helpers/domManipulation.js";

import getActionQueue from "./helpers/actionQueue.js";


const pageActionQueue = getActionQueue();
setInterval(
    pageActionQueue.executeNext,
    20
);


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(sender.tab)
            return;
        if (request.action === extensionActions.getDocumentInfo) {
            sendResponse({
                html: getDocumentSkeleton(document.body.innerHTML),
                text: document.body.innerText,
                url: document.location.href,
                title: document.title,
                pageActionDescriptions: getPageActionDescriptions()
            });
        }
        else if (request.action === extensionActions.performCommand)
            enqueueAction(
                pageActionQueue,
                {
                    actionName: request.command,
                    actionTargetIndex: request.index,
                    actionParams: request.value
                }
            );
        else if (request.action === extensionActions.getUserQuery) {
            const query = prompt("Enter your query:");
            sendResponse(query);
        }
    }
);