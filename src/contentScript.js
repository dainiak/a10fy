import {globalActions} from "./helpers/constants.js";
import {getHtmlSkeleton, injectCssClasses, getPageActionDescriptions, enqueueAction} from "./helpers/domManipulation.js";

import getActionQueue from "./helpers/actionQueue.js";


const audioBuffer = [];
let audioRecorder = null;


const pageActionQueue = getActionQueue();
setInterval(
    pageActionQueue.executeNext,
    50
);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(sender.tab)
            return;
        if (request.action === "getDocumentInfo") {
            injectCssClasses(document);
            sendResponse({
                html: getHtmlSkeleton(document.body.innerHTML),
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
            if (!navigator.mediaDevices) {
                sendResponse({error: "Media devices not supported"});
            }
            else {
                navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                    audioRecorder = new MediaRecorder(stream);
                    audioRecorder.ondataavailable = (e) => {
                        audioBuffer.push(e.data);
                    };

                    audioRecorder.start();
                    //TODO: remove this automatic stop
                    setTimeout(audioRecorder.stop, 3000);
                })
                .catch((err) => {
                    console.error(`The following error occurred: ${err}`);
                    sendResponse({error: err});
                });
            }
        }
        else if (request.action === globalActions.stopAudioCapture) {
            if (audioRecorder) {
                audioRecorder.stop();
                sendResponse({audio: URL.createObjectURL(new Blob(audioBuffer, { type: "audio/ogg; codecs=opus" }))});
                audioBuffer.length = 0;
            }
            else {
                sendResponse({error: "No audio recording in progress"});
            }
        }
    }
);