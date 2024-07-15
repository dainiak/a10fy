import markdownit, {StateInline} from "markdown-it";
import hljs from "highlight.js";
import {hljsDarkStyleContent, hljsLightStyleContent} from "./helpers/styleStrings";
import {getGeminiChat} from "./helpers/geminiInterfacing";
import {ChatSession} from "@google/generative-ai";
import katex from "katex";
import {createCodeMirror, EditorView} from "./helpers/codeMirror";
import mermaid from "mermaid";
import {extensionActions, RunInSandboxRequest, SandboxedTaskResult} from "./helpers/constants";
import TurndownService from 'turndown';
import * as Bootstrap from "bootstrap";
import {initializeChatListTable} from "./helpers/sidePanel/chatList";

initializeChatListTable();

const turndownService = new TurndownService({
   headingStyle: 'atx',
});

const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;
const themeType: ("dark" | "light") = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

hljsStyle.textContent = themeType === "dark" ? hljsDarkStyleContent : hljsLightStyleContent;

const mainChatUserInputTextArea = document.querySelector('.a10fy-input-area textarea') as HTMLTextAreaElement;
const chatArea = document.querySelector('.a10fy-chat-area') as HTMLDivElement;
const currentChatSettingsCard = document.getElementById("currentChatSettingsCard") as HTMLDivElement;

const markdownRenderer: any  = markdownit({
    html:         false,
    xhtmlOut:     false,
    breaks:       false,
    langPrefix:   "language-",
    linkify:      true,
    typographer:  true,
    quotes: `“”‘’`,
    highlight: (str, lang) => {
        let hljsLang = lang;
        if (lang === "json-vega-lite") {
            hljsLang = "json";
        }
        let highlightedCode = "";
        if (lang && hljs.getLanguage(hljsLang)) {
            try {
                highlightedCode = hljs.highlight(str, { language: hljsLang, ignoreIllegals: true }).value.trim();
            } catch (__) {}
        }
        highlightedCode ||= markdownRenderer.utils.escapeHtml(str).trim();
        return `<pre class="rounded-2 p-3 hljs language-${lang} code-block"><code class="hljs">${highlightedCode}</code></pre>`;
    }
});

function markdownInlineMathRule(state: StateInline, silent: boolean) {
    const delimiters = [
        { leftDelimiter: '\\(', rightDelimiter: '\\)', isDisplay: false },
        { leftDelimiter: '\\[', rightDelimiter: '\\]', isDisplay: true },
    ]

    for (const { leftDelimiter, rightDelimiter, isDisplay } of delimiters) {
        if (!state.src.slice(state.pos).startsWith(leftDelimiter))
            continue;
        const contentStartPos = state.pos + leftDelimiter.length;
        const rightDelimiterPos = state.src.indexOf(rightDelimiter, contentStartPos);
        if (rightDelimiterPos < 0 || rightDelimiterPos >= state.posMax)
            continue;

        if (!silent) {
            try {
                state.push('html_inline', '', 0).content = katex.renderToString(
                    state.src.slice(contentStartPos, rightDelimiterPos),
                    {
                        throwOnError: true,
                        strict: false,
                        output: 'htmlAndMathml',
                        displayMode: isDisplay,
                    }
                );
            } catch (e) {
                return false;
            }
        }

        state.pos = rightDelimiterPos + rightDelimiter.length;
        return true;
    }
}

markdownRenderer.inline.ruler.after('text', 'escaped_bracket', markdownInlineMathRule);

type ChatMessageType = "user" | "model";

function showChatTab() {
    Bootstrap.Tab.getInstance(document.getElementById("chatTab") as HTMLElement)?.show()
}

function showChatListTab() {
    Bootstrap.Tab.getInstance(document.getElementById("chatListTab") as HTMLElement)?.show()
}

function showActionsTab() {
    Bootstrap.Tab.getInstance(document.getElementById("browserActionsTab") as HTMLElement)?.show()
}

function showSettingsTab() {
    Bootstrap.Tab.getInstance(document.getElementById("settingsTab") as HTMLElement)?.show()
}

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

populatePersonasList();


function createMessageCard(messageType: ChatMessageType) {
    const card = document.createElement('div');
    card.className = `card mb-3 message-${messageType === "user" ? "user" : "model"}`;
    const regenerateButtonHTML = (
        messageType === "model"
            ? `<button class="btn btn-sm btn-outline-secondary regenerate-message" aria-label="Regenerate message"><i class="bi bi-arrow-clockwise"></i></button>`
            : ""
    );
    card.innerHTML = `<div class="card-header"><span>${messageType === "user" ? "User" : "Model"}</span><div class="header-buttons">
${regenerateButtonHTML}<button class="btn btn-sm btn-outline-secondary edit-message-text"><i class="bi bi-pencil-square"></i></button>
</div></div><div class="card-body"></div>`;

    card.style.setProperty("opacity", "0");
    card.style.setProperty("transition", "opacity 0.5s");
    currentChatSettingsCard.style.setProperty("display", "none");
    chatArea.appendChild(card);
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

function playPython(code: string, outputElement: HTMLElement) {
    outputElement.style.setProperty("display", "");
    outputElement.innerHTML = '<div class="dot-pulse"></div><pre class="rounded-2 p-3 mb-0 hljs"><code class="hljs"></code></pre>';
    const codeResultElement = outputElement.querySelector("code") as HTMLElement;

    const sandbox = document.getElementById("sandbox") as HTMLIFrameElement;
    const requestId = (crypto.getRandomValues(new Uint32Array(1)).toString()).toString();

    const resultMessageHandler = (event: MessageEvent) => {
        if(event.data.action !== extensionActions.sandboxedTaskResultsUpdate || event.data.requestId !== requestId)
            return;
        const result = event.data as SandboxedTaskResult;
        codeResultElement.textContent = result.result.stdout;
        if (result.isFinal) {
            window.removeEventListener("message", resultMessageHandler);
            outputElement.querySelector(".dot-pulse")?.remove();
        }
    };
    window.addEventListener("message", resultMessageHandler);

    sandbox.contentWindow?.postMessage({
        action: extensionActions.runInSandbox,
        taskType: "python",
        taskParams: {
            code: code,
        },
        requestId: requestId
    } as RunInSandboxRequest, "*");
}

function playMermaid(code: string, outputElement: HTMLElement) {
    outputElement.className = "rounded-2 p-3 mb-0 hljs";
    outputElement.style.setProperty("display", "");
    outputElement.style.setProperty("text-align", "center");
    outputElement.innerHTML = "";
    const tempElement = document.createElement("div");
    outputElement.appendChild(tempElement);
    tempElement.id = `mermaid-${(crypto.getRandomValues(new Uint32Array(1)).toString()).toString()}`;
    mermaid.initialize({
        startOnLoad: false,
        // suppressErrorRendering: true, – likely to be available in the next Mermaid version
        securityLevel: 'loose',
        theme: themeType === "light" ? "default" : "dark",
    });

    if(!mermaid.parse(code, { suppressErrors: true }))
        return;
    mermaid.render(tempElement.id, code).then((renderResult) => {
        outputElement.innerHTML = renderResult.svg;
    }).catch((e) => {
        outputElement.textContent = `Failed to render the diagram: ${e}`;
    });
}

function playVegaLite(code: string, outputElement: HTMLElement) {
    outputElement.className = "player-output rounded-2 p-3 mt-2 mb-0 hljs";
    outputElement.style.setProperty("display", "");
    outputElement.style.setProperty("text-align", "center");
    outputElement.innerHTML = "";
    // @ts-ignore
    window.vegaEmbed(outputElement, JSON.parse(code), {
        theme: themeType === "light" ? "ggplot2" : "dark",
        renderer: "svg",
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false,
        }
    });
}

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

function addBootstrapStyling(messageCardTextElement: HTMLElement) {
    Array.from(messageCardTextElement.querySelectorAll("p")).forEach(
        (element) => (element as HTMLParagraphElement).classList.add("card-text")
    );

    Array.from(messageCardTextElement.querySelectorAll("table")).forEach(
        (element) => (element as HTMLTableElement).classList.add("table")
    );

    ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((header) =>
        Array.from(messageCardTextElement.querySelectorAll(header)).forEach(
            (element) => (element as HTMLTableElement).classList.add(header)
        )
    );
}



function sendMessageToChat(chat: ChatSession){
    let message = mainChatUserInputTextArea.value.trim();
    const userMessageCard = createMessageCard("user");
    const cardBody = userMessageCard.querySelector('.card-body') as HTMLElement;
    activateEditMessageTextButton(userMessageCard, message);

    cardBody.innerHTML = markdownRenderer.render(message);
    addBootstrapStyling(cardBody);

    mainChatUserInputTextArea.value = '';
    mainChatUserInputTextArea.dispatchEvent(new Event('input'));
    const llmMessageCardElement = createMessageCard("model");
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


// chrome.storage.session.onChanged.addListener((changes) => {
//     const llmMessageChange = changes["llmMessage"];
//
//     if (!llmMessageChange) {
//         return;
//     }
//
//     updateLlmMessage(llmMessageChange.newValue);
// });

function updateInputArea() {
    mainChatUserInputTextArea.style.setProperty("height", "auto");
    const newHeight = Math.min(mainChatUserInputTextArea.scrollHeight, 183);
    mainChatUserInputTextArea.style.setProperty("height", `${newHeight}px`);
    mainChatUserInputTextArea.style.setProperty("overflow-y", mainChatUserInputTextArea.scrollHeight > 180 ? 'auto' : 'hidden');
    chatArea.style.setProperty("height", `calc(100vh - ${73 + newHeight}px)`);
}

function makeUserInputAreaAutoexpandable() {
    mainChatUserInputTextArea.addEventListener('input', updateInputArea);
    updateInputArea();
}


document.addEventListener("DOMContentLoaded", async () => {
    const form = document.querySelector('.a10fy-input-area form') as HTMLFormElement;
    const chat = await getGeminiChat();

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessageToChat(chat);
        return false;
    })

    form.addEventListener('keydown', (event) => {
        if(event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            sendMessageToChat(chat);
        }
    });

    makeUserInputAreaAutoexpandable();

    // chrome.storage.session.get(["llmMessage"]).then((result) => {
    //     if (result) {
    //         updateLlmMessage(result["llmMessage"]);
    //     }
    // });
});

function addImageIcon(src: any) {
    const iconsContainer = document.querySelector(".a10fy-input-area-icons") as HTMLDivElement;
    const iconContainer = document.createElement("div");
    iconContainer.className = "icon";
    const img = document.createElement("img");
    img.src = src;
    iconContainer.appendChild(img);
    iconsContainer.appendChild(iconContainer);
}

function addAudioIcon() {
    const iconsContainer = document.querySelector(".a10fy-input-area-icons") as HTMLDivElement;
    const iconContainer = document.createElement("div");
    iconContainer.className = "icon";
    const icon = document.createElement("i");
    icon.classList.add("bi", "bi-file-earmark-music");
    iconContainer.appendChild(icon);
    iconsContainer.appendChild(iconContainer);
}

async function processItemsAddedToInputChat(transferredData: DataTransfer, processClipboard=true, detectOnly=false) {
    if(processClipboard) {
        const modalDialog = new Bootstrap.Modal(document.getElementById("pasteFormatChoiceModal") as HTMLDivElement);
        modalDialog.show();
    }

    const files = transferredData.files;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image"));
    const audioFiles = Array.from(files).filter((file) => file.type.startsWith("audio"));
    if (audioFiles.length > 0) {
        if(detectOnly)
            return true;
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            const reader = new FileReader();
            reader.onload = function () {
                if(reader.result)
                    addAudioIcon();
            };
            reader.readAsDataURL(file);
        }
    }

    const items = processClipboard ? (await navigator.clipboard.read()) : [];

    const richTextItems = items.filter((item) => item.types.includes("text/html"));
    let clipboardText = "";

    if (richTextItems.length > 0) {
        if(detectOnly)
            return true;
        const text = await richTextItems[0].getType("text/html");
        clipboardText = turndownService.turndown(await text.text());
    }
    else {
        const plainTextItems = items.filter((item) => item.types.includes("text/plain"));
        if (plainTextItems.length > 0) {
            if(detectOnly)
                return true;
            const text = await plainTextItems[0].getType("text/plain");
            clipboardText = await text.text();
        }
    }
    if(clipboardText) {
        if (mainChatUserInputTextArea.selectionStart || mainChatUserInputTextArea.selectionStart == 0) {
            let startPos = mainChatUserInputTextArea.selectionStart;
            let endPos = mainChatUserInputTextArea.selectionEnd;
            mainChatUserInputTextArea.value = mainChatUserInputTextArea.value.substring(0, startPos)
                + clipboardText
                + mainChatUserInputTextArea.value.substring(endPos, mainChatUserInputTextArea.value.length);
            updateInputArea();
        } else {
            mainChatUserInputTextArea.value += clipboardText;
            updateInputArea();
        }
        return;
    }

    const imageItems = items.filter((item) => item.types.filter(type => type.startsWith("image")).length > 0);
    if (imageItems.length > 0) {
        if(detectOnly)
            return true;
        imageItems.forEach((item) => {
            for (let type of item.types) {
                if (type.startsWith('image')) {
                    item.getType(type).then((blob) => {
                        addImageIcon(URL.createObjectURL(blob));
                    })
                }
            }
        });
    }
    else {
        imageFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = function () {
                if(reader.result)
                    addImageIcon(reader.result);
            };
            reader.readAsDataURL(file);
        })
    }
    if(detectOnly)
        return false;
}

mainChatUserInputTextArea.onpaste = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if(event.clipboardData)
        processItemsAddedToInputChat(event.clipboardData).catch();
}


const inputArea = document.querySelector(".a10fy-input-area") as HTMLDivElement;

inputArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    inputArea.classList.add("droppable");
    inputArea.setAttribute("style", `
    background-image: 
        radial-gradient(circle at center center, #444cf755, #e5e5f755), 
        repeating-radial-gradient(circle at center center, #444cf755, #444cf755, transparent 20px, transparent 10px);
    background-blend-mode: multiply;
    `);

    if(event.dataTransfer)
        processItemsAddedToInputChat(event.dataTransfer, false, true).then((isCompatibleData) => {
            if (isCompatibleData) {
                inputArea.classList.add("droppable")
            }
        });

});

inputArea.addEventListener("dragleave", (event) => {
    event.preventDefault();
    inputArea.classList.remove("droppable");
    inputArea.setAttribute("style", "");
});

inputArea.addEventListener("drop", (event) => {
    event.preventDefault();
    inputArea.classList.remove("droppable");
    inputArea.setAttribute("style", "");
    if (event.dataTransfer)
        processItemsAddedToInputChat(event.dataTransfer, false).catch();
});