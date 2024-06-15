import {storageKeys} from "./helpers/constants";

const allowToUseMicrophoneLink = document.getElementById("allowToUseMicrophone") as HTMLElement;
allowToUseMicrophoneLink.addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
        stream.getTracks().forEach(track => track.readyState === 'live' && track.stop());
    }).catch(err => {
        console.error(err);
    });
});

const apiKeyInput = document.getElementById("googleApiKey") as HTMLInputElement;
chrome.storage.sync.get([storageKeys.googleApiKey]).then(data => apiKeyInput.value = data[storageKeys.googleApiKey]);

apiKeyInput.addEventListener("change", async (event) => {
    await chrome.storage.sync.set({[storageKeys.googleApiKey]: apiKeyInput.value});
});