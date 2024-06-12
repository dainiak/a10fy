import { globalActions } from "./helpers/constants.js";
import { getDocumentSkeleton, getPageActionDescriptions, enqueueAction } from "./helpers/domManipulation.js";
import {startRecording, stopRecording} from "./helpers/audioRecording.js";

import getActionQueue from "./helpers/actionQueue.js";


const pageActionQueue = getActionQueue();
setInterval(
    pageActionQueue.executeNext,
    5
);


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(sender.tab)
            return;
        if (request.action === globalActions.getDocumentInfo) {
            sendResponse({
                html: getDocumentSkeleton(document.body.innerHTML),
                text: document.body.innerText,
                url: document.location.href,
                title: document.title,
                pageActionDescriptions: getPageActionDescriptions()
            });
        }
        else if (request.action === globalActions.performCommand)
            enqueueAction(
                document,
                pageActionQueue,
                {
                    actionName: request.command,
                    actionTargetIndex: request.index,
                    actionParams: request.value
                }
            );
        else if (request.action === globalActions.getUserQuery) {
            const query = prompt("Enter your query:");
            sendResponse(query);
        }
        else if (request.action === globalActions.startAudioCapture) {
            startRecording(sendResponse);
        }
        else if (request.action === globalActions.stopAudioCapture) {
            sendResponse(stopRecording());
        }
    }
);