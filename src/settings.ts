import {storageKeys} from "./helpers/constants";
import * as Bootstrap from "bootstrap";

document.body.setAttribute("data-bs-theme", window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");


const allowToUseMicrophoneLink = document.getElementById("allowToUseMicrophone") as HTMLElement;
allowToUseMicrophoneLink.addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
        stream.getTracks().forEach(track => track.readyState === 'live' && track.stop());
    }).catch(err => {
        console.error(err);
    });
});

const apiKeyInput = document.getElementById("googleApiKey") as HTMLInputElement;
// chrome.storage.sync.get([storageKeys.googleApiKey]).then(data => apiKeyInput.value = data[storageKeys.googleApiKey]);
//
// apiKeyInput.addEventListener("change", async (event) => {
//     await chrome.storage.sync.set({[storageKeys.googleApiKey]: apiKeyInput.value});
// });

Bootstrap.Modal.getOrCreateInstance(document.getElementById("editModelModal") as HTMLElement).show();