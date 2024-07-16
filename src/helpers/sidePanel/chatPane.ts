import {
    chatPaneChatArea,
    chatPaneInputTextArea,
    currentChatSettingsCard,
    makeUserInputAreaAutoexpandable
} from './htmlElements';
import {addMessageCardToChatPane, setCurrentChat} from "./messages";
import {getChat} from "./chatStorage";


function populatePersonasList() {
    const personas = ["one", "second", "trois"];
    let currentPersona = "one";
    const optionList = currentChatSettingsCard.querySelector("#llmPersonaSelect") as HTMLSelectElement;

    personas.forEach((persona) => {
        const option = document.createElement("option");
        option.value = persona;
        option.text = persona;
        optionList.appendChild(option);
        if (persona === currentPersona) {
            option.selected = true;
        }
    });
}

async function loadChatAsCurrent(chatId: string) {
    const chat = await getChat(chatId);

    if (chat) {
        setCurrentChat(chat);
        chatPaneChatArea.innerHTML = "";

        for (const message of chat.messages) {
            addMessageCardToChatPane(message.type === "user" ? "user" : "assistant", message.content, message.id);
        }
        chatPaneInputTextArea.value = chat.draft.content;
    }

}

export {populatePersonasList, loadChatAsCurrent};







export {makeUserInputAreaAutoexpandable};