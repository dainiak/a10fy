chrome.storage.session.onChanged.addListener((changes) => {
    const llmMessageChange = changes["llmMessage"];

    if (!llmMessageChange) {
        return;
    }

    updateLlmMessage(llmMessageChange.newValue);
});

document.addEventListener("load", () => {
    const llmMessage = chrome.storage.session.get(["llmMessage"])["llmMessage"];
    if (llmMessage) {
        updateLlmMessage(llmMessage);
    }
});

function updateLlmMessage(message) {
    if (!message) return;
    const llmMessageContainer = document.getElementById("llmMessageContainer");
    llmMessageContainer.innerHTML = message;
}
