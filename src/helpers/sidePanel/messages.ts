import {playPython} from "../players/python";
import {playMermaid} from "../players/mermaid";
import {playVegaLite} from "../players/vegaLite";
import {chatPaneChatArea, chatPaneInputTextArea, themeType} from "./htmlElements";
import {createCodeMirror, EditorView} from "../codeMirror";
import {markdownRenderer} from "./markdown";
import {
    ChatMessageTypes,
    createSerializedChat,
    getEmptyAssistantMessage,
    getEmptyDraft,
    saveUpdatedChat,
    SerializedChat
} from "./chatStorage";
import {getGeminiTextModel} from "../geminiInterfacing";
import {getInlineDataPart} from "../promptParts";


let currentChat: SerializedChat | null = null;

function addPlayers(messageCardTextElement: HTMLElement){
    const players = {
        "python": {
            player: playPython,
            autoplay: false
        },
        "mermaid": {
            player: playMermaid,
            autoplay: true
        },
        "json-vega-lite": {
            player: playVegaLite,
            autoplay: true
        }
    }

    for (const [language, {player, autoplay}] of Object.entries(players)) {
        Array.from(messageCardTextElement.querySelectorAll(`pre.code-block.language-${language}`)).forEach(
            (element) => {
                const {outputElement, code, playButton, toggleCode} = replacePreWithCodeCard(element as HTMLElement);
                playButton.addEventListener("click", () => player(code, outputElement));
                if (autoplay) {
                    player(code, outputElement);
                    toggleCode(false);
                }
            }
        );
    }
}

function createMessageCard(messageType: ChatMessageTypes, messageId: string) {
    const card = document.createElement('div');
    card.className = `card mb-3 message-${messageType === ChatMessageTypes.USER ? "user" : "model"} chat-message-card`;
    card.dataset.messageId = messageId;
    const regenerateButtonHTML = (
        messageType === ChatMessageTypes.MODEL
            ? `<button class="btn btn-sm btn-outline-secondary regenerate-message" aria-label="Regenerate message" title="Regenerate message"><i class="bi bi-arrow-clockwise"></i></button>`
            : ""
    );
    card.innerHTML = `<div class="card-header"><h6 class="card-title mb-0">${messageType === "user" ? "User" : "Model"}</h6><div class="header-buttons">
${regenerateButtonHTML}<button class="btn btn-sm btn-outline-secondary edit-message-text" aria-label="Edit message" title="Edit message"><i class="bi bi-pencil-square"></i></button>
</div></div><div class="card-body"></div>`;

    card.style.setProperty("opacity", "0");
    card.style.setProperty("transition", "opacity 0.5s");

    Array.from(chatPaneChatArea.querySelectorAll("button.regenerate-message")).forEach((button) => button.remove());
    chatPaneChatArea.appendChild(card);
    card.style.setProperty("opacity", "1");
    card.scrollIntoView({ behavior: 'smooth' });
    return card as HTMLDivElement;
}

function activateEditMessageTextButton(messageCard: HTMLElement, messageText: string, messageId: string) {
    const cardBodyElement = messageCard.querySelector('.card-body') as HTMLElement;
    let cmView: EditorView | null = null;
    const editButton = messageCard.querySelector('button.edit-message-text') as HTMLButtonElement;
    const saveMessage = (editorView: EditorView) => {
        messageText = editorView.state.doc.toString();
        editorView.destroy();
        cmView = null;
        if(currentChat) {
            const messageToUpdate = currentChat.messages.find((message) => message.id === messageId);
            if(messageToUpdate) {
                messageToUpdate.content = messageText;
                saveUpdatedChat(currentChat);
            }
        }
        cardBodyElement.innerHTML = markdownRenderer.render(messageText);
        addBootstrapStyling(cardBodyElement);
        addPlayers(cardBodyElement);
        editButton.innerHTML = '<i class="bi bi-pencil-square"></i>';
    }

    editButton?.addEventListener('click', () => {
        if (cmView) {
            saveMessage(cmView);
            return;
        }
        cardBodyElement.innerHTML = '';
        cmView = createCodeMirror(cardBodyElement, messageText, saveMessage, themeType);
        editButton.innerHTML = '<i class="bi bi-floppy"></i>';
    });
}

function replacePreWithCodeCard(preElement: HTMLElement) {
    const headings = {
        "language-python": "Python code",
        "language-mermaid": "Mermaid diagram",
        "language-json-vega-lite": "Vega-Lite chart",
    };

    let heading = "Code";
    for (const [language, headingText] of Object.entries(headings)) {
        if (preElement.classList.contains(language)) {
            heading = headingText;
            break;
        }
    }
    preElement.classList.add("card-body");
    preElement.classList.add("mb-0");
    const code = preElement.textContent || "";
    const codeCard = document.createElement("div");
    codeCard.className = "card mb-3";
    codeCard.innerHTML = `
    <div class="card-header"><span>${heading}</span><div class="header-buttons">
        <button class="btn btn-sm btn-outline-secondary toggle-code"><i class="bi bi-code"></i></button>
        <button class="btn btn-sm btn-outline-secondary run-code"><i class="bi bi-play-fill"></i></button>
    </div></div>${preElement.outerHTML}<div class="player-output mt-2"></div>`;

    preElement.replaceWith(codeCard);
    const codePreElement = codeCard.querySelector("pre") as HTMLPreElement;
    const outputElement = codeCard.querySelector(".player-output") as HTMLDivElement;
    outputElement.style.setProperty("display", "none");

    const toggleCode = (show?: boolean) => {
        if (show === undefined) {
            show = codePreElement.style.getPropertyValue("display") === "none";
        }
        codePreElement.style.setProperty("display", show ? "" : "none");
        if (show) {
            outputElement.classList.add("mt-2");
        }
        else {
            outputElement.classList.remove("mt-2");
        }
    }

    const playButton = codeCard.querySelector(".run-code") as HTMLButtonElement;
    const toggleCodeButton = codeCard.querySelector(".toggle-code") as HTMLButtonElement;
    toggleCodeButton.addEventListener("click", () => {toggleCode()});

    return {
        codePreElement: codePreElement,
        codeCard: codeCard,
        outputElement: outputElement,
        code: code,
        playButton: playButton,
        toggleCode: toggleCode,
    };
}

function addBootstrapStyling(messageCardTextElement: HTMLElement) {
    Array.from(messageCardTextElement.querySelectorAll("p")).forEach(
        (element) => (element as HTMLParagraphElement).classList.add("card-text")
    );

    Array.from(messageCardTextElement.querySelectorAll("table")).forEach(
        (element) => (element as HTMLTableElement).classList.add("table")
    );

    ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((header) =>
        Array.from(messageCardTextElement.querySelectorAll(header)).forEach(
            (element) => (element as HTMLTableElement).classList.add("card-title")
        )
    );
}

export function addMessageCardToChatPane(messageType: ChatMessageTypes, message: string, messageId: string) {
    const messageCard = createMessageCard(messageType, messageId);
    const cardBody = messageCard.querySelector('.card-body') as HTMLElement;
    cardBody.innerHTML = markdownRenderer.render(message);

    addBootstrapStyling(cardBody);
    addPlayers(cardBody);
    activateEditMessageTextButton(messageCard, message, messageId);
    return messageCard;
}

export async function fillModelMessageCard(currentChat:SerializedChat, llmMessageCardElement?:HTMLDivElement){
    const serializedAssistantMessage = currentChat.messages[currentChat.messages.length - 1];
    if (!currentChat.timestamp)
        currentChat.timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
    await saveUpdatedChat(currentChat);

    if(!llmMessageCardElement) {
        Array.from(chatPaneChatArea.querySelectorAll("button.regenerate-message")).forEach((button) => button.remove());
        llmMessageCardElement = createMessageCard(ChatMessageTypes.MODEL, serializedAssistantMessage.id);
        llmMessageCardElement.querySelector(".regenerate-message")?.addEventListener("click", async () => {
            await fillModelMessageCard(currentChat, llmMessageCardElement);
        });
    }

    const llmMessageCardTextElement = llmMessageCardElement.querySelector('.card-body') as HTMLDivElement;
    llmMessageCardTextElement.innerHTML = '<div class="card-text"><div class="dot-pulse"></div></div>';

    const geminiHistory = currentChat.messages.map(
        (message) => {
            return {
                role: message.type === ChatMessageTypes.USER ? "user" : "model",
                parts: [{text: message.content}, ...message.attachments.map((attachment) => getInlineDataPart(attachment.data))]
            }
        }
    );

    const chatModel = await getGeminiTextModel();
    chatModel.generateContentStream({contents: geminiHistory}).then(async (result) => {
        let llmMessageText = "";

        try {
            for await (const chunk of result.stream) {
                const text = chunk.text();
                llmMessageText += text;
                llmMessageCardTextElement.innerHTML = markdownRenderer.render(llmMessageText);
            }
        }
        catch (error) {
        }

        serializedAssistantMessage.content = llmMessageText;
        if(currentChat) {
            await saveUpdatedChat(currentChat);
        }

        addBootstrapStyling(llmMessageCardTextElement);
        addPlayers(llmMessageCardTextElement);
        activateEditMessageTextButton(llmMessageCardElement, llmMessageText, serializedAssistantMessage.id);
    });
}

export async function sendUserMessageToChat(){
    if(!currentChat) {
        currentChat = createSerializedChat();
    }
    let userMessage = chatPaneInputTextArea.value.trim();
    const serializedUserMessage = currentChat.draft;
    serializedUserMessage.content = userMessage;

    const userMessageCard = createMessageCard(ChatMessageTypes.USER, serializedUserMessage.id);
    const cardBody = userMessageCard.querySelector('.card-body') as HTMLElement;
    activateEditMessageTextButton(userMessageCard, userMessage, serializedUserMessage.id);

    cardBody.innerHTML = markdownRenderer.render(userMessage);
    addBootstrapStyling(cardBody);

    currentChat.messages.push(serializedUserMessage);
    currentChat.draft = getEmptyDraft();
    currentChat.messages.push(getEmptyAssistantMessage());

    chatPaneInputTextArea.value = '';
    chatPaneInputTextArea.dispatchEvent(new Event('input'));
    await fillModelMessageCard(currentChat);
}

export function setCurrentChat(chat: SerializedChat) {
    currentChat = chat;
}

export function updateCurrentChatDraftContent() {
    if(currentChat) {
        currentChat.draft.content = chatPaneInputTextArea.value;
        if (currentChat.timestamp)
            saveUpdatedChat(currentChat);
    }
}

export function updateCurrentChatSettings(fields: {topic?: string; persona?: string; model?: string}) {
    if(currentChat) {
        currentChat.topic = fields.topic || currentChat.topic;
        currentChat.persona = fields.persona || currentChat.persona;
        currentChat.model = fields.model || currentChat.model;
        if(currentChat.timestamp)
            saveUpdatedChat(currentChat);
    }
}
