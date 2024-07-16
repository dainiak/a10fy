import {initializeChatListTable} from "./helpers/sidePanel/chatList";
import {
    sendUserMessageToChat,
    updateCurrentChatDraftContent
} from "./helpers/sidePanel/messages";
import {
    chatInputFormElement,
    chatPaneInputTextArea,
    makeUserInputAreaAutoexpandable,
    showChatTab
} from "./helpers/sidePanel/htmlElements";
import {setInputAreaAttachmentEventListeners} from "./helpers/sidePanel/attachments";
import {loadChatAsCurrent, populatePersonasList,} from "./helpers/sidePanel/chatPane";
import {chatsDatabase, deleteChat, getChat, getEmptyDraft} from "./helpers/sidePanel/chatStorage";
import {uniqueString} from "./helpers/uniqueId";


async function loadChatToChatPane(chatId: string) {
    showChatTab();
    await loadChatAsCurrent(chatId);
}

document.addEventListener("DOMContentLoaded", async () => {
    await chatsDatabase.chats.add({
        id: uniqueString(),
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        topic: 'Some topic',
        persona: '',
        model: '',
        draft: getEmptyDraft(),
        messages: [
            {
                id: uniqueString(),
                type: 'user',
                attachments: [],
                content: 'Hello!',
            },
            {
                id: uniqueString(),
                type: 'assistant',
                attachments: [],
                content: 'Hi there!',
            }
        ]
    });

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

    initializeChatListTable(loadChatToChatPane, (chatId) => deleteChat(chatId)).catch();
    populatePersonasList();
    makeUserInputAreaAutoexpandable();
    setInputAreaAttachmentEventListeners();
});
