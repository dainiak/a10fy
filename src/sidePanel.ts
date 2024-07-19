import {initializeChatListTable} from "./helpers/sidePanel/chatList";
import {
    sendUserMessageToChat,
    updateCurrentChatDraftContent
} from "./helpers/sidePanel/messages";
import {
    chatInputFormElement,
    chatPaneInputTextArea,
    makeUserInputAreaAutoexpandable,
    showChatTab,
    themeType
} from "./helpers/sidePanel/htmlElements";
import {setInputAreaAttachmentEventListeners} from "./helpers/sidePanel/attachments";
import {loadChatAsCurrent, startNewChat,} from "./helpers/sidePanel/chatPane";
import {deleteChat} from "./helpers/sidePanel/chatStorage";


async function loadChatToChatPane(chatId: string) {
    showChatTab();
    await loadChatAsCurrent(chatId);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',({ matches }) => {
    document.body.setAttribute("data-bs-theme", matches ? "dark" : "light");
});

document.addEventListener("DOMContentLoaded", async () => {
    document.body.setAttribute("data-bs-theme", themeType);
    // await a10fyDatabase.chats.add({
    //     id: uniqueString(),
    //     timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
    //     topic: 'Some topic',
    //     persona: '',
    //     model: '',
    //     draft: getEmptyDraft(),
    //     messages: [
    //         {
    //             id: uniqueString(),
    //             type: 'user',
    //             attachments: [],
    //             content: 'Hello!',
    //         },
    //         {
    //             id: uniqueString(),
    //             type: 'model',
    //             attachments: [],
    //             content: 'Hi there!',
    //         }
    //     ]
    // });

    chatInputFormElement.addEventListener('submit', function(e) {
        e.preventDefault();
        sendUserMessageToChat();
        return false;
    })

    chatInputFormElement.addEventListener('keydown', (event) => {
        if(event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            sendUserMessageToChat();
        }
    });

    chatPaneInputTextArea.addEventListener("input", () => {
        updateCurrentChatDraftContent();
    });

    (document.getElementById("newChatButton") as HTMLButtonElement).addEventListener("click", async () => {
        startNewChat();
        showChatTab();
    });

    (document.getElementById("openSettingsPageButton") as HTMLButtonElement).addEventListener("click", async () => {
        await chrome.runtime.openOptionsPage();
    })

    initializeChatListTable(loadChatToChatPane, (chatId) => deleteChat(chatId)).catch();
    makeUserInputAreaAutoexpandable();
    setInputAreaAttachmentEventListeners();
});
