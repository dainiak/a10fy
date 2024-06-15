chrome.storage.session.onChanged.addListener((changes) => {
    const llmMessageChange = changes["llmMessage"];

    if (!llmMessageChange) {
        return;
    }

    updateLlmMessage(llmMessageChange.newValue);
});

document.addEventListener("load", () => {
    chrome.storage.session.get(["llmMessage"]).then((result) => {
        if (result) {
            updateLlmMessage(result["llmMessage"]);
        }
    });
});

function updateLlmMessage(message: string) {
    if (!message)
        return;
    const llmMessageContainer = document.getElementById("llmMessageContainer") as HTMLDivElement;
    llmMessageContainer.innerHTML = message;
}
