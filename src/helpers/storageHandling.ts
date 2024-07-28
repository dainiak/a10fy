export async function getFromStorage(key: string) {
    try {
        if(chrome.storage.sync)
            return (await chrome.storage.sync.get([key]))[key];
    }
    catch {
        const value = localStorage.getItem(key);
        return value === null ? null : JSON.parse(value);
    }
}

export async function setToStorage(key: string, value: any) {
    try {
        if (chrome.storage.sync)
            await chrome.storage.sync.set({[key]: value});
    }
    catch {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

export async function removeFromStorage(key: string) {
    try {
        if (chrome.storage.sync)
            await chrome.storage.sync.remove(key);
    }
    catch {
        localStorage.removeItem(key);
    }
}