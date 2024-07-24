import {storageKeys} from "./helpers/constants";
import {
    fillModelsTable,
    setupAssistantModelSettings,
    setupEmbeddingModelSettings,
    setupNewModelButton
} from "./helpers/settings/modelsSettings";
import {
    destroyPersonaCodeMirrors,
    fillPersonasTable,
    personaModalElement,
    setupNewPersonaButton
} from "./helpers/settings/personasSettings";
import {getFromStorage, setToStorage} from "./helpers/storageHandling";
import {fillPlayersTable, setupNewPlayerButton} from "./helpers/settings/playersSettings";
import Tab from "bootstrap/js/dist/tab";
import {
    actionModalElement,
    destroyCustomActionCodeMirrors,
    fillCustomActionsTable,
    setupNewCustomActionButton
} from "./helpers/settings/actionsSettings";


function setupGeneral() {
    const quickSetupTab = Tab.getOrCreateInstance(document.getElementById("setupTab") as HTMLElement);

    document.querySelectorAll("a.open-quick-setup").forEach(element => element.addEventListener("click", () => quickSetupTab.show()));

    document.body.setAttribute("data-bs-theme", window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',({ matches }) => {
        document.body.setAttribute("data-bs-theme", matches ? "dark" : "light");
    });
}


function setupAllowToUseMicrophone() {
    const allowToUseMicrophone = document.getElementById("allowToUseMicrophone") as HTMLElement;
    allowToUseMicrophone.onclick = () => {
        navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
            stream.getTracks().forEach(track => track.readyState === 'live' && track.stop());
        }).catch(err => {
            console.error(err);
        });
    };
}

async function setupDefaultApiKeyInput() {
    const apiKeyInput = document.getElementById("mainGoogleApiKey") as HTMLInputElement;

    const apiKey = await getFromStorage(storageKeys.mainGoogleApiKey);
    if(apiKey)
        apiKeyInput.value = apiKey;

    apiKeyInput.addEventListener("change", async () => await setToStorage(storageKeys.mainGoogleApiKey, apiKeyInput.value));
}

setupGeneral();
setupAllowToUseMicrophone();
setupDefaultApiKeyInput().catch();

setupAssistantModelSettings().catch();
setupEmbeddingModelSettings().catch();

setupNewModelButton();
fillModelsTable().catch();

setupNewPersonaButton();
fillPersonasTable().catch();

setupNewPlayerButton();
fillPlayersTable().catch();

setupNewCustomActionButton();
fillCustomActionsTable().catch();

personaModalElement.addEventListener("hidden.bs.modal", () => {
    destroyPersonaCodeMirrors();
});

actionModalElement.addEventListener("hidden.bs.modal", () => {
    destroyCustomActionCodeMirrors();
});