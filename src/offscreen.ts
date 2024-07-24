import {
    extensionMessageGoals,
    ExtensionMessageRequest,
    ExtensionMessageImageModificationRequest,
    ImageModificationResult, AudioRecordingResult, RunInSandboxRequest, SandboxedTaskResult
} from "./helpers/constants";
import { recordAudio, stopRecording } from "./helpers/audioRecording";
import {send} from "vite";

const recordingNotificationSound = document.getElementById("startRecordingNotification") as HTMLAudioElement;

chrome.runtime.onMessage.addListener((request: ExtensionMessageRequest, sender, sendResponse) => {
    console.log(request, sender);
    if (sender.tab)
        return;

    if([extensionMessageGoals.startAudioCapture, extensionMessageGoals.stopAudioCapture].includes(request.messageGoal)) {
        if (request.messageGoal === extensionMessageGoals.startAudioCapture) {
            recordingNotificationSound.onended = () => {
                recordingNotificationSound.onended = null;
                recordAudio().then((data: any) => {
                    sendResponse({audio: data} as AudioRecordingResult);
                }).catch(
                    (err) => {
                        sendResponse({error: err} as AudioRecordingResult);
                    }
                );
            }
            recordingNotificationSound.play();
            return true;
        }
        else if (request.messageGoal === extensionMessageGoals.stopAudioCapture) {
            stopRecording() && recordingNotificationSound.play();
        }
    // }
    // else if (request.action === extensionActions.copyTextToClipboard) {
    //     navigator.clipboard.writeText(request.text).then(() => {
    //         sendResponse({message: "Text copied to clipboard"});
    //     }).catch((err) => {
    //         sendResponse({error: err});
    //     });
    // } else if (request.action === extensionActions.getTextFromClipboard) {
    //     navigator.clipboard.readText().then((text) => {
    //         sendResponse({text: text});
    //     }).catch((err) => {
    //         sendResponse({error: err});
    //     });
    } else if (request.messageGoal === extensionMessageGoals.modifyImage) {
        const modificationRequest = request as ExtensionMessageImageModificationRequest;
        const crop = modificationRequest.parameters;
        const canvas = document.createElement("canvas");
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            const scaleX = img.height / modificationRequest.parameters.viewportHeight;
            const scaleY = img.width / modificationRequest.parameters.viewportWidth;
            ctx?.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width, crop.height);
            const imageData = ctx?.getImageData(0, 0, img.width, img.height);
            if (imageData) {
                const outputParams = modificationRequest.output;
                sendResponse({image: canvas.toDataURL(`image/${outputParams.format}`, outputParams.quality)} as ImageModificationResult);
            }
            else {
                sendResponse({error: "Failed to crop image"} as ImageModificationResult);
            }
        }
        img.onerror = () => sendResponse({error: "Failed to load image"} as ImageModificationResult);
        img.src = modificationRequest.image;
        return true;
    } else if (request.messageGoal === extensionMessageGoals.runInSandbox && (request as RunInSandboxRequest).executor === "offscreen") {
        if (!document.getElementById("sandbox")) {
            const newSandbox = document.createElement("iframe");
            newSandbox.id = "sandbox";
            newSandbox.style.display = "none";
            newSandbox.src = "sandbox.html";
            document.body.appendChild(newSandbox);
        }

        const sandbox = document.getElementById("sandbox") as HTMLIFrameElement;
        sandbox.addEventListener("load", () => {
            const requestId = (request as RunInSandboxRequest).requestId;

            const resultMessageHandler = (event: MessageEvent) => {
                if(event.data.action !== extensionMessageGoals.sandboxedTaskResultsUpdate || event.data.requestId !== requestId)
                    return;
                const result = event.data as SandboxedTaskResult;
                if (result.isFinal) {
                    window.removeEventListener("message", resultMessageHandler);
                    sendResponse(result);
                }
            };
            window.addEventListener("message", resultMessageHandler);

            sandbox.contentWindow?.postMessage(request as RunInSandboxRequest, "*");
        });

        return true;
    }
});