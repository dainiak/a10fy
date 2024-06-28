import markdownit, {StateInline} from "markdown-it";
import hljs from "highlight.js";
import {hljsDarkStyleContent, hljsLightStyleContent} from "./helpers/styleStrings";
import {getGeminiChat} from "./helpers/geminiInterfacing";
import {ChatSession} from "@google/generative-ai";
import katex from "katex";
import {loadPyodide, version as pyodideVersion} from "pyodide";
import {createCodeMirror, EditorView} from "./helpers/codeMirror";
import mermaid from "mermaid";

const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;
const themeType: ("dark" | "light") = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

hljsStyle.textContent = themeType === "dark" ? hljsDarkStyleContent : hljsLightStyleContent;

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
        if (lang && hljs.getLanguage(hljsLang)) {
            try {
                return `<pre class="rounded-2 p-3 hljs language-${lang} code-block"><code>` +
                    hljs.highlight(str, { language: hljsLang, ignoreIllegals: true }).value +
                    '</code></pre>';
            } catch (__) {}
        }

        return `<pre class="rounded-2 p-3 hljs language-${lang} code-block"><code class="hljs">` + markdownRenderer.utils.escapeHtml(str) + '</code></pre>';
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
                const renderedContent = katex.renderToString(
                    state.src.slice(contentStartPos, rightDelimiterPos),
                    {
                        throwOnError: true,
                        strict: false,
                        output: 'htmlAndMathml',
                        displayMode: isDisplay,
                    }
                );
                state.push('html_inline', '', 0).content = renderedContent;
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

function createMessageCard(messageType: ChatMessageType) {
    const chatArea = document.querySelector('.chat-area') as HTMLDivElement;
    const card = document.createElement('div');
    card.className = `card mb-3 message-${messageType === "user" ? "user" : "model"}`;
    const regenerateButtonHTML = messageType === "model" ? `<button class="btn btn-sm btn-outline-secondary regenerate-message" aria-label="Regenerate message"><i class="bi bi-arrow-clockwise"></i></button>` : "";
    card.innerHTML = `
<div class="card-header"><span>${messageType === "user" ? "User" : "Model"}</span><div class="header-buttons">
${regenerateButtonHTML}
<button class="btn btn-sm btn-outline-secondary edit-message-text"><i class="bi bi-pencil-square"></i></button>
</div></div><div class="card-body"></div>`;


    chatArea.appendChild(card);
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
    codeCard.innerHTML = `<div class="card-header">
                        <span>${heading}</span>
                        <div class="header-buttons">
                            <button class="btn btn-sm btn-outline-secondary toggle-code"><i class="bi bi-code"></i></button>
                            <button class="btn btn-sm btn-outline-secondary run-code"><i class="bi bi-play-fill"></i></button>
                        </div>
                    </div>
                    ${preElement.outerHTML}
                    <div class="player-output mt-2"></div>`;

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
    outputElement.innerHTML = '<pre class="rounded-2 p-3 mb-0 hljs"><code class="hljs"></code></pre>';
    const pyodideOutputElement = outputElement.querySelector("code") as HTMLElement;
    pyodideOutputElement.textContent = `Loading Python 3.12.1 interpreter (Pyodide ${pyodideVersion})...`;
    loadPyodide({
        stdout: (text) => {
            pyodideOutputElement.textContent += text + "\n";
        },
        stderr: (text) => {
            pyodideOutputElement.textContent += text + "\n";
        }
    }).then((pyodide) => {
        pyodideOutputElement.textContent += "done.\n";
        try {
            pyodide.runPython(code);
        } catch (e) {
            if (pyodideOutputElement.textContent)
                pyodideOutputElement.textContent += `\n${e}`;
        }
    }).catch((e) => {
        pyodideOutputElement.textContent += `failed due to error:\n${e}`;
    });
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
        securityLevel: 'loose',
        theme: themeType === "light" ? "default" : "dark",
    });
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
    const textarea = document.querySelector('.input-area textarea') as HTMLTextAreaElement;

    let message = textarea.value.trim();
    const userMessageCard = createMessageCard("user");
    const cardBody = userMessageCard.querySelector('.card-body') as HTMLElement;
    activateEditMessageTextButton(userMessageCard, message);

    cardBody.innerHTML = markdownRenderer.render(message);
    addBootstrapStyling(cardBody);

    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));

    chat.sendMessageStream(message).then(async (result) => {
        const llmMessageCardElement = createMessageCard("model");
        const llmMessageCardTextElement = llmMessageCardElement.querySelector('.card-body') as HTMLElement;
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

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.querySelector('.input-area form') as HTMLFormElement;
    const chat = await getGeminiChat();

    console.log(chat);
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

    // chrome.storage.session.get(["llmMessage"]).then((result) => {
    //     if (result) {
    //         updateLlmMessage(result["llmMessage"]);
    //     }
    // });
});
