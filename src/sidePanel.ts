import {getGeminiChat} from "./helpers/geminiInterfacing";

import {initializeChatListTable} from "./helpers/sidePanel/chatList";
import {sendMessageToChat} from "./helpers/sidePanel/messages";
import {chatInputFormElement, makeUserInputAreaAutoexpandable} from "./helpers/sidePanel/htmlElements";
import {setInputAreaAttachmentEventListeners} from "./helpers/sidePanel/attachments";
import {populatePersonasList} from "./helpers/sidePanel/chatPane";

initializeChatListTable();
populatePersonasList();
makeUserInputAreaAutoexpandable();
setInputAreaAttachmentEventListeners();


document.addEventListener("DOMContentLoaded", async () => {
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

    makeUserInputAreaAutoexpandable();
});
