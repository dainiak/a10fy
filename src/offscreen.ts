import {
    extensionActions,
    ExtensionMessageRequest,
    ExtensionMessageImageModificationRequest,
    ImageModificationResult, AudioRecordingResult
} from "./helpers/constants";
import { recordAudio, stopRecording } from "./helpers/audioRecording";

const recordingNotificationSound = document.getElementById("startRecordingNotification") as HTMLAudioElement;

chrome.runtime.onMessage.addListener(
    function(request: ExtensionMessageRequest, sender, sendResponse) {
        if (sender.tab)
            return;

        if([extensionActions.startAudioCapture, extensionActions.stopAudioCapture].includes(request.action)) {
            if (request.action === extensionActions.startAudioCapture) {
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
            else if (request.action === extensionActions.stopAudioCapture) {
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
        } else if (request.action === extensionActions.modifyImage) {
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
        }
    }
);