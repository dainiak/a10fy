import { extensionActions } from "./helpers/constants";
import { recordAudio, stopRecording } from "./helpers/audioRecording";

const recordingNotificationSound = document.getElementById("startRecordingNotification") as HTMLAudioElement;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (sender.tab)
            return;

        if(request.action === extensionActions.startAudioCapture || request.action === extensionActions.stopAudioCapture) {
            if (request.action === extensionActions.startAudioCapture) {
                recordingNotificationSound.onended = () => {
                    recordingNotificationSound.onended = null;
                    recordAudio().then((data: any) => {
                        sendResponse({audio: data});
                    }).catch(
                        (err) => {
                            sendResponse({error: err});
                        }
                    );
                }
                recordingNotificationSound.play();
                return true;
            }
            else if (request.action === extensionActions.stopAudioCapture) {
                stopRecording() && recordingNotificationSound.play();
            }
        }
        else if (request.action === extensionActions.copyTextToClipboard) {
            navigator.clipboard.writeText(request.text).then(() => {
                sendResponse({message: "Text copied to clipboard"});
            }).catch((err) => {
                sendResponse({error: err});
            });
        } else if (request.action === extensionActions.getTextFromClipboard) {
            navigator.clipboard.readText().then((text) => {
                sendResponse({text: text});
            }).catch((err) => {
                sendResponse({error: err});
            });
        }

    }
);