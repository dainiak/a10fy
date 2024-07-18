import {storageKeys} from "./helpers/constants";
import {fillModelsTable, setupAssistantModelSettings, setupNewModelButton} from "./helpers/settings/modelsTable";
import {fillPersonasTable, setupNewPersonaButton} from "./helpers/settings/personasTable";
import {getFromStorage, setToStorage} from "./helpers/storageHandling";

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

async function setupDefaultApiKey() {
    const apiKeyInput = document.getElementById("mainGoogleApiKey") as HTMLInputElement;

    const apiKey = await getFromStorage(storageKeys.mainGoogleApiKey);
    if(apiKey)
        apiKeyInput.value = apiKey;

    apiKeyInput.addEventListener("change", async () => await setToStorage(storageKeys.mainGoogleApiKey, apiKeyInput.value));
}



setupDefaultApiKey().catch();
setupAssistantModelSettings().catch();
setupNewModelButton();
fillModelsTable().catch();
setupNewPersonaButton();
fillPersonasTable().catch();