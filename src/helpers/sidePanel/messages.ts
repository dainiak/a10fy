import {playPython} from "../players/python";
import {playMermaid} from "../players/mermaid";
import {playVegaLite} from "../players/vegaLite";
import {chatPaneChatArea, chatPaneInputTextArea} from "./htmlElements";
import {createMarkdownCodeMirror, EditorView} from "../codeMirror";
import {markdownRenderer} from "./markdown";
import {
    ChatMessageTypes,
    createSerializedChat, deleteChat,
    getEmptyAssistantMessage,
    getEmptyDraft, getTimestampStringForChat, MessageAttachment, MessageAttachmentTypes,
    saveUpdatedChat,
    SerializedChat, SerializedMessage
} from "../storage/chatStorage";
import {getGeminiTextModel} from "../geminiInterfacing";
import {getInlineDataPart} from "../promptParts";
import {storageKeys} from "../constants";
import {SerializedCustomCodePlayer, SerializedModel, SerializedPersona} from "../settings/dataModels";
import {getFromStorage} from "../storage/storageHandling";
import {customPlayerFactory} from "../players/custom";
import {uniqueString} from "../misc";
import {ensureNonEmptyModels} from "../settings/ensureNonEmpty";
import {inputAreaAttachmentIconsContainer} from "./htmlElements";


let currentChat: SerializedChat | null = null;

export function getCurrentChatId() {
    return currentChat ? currentChat.id : null;
}

async function addPlayers(messageCardTextElement: HTMLElement){
    const players: {[key: string]: {player: Function, autoplay: boolean, hideCode: boolean}} = {
        "python": {
            player: playPython,
            autoplay: false,
            hideCode: false
        },
        "mermaid": {
            player: playMermaid,
            autoplay: true,
            hideCode: true
        },
        "vega-lite-json": {
            player: playVegaLite,
            autoplay: true,
            hideCode: true
        }
    }
    const customPlayers: SerializedCustomCodePlayer[] = (await getFromStorage(storageKeys.codePlayers) || []);
    for (const customPlayer of customPlayers) {
        for(const languageTag of customPlayer.languageTags) {
            if (languageTag)
                players[languageTag] = {
                    player: customPlayerFactory(customPlayer.customCSS, customPlayer.customJS, customPlayer.customHTML),
                    autoplay: customPlayer.autoplay,
                    hideCode: customPlayer.hideCode
                }
        }
    }

    for (const [language, {player, autoplay, hideCode}] of Object.entries(players)) {
        Array.from(messageCardTextElement.querySelectorAll(`pre.code-block.language-${language}`)).forEach(
            (element) => {
                const {outputElement, code, playButton, toggleCode} = replacePreWithCodeCard(element as HTMLElement);
                playButton.addEventListener("click", () => player(language, code, outputElement));
                if (autoplay) {
                    if(hideCode)
                        player(language, code, outputElement, () => toggleCode(false));
                    else
                        player(language, code, outputElement);
                }
            }
        );
    }
}

export function createAttachmentsCard(message: SerializedMessage) {
    const attachments = message.attachments;
    const card = document.createElement('div');
    card.className = `card mb-3 attachments-card`;
    card.innerHTML = `<div class="card-header"><h6 class="card-title mb-0">Attachments</h6></div><div class="card-body"></div>`;
    const cardBody = card.querySelector('.card-body') as HTMLDivElement;
    for(const attachment of attachments) {
        const iconContainer = document.createElement("div");
        iconContainer.className = "icon";
        const icon = attachment.type === MessageAttachmentTypes.IMAGE ? document.createElement("img") : document.createElement("i");
        if(attachment.type === MessageAttachmentTypes.IMAGE)
            (icon as HTMLImageElement).src = attachment.data;
        else
            icon.className = "bi bi-file-earmark-music";
        iconContainer.appendChild(icon);
        cardBody.appendChild(iconContainer);
        const trashIcon = document.createElement("i");
        trashIcon.className = "bi bi-trash";
        iconContainer.appendChild(trashIcon);
        iconContainer.onclick = () => {
            iconContainer.innerHTML = "";
            iconContainer.remove();
            message.attachments = message.attachments.filter((a: MessageAttachment) => a.id !== attachment.id);
            if(currentChat)
                saveUpdatedChat(currentChat);
        };
    }
    return card;
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

function activateEditMessageTextButton(messageCard: HTMLElement, message: SerializedMessage) {
    const cardBodyElement = messageCard.querySelector('.card-body') as HTMLElement;
    let cmView: EditorView | null = null;
    const editButton = messageCard.querySelector('button.edit-message-text') as HTMLButtonElement;
    const saveMessage = async (editorView: EditorView) => {
        message.content = editorView.state.doc.toString();
        editorView.destroy();
        cmView = null;
        if(currentChat) {
            const messageToUpdate = currentChat.messages.find((m) => m.id === message.id);
            if(messageToUpdate) {
                messageToUpdate.content = message.content;
                saveUpdatedChat(currentChat);
            }
        }
        cardBodyElement.innerHTML = markdownRenderer.render(message.content);
        addBootstrapStyling(cardBodyElement);
        if(message.attachments.length) {
            cardBodyElement.insertBefore(createAttachmentsCard(message), cardBodyElement.firstChild);
        }

        await addPlayers(cardBodyElement);
        editButton.innerHTML = '<i class="bi bi-pencil-square"></i>';
    }

    editButton?.addEventListener('click', async () => {
        if (cmView) {
            await saveMessage(cmView);
            return;
        }
        cardBodyElement.innerHTML = '';
        cmView = createMarkdownCodeMirror(cardBodyElement, message.content, saveMessage);
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

export async function addMessageCardToChatPane(message: SerializedMessage) {
    const messageCard = createMessageCard(message.type, message.id);
    const cardBody = messageCard.querySelector('.card-body') as HTMLElement;
    cardBody.innerHTML = markdownRenderer.render(message.content);
    addBootstrapStyling(cardBody);
    await addPlayers(cardBody);
    activateEditMessageTextButton(messageCard, message);
    if(message.attachments.length) {
        cardBody.insertBefore(createAttachmentsCard(message), cardBody.firstChild);
    }
    return messageCard;
}

export async function fillModelMessageCard(currentChat:SerializedChat, llmMessageCardElement?:HTMLDivElement) {
    const serializedAssistantMessage = currentChat.messages[currentChat.messages.length - 1];
    if (!currentChat.timestamp)
        currentChat.timestamp = getTimestampStringForChat();
    await saveUpdatedChat(currentChat);

    if(!llmMessageCardElement) {
        Array.from(chatPaneChatArea.querySelectorAll("button.regenerate-message")).forEach((button) => button.remove());
        llmMessageCardElement = createMessageCard(ChatMessageTypes.MODEL, serializedAssistantMessage.id);
        llmMessageCardElement.querySelector(".regenerate-message")?.addEventListener("click", async () => {
            currentChat.messages.pop();
            await fillModelMessageCard(currentChat, llmMessageCardElement);
        });
    }

    const llmMessageCardBodyElement = llmMessageCardElement.querySelector('.card-body') as HTMLDivElement;
    llmMessageCardBodyElement.innerHTML = '<div class="card-text"><div class="dot-pulse"></div></div>';

    const geminiHistory = currentChat.messages.map(
        (message) => {
            return {
                role: message.type === ChatMessageTypes.USER ? "user" : "model",
                parts: [...message.attachments.map((attachment) => getInlineDataPart(attachment.data)), {text: message.content}]
            }
        }
    );

    const personas: SerializedPersona[] = (await getFromStorage(storageKeys.personas)) || [];
    let persona = personas.find((persona: SerializedPersona) => persona.id === currentChat.persona) || null;
    if (!persona && personas.length) {
        persona = personas[0];
        currentChat.persona = persona.id;
    }

    const models = await ensureNonEmptyModels();
    let model = models.find((model: SerializedModel) => model.id === (currentChat.model || persona?.defaultModel));
    if(!model) {
        model = models[0];
        currentChat.model = model.id;
    }

    const chatModel = await getGeminiTextModel(model, persona);
    chatModel.generateContentStream({contents: geminiHistory}).then(async (result) => {
        let llmMessageText = "";

        try {
            for await (const chunk of result.stream) {
                const text = chunk.text();
                llmMessageText += text;
                llmMessageCardBodyElement.innerHTML = markdownRenderer.render(llmMessageText);
            }
        }
        catch (error) {
        }

        serializedAssistantMessage.content = llmMessageText;
        if(currentChat) {
            await saveUpdatedChat(currentChat);
        }

        addBootstrapStyling(llmMessageCardBodyElement);
        await addPlayers(llmMessageCardBodyElement);
        activateEditMessageTextButton(llmMessageCardElement, serializedAssistantMessage);
    });
}

export async function sendUserMessageToChat(){
    if(!currentChat) {
        currentChat = createSerializedChat();
    }
    let userMessage = chatPaneInputTextArea.value.trim();
    const serializedUserMessage = currentChat.draft;
    currentChat.draft = getEmptyDraft();
    serializedUserMessage.content = userMessage;
    currentChat.messages.push(serializedUserMessage);

    const userMessageCard = createMessageCard(ChatMessageTypes.USER, serializedUserMessage.id);
    const cardBody = userMessageCard.querySelector('.card-body') as HTMLElement;
    activateEditMessageTextButton(userMessageCard, serializedUserMessage);

    cardBody.innerHTML = markdownRenderer.render(userMessage);
    addBootstrapStyling(cardBody);

    if(serializedUserMessage.attachments.length) {
        cardBody.insertBefore(createAttachmentsCard(currentChat.messages[currentChat.messages.length - 1]), cardBody.firstChild);
    }

    currentChat.messages.push(getEmptyAssistantMessage());

    chatPaneInputTextArea.value = '';
    inputAreaAttachmentIconsContainer.innerHTML = '';
    chatPaneInputTextArea.dispatchEvent(new Event('input'));
    await fillModelMessageCard(currentChat);
}

export function setCurrentChat(chat: SerializedChat | null) {
    currentChat = chat;
}

export function updateCurrentChatDraftContent() {
    if(currentChat) {
        currentChat.draft.content = chatPaneInputTextArea.value;
        if (currentChat.timestamp)
            saveUpdatedChat(currentChat);
    }
}

export function addAttachmentToCurrentDraft(attachment: {type: MessageAttachmentTypes, data: string}) {
    const id = uniqueString();
    if(!currentChat) {
        currentChat = createSerializedChat();
    }
    currentChat.draft.attachments.push({id, ...attachment});
    if (currentChat.timestamp)
        saveUpdatedChat(currentChat);
    return id;
}

export function removeAttachmentFromCurrentDraft(attachmentId: string) {
    if(currentChat) {
        currentChat.draft.attachments = currentChat.draft.attachments.filter((attachment) => attachment.id !== attachmentId);
        if (currentChat.timestamp)
            saveUpdatedChat(currentChat);
        if(currentChat.messages.length == 0 && currentChat.draft.attachments.length == 0 && currentChat.draft.content == "") {
            deleteChat(currentChat.id);
            currentChat = null;
        }
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
