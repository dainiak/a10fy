import {storageKeys} from "../constants";

function shouldBeSynced(key: storageKeys) {
    return [
        storageKeys.assistantModel,
        storageKeys.embeddingModel,
        storageKeys.summarizationModel,
        storageKeys.mainGoogleApiKey,
        storageKeys.models
    ].includes(key);
}

export async function getFromStorage(key: storageKeys) {
    try {
        if(chrome.storage.sync)
            return (await (shouldBeSynced(key) ? chrome.storage.sync : chrome.storage.local).get([key]))[key];
    }
    catch {
        const value = localStorage.getItem(key);
        return value === null ? null : JSON.parse(value);
    }
}

export async function setToStorage(key: storageKeys, value: any) {
    try {
        if (chrome.storage.sync)
            await (shouldBeSynced(key) ? chrome.storage.sync : chrome.storage.local).set({[key]: value});
    }
    catch {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

export async function removeFromStorage(key: storageKeys) {
    try {
        if (chrome.storage.sync)
            await (shouldBeSynced(key) ? chrome.storage.sync : chrome.storage.local).remove(key);
    }
    catch {
        localStorage.removeItem(key);
    }
}