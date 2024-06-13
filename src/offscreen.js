import { extensionActions } from "./helpers/constants";
import { startRecording, stopRecording } from "./helpers/audioRecording";

const recordingNotificationSound = document.getElementById("startRecordingNotification");
let notificationAudioEndedHandler = null;

recordingNotificationSound.addEventListener("ended", () => {
    notificationAudioEndedHandler && ((responseSender) => startRecording(responseSender))(notificationAudioEndedHandler);
    notificationAudioEndedHandler = null;
});


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (sender.tab)
            return;

        const recordingNotificationSound = document.getElementById("startRecordingNotification");

        if (request.action === extensionActions.startAudioCapture) {
            notificationAudioEndedHandler = sendResponse;
            recordingNotificationSound.play();
        }
        else if (request.action === extensionActions.stopAudioCapture) {
            stopRecording((data) => chrome.runtime.sendMessage({action: extensionActions.processUserAudioQuery, audio: data}));
            notificationAudioEndedHandler = null;
            recordingNotificationSound.play();
        }
    }
);