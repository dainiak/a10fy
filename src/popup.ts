import {extensionMessageGoals, ExtensionMessageRequest, voiceRecordingInProgress} from "./helpers/constants";

document.addEventListener("DOMContentLoaded", function () {
    document.body.setAttribute(
        "data-bs-theme",
        window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
    );

    const voiceCommandButton = document.getElementById("voiceCommandButton") as HTMLButtonElement;
    const voiceText = voiceCommandButton.querySelector("span") as HTMLSpanElement;
    const voiceIcon = voiceCommandButton.querySelector("i") as HTMLElement;
    chrome.storage.session.get([voiceRecordingInProgress]).then((result) => {
        if(result[voiceRecordingInProgress] === undefined) {
            chrome.storage.session.set({voiceRecordingInProgress: false}).catch();
        }
        if (result[voiceRecordingInProgress]) {
            voiceIcon.className = "bi bi-mic-fill blinking";
            voiceText.textContent = "Stop recording";
        } else {
            voiceIcon.className = "bi bi-mic";
            voiceText.textContent = "Voice command";
        }
    });

    voiceCommandButton.onclick = () => {
        chrome.storage.session.get([voiceRecordingInProgress]).then((result) => {
            if (result[voiceRecordingInProgress]) {
                chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.voiceCommandStopRecording} as ExtensionMessageRequest).catch();
            } else {
                chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.voiceCommandRecordThenExecute} as ExtensionMessageRequest).catch();
            }
        });
    };

    chrome.storage.session.onChanged.addListener((changes) => {
        if (changes[voiceRecordingInProgress]) {
            voiceIcon.className = changes[voiceRecordingInProgress].newValue ? "bi bi-mic-fill blinking" : "bi bi-mic";
            voiceText.textContent = changes[voiceRecordingInProgress].newValue ? "Stop recording" : "Voice command";
        }
    });

    const textCommandButton = document.getElementById("textCommandButton") as HTMLButtonElement;
    textCommandButton.onclick = async () => {
        await chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.textCommandGetThenExecute} as ExtensionMessageRequest)
    };

    const openSidePanelButton = document.getElementById("openSidePanelButton") as HTMLButtonElement;
    openSidePanelButton.onclick = async function () {
        const currentWindow = await chrome.windows.getCurrent();
        await chrome.sidePanel.open({windowId: currentWindow.id});
    }
});
