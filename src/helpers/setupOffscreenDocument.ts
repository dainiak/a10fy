let creatingOffscreenDocument: Promise<void> | null = null;

export async function setupOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL("offscreen.html");
    chrome.runtime.getContexts({
        contextTypes:  ["OFFSCREEN_DOCUMENT"],
        documentUrls: [offscreenUrl]
    }).then(async (contexts) => {
        if (contexts.length > 0)
            return;
        if (creatingOffscreenDocument) {
            await creatingOffscreenDocument;
        } else {
            creatingOffscreenDocument = chrome.offscreen.createDocument({
                url: "offscreen.html",
                reasons: ["AUDIO_PLAYBACK", "USER_MEDIA", "BLOBS"],
                justification: "Allow the user do dictate voice commands."
            });
            await creatingOffscreenDocument;
            creatingOffscreenDocument = null;
        }
    });
}
