chrome.storage.session.onChanged.addListener((changes) => {
    const llmMessageChange = changes["llmMessage"];

    if (!llmMessageChange) {
        return;
    }

    updateLlmMessage(llmMessageChange.newValue);
});

function updateLlmMessage(message) {
    if (!message) return;
    const llmMessageContainer = document.getElementById("llmMessageContainer");
    llmMessageContainer.innerHTML = message;
}