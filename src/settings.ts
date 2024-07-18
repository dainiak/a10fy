import {storageKeys} from "./helpers/constants";
import {fillModelsTable, setupNewModelButton} from "./helpers/settings/modelsTable";
import {fillPersonasTable, setupNewPersonaButton} from "./helpers/settings/personasTable";

document.body.setAttribute("data-bs-theme", window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',({ matches }) => {
    document.body.setAttribute("data-bs-theme", matches ? "dark" : "light");
});

const allowToUseMicrophone = document.getElementById("allowToUseMicrophone") as HTMLElement;
allowToUseMicrophone.addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
        stream.getTracks().forEach(track => track.readyState === 'live' && track.stop());
    }).catch(err => {
        console.error(err);
    });
});

const apiKeyInput = document.getElementById("mainGoogleApiKey") as HTMLInputElement;
chrome.storage.sync.get([storageKeys.mainGoogleApiKey]).then((data) => {
    const apiKey = data[storageKeys.mainGoogleApiKey];
    if(apiKey)
        apiKeyInput.value = apiKey;
});

apiKeyInput.addEventListener("change", async () => {
    await chrome.storage.sync.set({[storageKeys.mainGoogleApiKey]: apiKeyInput.value});
});

setupNewModelButton();
fillModelsTable().catch();
setupNewPersonaButton();
fillPersonasTable().catch();