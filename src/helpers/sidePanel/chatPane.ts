import {chatPaneChatArea, chatPaneInputTextArea} from './htmlElements';
import {addMessageCardToChatPane, fillModelMessageCard, setCurrentChat, updateCurrentChatSettings} from "./messages";
import {ChatMessageTypes, getChat, getEmptyDraft, SerializedChat} from "./chatStorage";
import {uniqueString} from "../uniqueId";


export function setupChatSettingsCard(currentChat: SerializedChat) {
    chatPaneChatArea.innerHTML = "";
    chatPaneChatArea.innerHTML = `
        <div class="card mb-3" id="currentChatSettingsCard">
            <div class="card-header"><h6 class="card-title mb-0">Settings for the current chat</h6></div>
            <div class="card-body">
                <label class="h6" for="llmPersonaSelect">LLM persona</label>
                <select id="llmPersonaSelect" class="form-select" aria-label="LLM persona for the current chat"></select>
                <label class="h6 mt-3" for="llmModelSelect">LLM model</label>
                <select id="llmModelSelect" class="form-select" aria-label="LLM model for the current chat"></select>
            </div>
        </div>`
    const currentChatSettingsCard = chatPaneChatArea.querySelector('#currentChatSettingsCard') as HTMLDivElement;

    const personas = [{name: "one", id: "1"}, {name: "two", id: "2"}, {name: "three", id: "3"}];
    const personaList = currentChatSettingsCard.querySelector("#llmPersonaSelect") as HTMLSelectElement;

    personas.forEach((persona) => {
        const option = document.createElement("option");
        option.value = persona.id;
        option.text = persona.name;
        personaList.appendChild(option);
        if (persona.id === currentChat.persona) {
            option.selected = true;
        }
    });

    personaList.addEventListener("change", () => {
        updateCurrentChatSettings({persona: personaList.value});
    });

    const models = [{name: "one", id: "1"}, {name: "two", id: "2"}, {name: "three", id: "3"}];
    const modelList = currentChatSettingsCard.querySelector("#llmModelSelect") as HTMLSelectElement;
    models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.text = model.name;
        modelList.appendChild(option);
        if (model.id === currentChat.model) {
            option.selected = true;
        }
    });
    modelList.addEventListener("change", () => {
        updateCurrentChatSettings({model: modelList.value});
    });
}

export async function loadChatAsCurrent(chatId: string) {
    const chat = await getChat(chatId);

    if (chat) {
        setCurrentChat(chat);
        chatPaneChatArea.innerHTML = "";
        setupChatSettingsCard(chat);

        let lastMessageCard = null;
        for (const message of chat.messages) {
            lastMessageCard = addMessageCardToChatPane(message.type, message.content, message.id);
        }

        if(chat.messages.length > 0 && chat.messages[chat.messages.length - 1].type === ChatMessageTypes.MODEL && lastMessageCard) {
            lastMessageCard.querySelector(".regenerate-message")?.addEventListener("click", async () => {
                await fillModelMessageCard(chat, lastMessageCard);
            });
        }
        chatPaneInputTextArea.value = chat.draft.content;
    }
}

export function startNewChat() {
    const newChat = {
        id: uniqueString(),
        timestamp: "",
        topic: "",
        persona: "",
        model: "",
        messages: [],
        draft: getEmptyDraft()
    };
    setCurrentChat(newChat);
    chatPaneChatArea.innerHTML = "";
    setupChatSettingsCard(newChat);
    chatPaneInputTextArea.value = "";
}
