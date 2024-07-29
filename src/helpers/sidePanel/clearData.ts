import {removeFromStorage, setToStorage} from "../storage/storageHandling";
import {storageKeys} from "../constants";
import {ensureNonEmptyModels, ensureNonEmptyPersonas} from "../settings/ensureNonEmpty";
import {clearAllChats} from "../storage/chatStorage";
import {fillModelsTable} from "../settings/modelsSettings";
import {fillPersonasTable} from "../settings/personasSettings";
import {fillPlayersTable} from "../settings/playersSettings";
import {fillCustomActionsTable} from "../settings/actionsSettings";

export function setupClearButtons() {
    (document.getElementById("clearAllDataButton") as HTMLButtonElement).onclick = async () => {
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
    (document.getElementById("clearModelsButton") as HTMLButtonElement).onclick = async () => {
        if (confirm("Are you sure you want to IRREVERSIBLY clear models?")) {
            setToStorage(storageKeys.models, []).then(ensureNonEmptyModels).catch();
            fillModelsTable().catch();
        }
    }
    (document.getElementById("clearPersonasButton") as HTMLButtonElement).onclick = async () => {
        if (confirm("Are you sure you want to IRREVERSIBLY clear personas?")) {
            setToStorage(storageKeys.personas, []).then(ensureNonEmptyPersonas).catch();
            fillPersonasTable().catch();
        }
    }
    (document.getElementById("clearCodePlayersButton") as HTMLButtonElement).onclick = async () => {
        if (confirm("Are you sure you want to IRREVERSIBLY clear code players?")) {
            setToStorage(storageKeys.codePlayers, []).catch();
            fillPlayersTable().catch();
        }
    }
    (document.getElementById("clearCustomActionsButton") as HTMLButtonElement).onclick = async () => {
        if (confirm("Are you sure you want to IRREVERSIBLY clear custom actions?")) {
            setToStorage(storageKeys.customActions, []).catch();
            fillCustomActionsTable().catch();
        }
    }
    (document.getElementById("clearChatsButton") as HTMLButtonElement).onclick = async () => {
        if (confirm("Are you sure you want to IRREVERSIBLY clear chats?")) {
            clearAllChats().catch();
        }
    }
    (document.getElementById("clearAssistantModelSettingsButton") as HTMLButtonElement).onclick = async () => {
        if (confirm("Are you sure you want to IRREVERSIBLY clear assistant model settings?")) {
            removeFromStorage(storageKeys.assistantModel).catch();
        }
    };
}