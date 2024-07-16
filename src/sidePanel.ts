import {getGeminiChat} from "./helpers/geminiInterfacing";
import {initializeChatListTable} from "./helpers/sidePanel/chatList";
import {
    addAssistantMessageCardToChatPane,
    addUserMessageCardToChatPane,
    sendMessageToChat
} from "./helpers/sidePanel/messages";
import {chatInputFormElement, makeUserInputAreaAutoexpandable, showChatTab} from "./helpers/sidePanel/htmlElements";
import {setInputAreaAttachmentEventListeners} from "./helpers/sidePanel/attachments";
import {populatePersonasList} from "./helpers/sidePanel/chatPane";
import {chatsDatabase, deleteChat, getChat} from "./helpers/sidePanel/chatStorage";
import {uniqueString} from "./helpers/uniqueId";



async function loadChatToChatPane(chatId: string) {
    showChatTab();
    const chat = await getChat(chatId);
    if (chat) {
        for (const message of chat.messages) {
            if(message.type === "user") {
                addUserMessageCardToChatPane(message.content);
            }
            else {
                addAssistantMessageCardToChatPane(message.content);
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await chatsDatabase.chats.add({
        id: uniqueString(),
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        topic: 'Some topic',
        persona: '',
        model: '',
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

    const chat = await getGeminiChat();

    chatInputFormElement.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessageToChat(chat);
        return false;
    })

    chatInputFormElement.addEventListener('keydown', (event) => {
        if(event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            sendMessageToChat(chat);
        }
    });

    initializeChatListTable(loadChatToChatPane, (chatId) => deleteChat(chatId)).catch();
    populatePersonasList();
    makeUserInputAreaAutoexpandable();
    setInputAreaAttachmentEventListeners();
});
