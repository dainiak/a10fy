import {playPython} from "../players/python";
import {playMermaid} from "../players/mermaid";
import {playVegaLite} from "../players/vegaLite";
import {chatPaneChatArea, chatPaneInputTextArea, currentChatSettingsCard, themeType} from "./htmlElements";
import {createCodeMirror, EditorView} from "../codeMirror";
import {markdownRenderer} from "./markdown";
import {ChatSession} from "@google/generative-ai";

type ChatMessageType = "user" | "assistant";

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


function createMessageCard(messageType: ChatMessageType) {
    const card = document.createElement('div');
    card.className = `card mb-3 message-${messageType === "user" ? "user" : "model"}`;
    const regenerateButtonHTML = (
        messageType === "assistant"
            ? `<button class="btn btn-sm btn-outline-secondary regenerate-message" aria-label="Regenerate message" title="Regenerate message"><i class="bi bi-arrow-clockwise"></i></button>`
            : ""
    );
    card.innerHTML = `<div class="card-header"><h6 class="card-title">${messageType === "user" ? "User" : "Model"}</h6><div class="header-buttons">
${regenerateButtonHTML}<button class="btn btn-sm btn-outline-secondary edit-message-text" aria-label="Edit message" title="Edit message"><i class="bi bi-pencil-square"></i></button>
</div></div><div class="card-body"></div>`;

    card.style.setProperty("opacity", "0");
    card.style.setProperty("transition", "opacity 0.5s");
    (currentChatSettingsCard.querySelector("#llmPersonaSelect") as HTMLSelectElement).disabled = true;
    chatPaneChatArea.appendChild(card);
    card.style.setProperty("opacity", "1");
    card.scrollIntoView({ behavior: 'smooth' });
    return card as HTMLDivElement;
}

function activateEditMessageTextButton(messageCard: HTMLElement, message: string) {
    const cardBodyElement = messageCard.querySelector('.card-body') as HTMLElement;
    let cmView: EditorView | null = null;
    const editButton = messageCard.querySelector('button.edit-message-text') as HTMLButtonElement;
    const saveMessage = (editorView: EditorView) => {
        message = editorView.state.doc.toString();
        editorView.destroy();
        cmView = null;
        cardBodyElement.innerHTML = markdownRenderer.render(message);
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
        cmView = createCodeMirror(cardBodyElement, message, saveMessage, themeType);
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

function addMessageCardToChatPane(messageType: ChatMessageType, message: string) {
    const userMessageCard = createMessageCard(messageType);
    const cardBody = userMessageCard.querySelector('.card-body') as HTMLElement;
    cardBody.innerHTML = markdownRenderer.render(message);

    addBootstrapStyling(cardBody);
    addPlayers(cardBody);
    activateEditMessageTextButton(userMessageCard, message);
}

function sendMessageToChat(chat: ChatSession){
    let message = chatPaneInputTextArea.value.trim();
    const userMessageCard = createMessageCard("user");
    const cardBody = userMessageCard.querySelector('.card-body') as HTMLElement;
    activateEditMessageTextButton(userMessageCard, message);

    cardBody.innerHTML = markdownRenderer.render(message);
    addBootstrapStyling(cardBody);

    chatPaneInputTextArea.value = '';
    chatPaneInputTextArea.dispatchEvent(new Event('input'));
    const llmMessageCardElement = createMessageCard("assistant");
    const llmMessageCardTextElement = llmMessageCardElement.querySelector('.card-body') as HTMLElement;
    llmMessageCardTextElement.innerHTML = '<div class="card-text"><div class="dot-pulse"></div></div>';

    chat.sendMessageStream(message).then(async (result) => {
        let llmMessageText = "";

        for await (const chunk of result.stream) {
            const text = chunk.text();
            llmMessageText += text;
            llmMessageCardTextElement.innerHTML = markdownRenderer.render(llmMessageText);
        }

        addBootstrapStyling(llmMessageCardTextElement);
        addPlayers(llmMessageCardTextElement);
        activateEditMessageTextButton(llmMessageCardElement, llmMessageText);
    });
}

export {sendMessageToChat, addMessageCardToChatPane};