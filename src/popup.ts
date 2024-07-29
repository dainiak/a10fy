import {
    extensionMessageGoals,
    ExtensionMessageRequest,
    storageKeys
} from "./helpers/constants";

document.addEventListener("DOMContentLoaded", function () {
    document.body.setAttribute(
        "data-bs-theme",
        window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
    );

    const voiceCommandButton = document.getElementById("voiceCommandButton") as HTMLButtonElement;
    const voiceText = voiceCommandButton.querySelector("span") as HTMLSpanElement;
    const voiceIcon = voiceCommandButton.querySelector("i") as HTMLElement;
    chrome.storage.session.get(storageKeys.voiceRecordingInProgress).then((result) => {
        if(result[storageKeys.voiceRecordingInProgress] === undefined) {
            chrome.storage.session.set({[storageKeys.voiceRecordingInProgress]: false}).catch();
        }
        if (result[storageKeys.voiceRecordingInProgress]) {
            voiceIcon.className = "bi bi-mic-fill blinking";
            voiceText.textContent = "Stop recording";
        } else {
            voiceIcon.className = "bi bi-mic";
            voiceText.textContent = "Voice command";
        }
    });

    voiceCommandButton.onclick = () => {
        chrome.storage.session.get(storageKeys.voiceRecordingInProgress).then((result) => {
            if (result[storageKeys.voiceRecordingInProgress]) {
                chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.voiceCommandStopRecording} as ExtensionMessageRequest).catch();
            } else {
                chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.voiceCommandRecordThenExecute} as ExtensionMessageRequest).catch();
            }
        });
    };

    chrome.storage.session.onChanged.addListener((changes) => {
        if (changes[storageKeys.voiceRecordingInProgress]) {
            voiceIcon.className = changes[storageKeys.voiceRecordingInProgress].newValue ? "bi bi-mic-fill blinking" : "bi bi-mic";
            voiceText.textContent = changes[storageKeys.voiceRecordingInProgress].newValue ? "Stop recording" : "Voice command";
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

    let snapshotJustTaken = false;
    const pageSnapshotButton = document.getElementById("takePageSnapshotButton") as HTMLButtonElement;
    pageSnapshotButton.onclick = async function () {
        if(snapshotJustTaken)
            return;
        await chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.takeCurrentPageSnapshot} as ExtensionMessageRequest)
    }

    const snapshotIcon = pageSnapshotButton.querySelector("i") as HTMLElement;
    const snapshotText = pageSnapshotButton.querySelector("span") as HTMLSpanElement;
    chrome.runtime.onMessage.addListener((request: ExtensionMessageRequest) => {
        if (request.messageGoal === extensionMessageGoals.pageSnapshotTaken) {
            snapshotJustTaken = true;
            snapshotIcon.className = "bi bi-check";
            snapshotText.textContent = "Snapshot taken";
            setTimeout(() => {
                snapshotJustTaken = false;
                snapshotIcon.className = "bi bi-camera";
                snapshotText.textContent = "Page snapshot";
            }, 2000);
        }
        return undefined;
    });
});
