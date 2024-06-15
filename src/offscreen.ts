import { extensionActions } from "./helpers/constants";
import { startRecording, stopRecording } from "./helpers/audioRecording";

const recordingNotificationSound = document.getElementById("startRecordingNotification") as HTMLElement;
let notificationAudioEndedHandler: CallableFunction | null = null;

recordingNotificationSound.addEventListener("ended", () => {
    notificationAudioEndedHandler && ((responseSender) => startRecording(responseSender))(notificationAudioEndedHandler);
    notificationAudioEndedHandler = null;
});


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (sender.tab)
            return;

        if(request.action === extensionActions.startAudioCapture || request.action === extensionActions.stopAudioCapture) {
            const recordingNotificationSound = document.getElementById("startRecordingNotification") as HTMLAudioElement;

            if (request.action === extensionActions.startAudioCapture) {
                notificationAudioEndedHandler = sendResponse;
                recordingNotificationSound?.play();
            }
            else if (request.action === extensionActions.stopAudioCapture) {
                stopRecording((data: any) => chrome.runtime.sendMessage({action: extensionActions.processUserAudioQuery, audio: data}));
                notificationAudioEndedHandler = null;
                recordingNotificationSound?.play();
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