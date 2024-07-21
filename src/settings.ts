import {storageKeys} from "./helpers/constants";
import {
    fillModelsTable,
    setupAssistantModelSettings,
    setupEmbeddingModelSettings,
    setupNewModelButton
} from "./helpers/settings/modelsSettings";
import {fillPersonasTable, setupNewPersonaButton} from "./helpers/settings/personasSettings";
import {getFromStorage, setToStorage} from "./helpers/storageHandling";
import {fillPlayersTable, setupNewPlayerButton} from "./helpers/settings/playersSettings";
import * as Bootstrap from "bootstrap";
import {fillCustomActionsTable, setupNewCustomActionButton} from "./helpers/settings/actionsSettings";

const quickSetupTab = Bootstrap.Tab.getOrCreateInstance(document.getElementById("setupTab") as HTMLElement);

document.querySelectorAll("a.open-quick-setup").forEach(element => element.addEventListener("click", () => quickSetupTab.show()));

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
setupEmbeddingModelSettings().catch();
setupNewModelButton();
fillModelsTable().catch();
setupNewPersonaButton();
fillPersonasTable().catch();
setupNewPlayerButton();
fillPlayersTable().catch();
setupNewCustomActionButton();
fillCustomActionsTable().catch()