import markdownit, {StateInline} from "markdown-it";
import hljs from "highlight.js";
import {hljsDarkStyleContent} from "./helpers/styleStrings";
import {getGeminiChat} from "./helpers/geminiInterfacing";
import {ChatSession} from "@google/generative-ai";
import katex from "katex";
import {loadPyodide, version as pyodidePythonVersion} from "pyodide";

const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;
hljsStyle.textContent = hljsDarkStyleContent;

const markdownRenderer: any  = markdownit({
    html:         false,
    xhtmlOut:     false,
    breaks:       false,
    langPrefix:   "language-",
    linkify:      true,
    typographer:  true,
    quotes: `“”‘’`,
    highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="rounded-2 p-3 mb-0 hljs ${lang}"><code>` +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>';
            } catch (__) {}
        }

        return '<pre class="rounded-2 p-3 mb-0 hljs"><code class="hljs">' + markdownRenderer.utils.escapeHtml(str) + '</code></pre>';
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

function createMessageCard(className: string){
    const chatArea = document.querySelector('.chat-area') as HTMLDivElement;
    const card = document.createElement('div');
    card.className = `card mb-3 message-${className}`;
    card.innerHTML = `
            <div class="card-header">${className === "user" ? "User" : "Model"}</div>
            <div class="card-body">
            </div>
        `;
    chatArea.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth' });
    return card.querySelector('.card-body') as HTMLDivElement;
}

function sendMessageToChat(chat: ChatSession){
    const textarea = document.querySelector('.input-area textarea') as HTMLTextAreaElement;

    const message = textarea.value.trim();
    const userMessageCard = createMessageCard("user");
    userMessageCard.textContent = message;
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));

    chat.sendMessageStream(message).then(async (result) => {
        const cardText = createMessageCard("model");
        let completeText = "";

        for await (const chunk of result.stream) {
            const text = chunk.text();
            completeText += text;
            cardText.innerHTML = markdownRenderer.render(completeText);
        }

        Array.from(cardText.querySelectorAll("p")).forEach(
            (element) => (element as HTMLParagraphElement).classList.add("card-text")
        );

        Array.from(cardText.querySelectorAll("table")).forEach(
            (element) => (element as HTMLTableElement).classList.add("table")
        );

        ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((header) =>
            Array.from(cardText.querySelectorAll(header)).forEach(
                (element) => (element as HTMLTableElement).classList.add(header)
            )
        );

        Array.from(cardText.querySelectorAll("pre.hljs.python")).forEach(
            (pythonCodePreElement) => {
                pythonCodePreElement.classList.add("card-body");
                const pythonCodeCard = document.createElement("div");
                pythonCodeCard.className = "card mb-3 message-model";
                pythonCodeCard.innerHTML = `<div class="card-header">
                        <span>Python code</span>
                        <div class="header-buttons">
                            <button class="btn btn-sm btn-outline-secondary run-code"><i class="bi bi-play-fill"></i></button>
                            <button class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-clockwise"></i></button>
                        </div>
                    </div>
                    ${pythonCodePreElement.outerHTML}`;

                pythonCodePreElement.replaceWith(pythonCodeCard);
                pythonCodePreElement = pythonCodeCard.querySelector("pre") as HTMLPreElement;

                const code = pythonCodePreElement.textContent || "";
                const runCodeButton = pythonCodeCard.querySelector(".run-code") as HTMLButtonElement;

                (runCodeButton as HTMLButtonElement).addEventListener("click", async () => {
                    const outputElement = document.createElement("div") as HTMLDivElement;
                    outputElement.innerHTML = '<pre class="rounded-2 p-3 mt-2 mb-0 hljs"><code class="hljs"></code></pre>';
                    const pyodideOutputElement = outputElement.querySelector("code") as HTMLElement;
                    pythonCodePreElement.after(outputElement);
                    pyodideOutputElement.textContent = `Loading Python ${pyodidePythonVersion} interpreter (Pyodide 0.26.1)...`;
                    loadPyodide({
                        stdout: (text) => {pyodideOutputElement.textContent += text + "\n";},
                        stderr: (text) => {pyodideOutputElement.textContent += text + "\n";}
                    }).then((pyodide) => {
                        pyodideOutputElement.textContent += "done.\n";
                        try {
                            pyodide.runPython(code);
                        }
                        catch (e) {
                            if(pyodideOutputElement.textContent)
                                pyodideOutputElement.textContent += `\n${e}`;
                        }
                    }).catch((e) => {
                        pyodideOutputElement.textContent += `failed due to error:\n${e}`;
                    });
                });
            }
        );
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

function updateLlmMessage(message: string) {
    if (!message)
        return;
    const llmMessageContainer = document.getElementById("llmMessageContainer") as HTMLDivElement;
    llmMessageContainer.innerHTML = message;
}
