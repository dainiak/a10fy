import {removeFromStorage, setToStorage} from "../storage/storageHandling";
import {storageKeys} from "../constants";
import {ensureNonEmptyModels, ensureNonEmptyPersonas} from "../settings/ensureNonEmpty";
import {clearAllChats} from "../storage/chatStorage";
import {fillModelsTable} from "../settings/modelsSettings";
import {fillPersonasTable} from "../settings/personasSettings";
import {fillPlayersTable} from "../settings/playersSettings";
import {fillCustomActionsTable} from "../settings/actionsSettings";

export function setupClearButtons() {
    const clearAllDataButton = document.getElementById("clearAllDataButton") as HTMLButtonElement;
    if(clearAllDataButton)
        clearAllDataButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY CLEAR ALL DATA?")) {
                removeFromStorage(storageKeys.mainGoogleApiKey).catch();
                removeFromStorage(storageKeys.assistantModel).catch();
                removeFromStorage(storageKeys.summarizationModel).catch();
                removeFromStorage(storageKeys.embeddingModel).catch();
                setToStorage(storageKeys.models, []).then(ensureNonEmptyModels).catch();
                setToStorage(storageKeys.personas, []).then(ensureNonEmptyPersonas).catch();
                setToStorage(storageKeys.codePlayers, []).catch();
                setToStorage(storageKeys.customActions, []).catch();
                clearAllChats().catch();
                fillModelsTable().catch();
                fillPersonasTable().catch();
                fillPlayersTable().catch();
                fillCustomActionsTable().catch();
            }
        }
    const clearModelsButton = document.getElementById("clearModelsButton") as HTMLButtonElement;
    if(clearModelsButton)
        clearModelsButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY clear models?")) {
                setToStorage(storageKeys.models, []).then(ensureNonEmptyModels).catch();
                fillModelsTable().catch();
            }
        }
    const clearPersonasButton = document.getElementById("clearPersonasButton") as HTMLButtonElement;
    if(clearPersonasButton)
        clearPersonasButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY clear personas?")) {
                setToStorage(storageKeys.personas, []).then(ensureNonEmptyPersonas).catch();
                fillPersonasTable().catch();
            }
        }
    const clearPlayersButton = document.getElementById("clearPlayersButton") as HTMLButtonElement;
    if(clearPlayersButton)
        clearPlayersButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY clear players?")) {
                setToStorage(storageKeys.codePlayers, []).catch();
                fillPlayersTable().catch();
            }
        }
    const clearCustomActionsButton = document.getElementById("clearCustomActionsButton") as HTMLButtonElement;
    if(clearCustomActionsButton)
        clearCustomActionsButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY clear custom actions?")) {
                setToStorage(storageKeys.customActions, []).catch();
                fillCustomActionsTable().catch();
            }
        }
    const clearChatsButton = document.getElementById("clearChatsButton") as HTMLButtonElement;
    if(clearChatsButton)
        clearChatsButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY clear chats?")) {
                clearAllChats().catch();
            }
        }
    const clearAssistantModelSettingsButton = document.getElementById("clearAssistantModelSettingsButton") as HTMLButtonElement;
    if(clearAssistantModelSettingsButton)
        clearAssistantModelSettingsButton.onclick = async () => {
            if (confirm("Are you sure you want to IRREVERSIBLY clear assistant model settings?")) {
                removeFromStorage(storageKeys.assistantModel).catch();
                removeFromStorage(storageKeys.summarizationModel).catch();
                removeFromStorage(storageKeys.embeddingModel).catch();
            }
        }
}