import {initializeChatListTable} from "./helpers/sidePanel/chatList";
import {
    getCurrentChatId,
    sendUserMessageToChat,
    updateCurrentChatDraftContent
} from "./helpers/sidePanel/messages";
import {
    actionResultsContainer,
    chatInputFormElement,
    chatPaneInputTextArea,
    makeUserInputAreaAutoexpandable, showActionsPane,
    showChatPane,
    themeType
} from "./helpers/sidePanel/htmlElements";
import {setInputAreaAttachmentEventListeners} from "./helpers/sidePanel/attachments";
import {loadChatAsCurrent, startNewChat,} from "./helpers/sidePanel/chatPane";
import {deleteChat} from "./helpers/storage/chatStorage";
import {
    ExecuteCustomActionInSidePanelRequest,
    extensionMessageGoals,
    ExtensionMessageRequest,
    storageKeys
} from "./helpers/constants";
import {getFromStorage, setToStorage} from "./helpers/storage/storageHandling";
import {
    CustomActionResultsPresentation,
    SerializedCustomAction,
    SerializedCustomCodePlayer,
    SerializedModel
} from "./helpers/settings/dataModels";
import {liquidEngine} from "./helpers/sidePanel/liquid";
import {getModelForCustomAction} from "./helpers/geminiInterfacing";
import {getInlineDataPart} from "./helpers/promptParts";
import {Part} from "@google/generative-ai";
import {customPlayerFactory} from "./helpers/players/custom";
import {markdownRenderer} from "./helpers/sidePanel/markdown";
import {CustomActionSystemInstructionLiquidScope} from "./helpers/prompts";
import {initializePageListTable} from "./helpers/sidePanel/pageList";




async function loadChatToChatPane(chatId: string) {
    showChatPane();
    await loadChatAsCurrent(chatId);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',({ matches }) => {
    document.body.setAttribute("data-bs-theme", matches ? "dark" : "light");
});

document.addEventListener("DOMContentLoaded", async () => {
    document.body.setAttribute("data-bs-theme", themeType);

    chatInputFormElement.addEventListener('submit', function(e) {
        e.preventDefault();
        sendUserMessageToChat();
        return false;
    })

    chatInputFormElement.addEventListener('keydown', (event) => {
        if(event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            sendUserMessageToChat();
        }
    });

    chatPaneInputTextArea.addEventListener("input", () => {
        updateCurrentChatDraftContent();
    });

    (document.getElementById("newChatButton") as HTMLButtonElement).onclick = async () => {
        startNewChat();
        showChatPane();
    };

    if(chrome && chrome.runtime) {
        (document.getElementById("openSettingsPageButton") as HTMLButtonElement).onclick = async () => {
            await chrome.runtime.openOptionsPage();
        }
    }
    else {
        const settingsPane = document.getElementById("settingsPane") as HTMLDivElement;
        const iframe = document.createElement("iframe");
        iframe.className = "border-0 py-0 px-0 my-0 mx-0";
        iframe.src = "settings.html";
        // iframe.width = "100%";
        // iframe.height = `${document.body.getBoundingClientRect().height - 40}px`;
        iframe.style.setProperty("width", "100vw")
        iframe.style.setProperty("height", "calc(100vh - 40px)");
        settingsPane.innerHTML = ``;
        settingsPane.appendChild(iframe);
    }

    initializeChatListTable(loadChatToChatPane, (chatId) => {
        deleteChat(chatId);
        if(getCurrentChatId() === chatId) {
            startNewChat();
        }
    }).catch();

    initializePageListTable().catch();

    makeUserInputAreaAutoexpandable();
    setInputAreaAttachmentEventListeners();
});

async function executeCustomAction(request: ExecuteCustomActionInSidePanelRequest){
    const action: SerializedCustomAction = (await getFromStorage(storageKeys.customActions) || []).find((action: SerializedCustomAction) => action.id === request.actionId);
    if(!action)
        return;
    const player: SerializedCustomCodePlayer | undefined = action.playerId ? (await getFromStorage(storageKeys.codePlayers) || []).find((player: SerializedCustomCodePlayer) => player.id === action.playerId) : null;
    if(player === undefined)
        return;

    const models = (await getFromStorage(storageKeys.models) || []) as SerializedModel[];
    let model: SerializedModel|undefined = models.find((model: SerializedModel) => model.id === action.modelId);
    if(!model) {
        model = models[0];
        action.modelId = model.id;
        await setToStorage(storageKeys.customActions, (await getFromStorage(storageKeys.customActions) || []).map((a: SerializedCustomAction) => a.id === action.id ? action : a));
    }
    const systemInstruction = action.systemInstructionTemplate.trim();
    if(!player && !systemInstruction)
        return;

    const context = request.context;
    if(systemInstruction) {
        const date = new Date();
        const liquidScope = {
            element: {
                innerHTML: context?.elementInnerHTML,
                outerHTML: context?.elementOuterHTML,
                innerText: context?.elementInnerText
            },
            document: {
                completeHTML: context?.documentCompleteHTML,
                simplifiedHTML: context?.documentSimplifiedHTML,
                title: context?.documentTitle,
                url: context?.documentURL
            },
            selection: {
                text: context?.selectionText,
                container: {
                    outerHTML: context?.selectionContainerOuterHTML,
                    innerText: context?.selectionContainerInnerText
                }
            },
            currentDate: {
                iso: date.toISOString(),
                date: date.toDateString(),
                year: date.getFullYear(),
                dayOfWeek: date.getDay(),
                dayOfWeekName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()]
            },
            model: {
                name: model?.name,
                description: model?.description
            },
            player: {
                name: player?.name,
                description: player?.description
            }
        } as CustomActionSystemInstructionLiquidScope;
        const renderedSystemInstruction = liquidEngine.parseAndRenderSync(systemInstruction, liquidScope);
        const geminiModel = await getModelForCustomAction(model, renderedSystemInstruction, action.jsonMode);
        const renderedMessage = liquidEngine.parseAndRenderSync(action.messageTemplate, liquidScope);
        const parts: Part[] = [{text: renderedMessage}];
        if(action.context.pageSnapshot && context.pageSnapshot) {
            parts.push(getInlineDataPart(context.pageSnapshot));
        }
        if(action.context.elementSnapshot && context.elementSnapshot) {
            parts.push(getInlineDataPart(context.elementSnapshot));
        }
        if(action.context.selectionSnapshot && context.selectionSnapshot) {
            parts.push(getInlineDataPart(context.selectionSnapshot));
        }

        actionResultsContainer.innerHTML = `
            <div class="d-flex justify-content-center">
                <div class="spinner-border" role="status"></div>
                <span class="sr-only">Calling LLM...</span>
            </div>
            `;

        if (action.resultsPresentation === CustomActionResultsPresentation.actionPane) {
            showActionsPane();
        }

        const modelRunResult = await geminiModel.generateContent({
            contents: [{
                role: "user",
                parts: parts
            }]
        });
        const resultText = modelRunResult.response.text();
        actionResultsContainer.innerHTML = `
            <div class="d-flex justify-content-center py-3">
                <div class="spinner-border" role="status"></div>
                <span class="sr-only">Loading results...</span>
            </div>
            `;
        if(!player) {
            if(action.resultsPresentation === CustomActionResultsPresentation.actionPane) {
                showActionsPane();
                actionResultsContainer.innerHTML = markdownRenderer.render(resultText);
            }
        } else {
            const executePlayer = customPlayerFactory(player.customCSS, player.customJS, player.customHTML);
            showActionsPane();
            if(action.jsonMode) {
                executePlayer("_json_call_", resultText, actionResultsContainer)
            } else {
                const blocks = resultText.split(/```/g);
                let languageTagFound = null;
                let codeFound = null;
                for(let i = 1; i < blocks.length; i += 2) {
                    const block = blocks[i].trim();
                    for(const languageTag of player.languageTags) {
                        if(block.startsWith(languageTag)) {
                            languageTagFound = languageTag;
                            codeFound = block.slice(languageTag.length).trim();
                            break;
                        }
                    }
                    if(languageTagFound)
                        break;
                }
                if(codeFound && languageTagFound) {
                    executePlayer(languageTagFound, codeFound, actionResultsContainer);
                }
            }
        }
    }
}

if(chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request: ExtensionMessageRequest, sender, sendResponse: Function) => {
        if (!sender.tab && request.messageGoal === extensionMessageGoals.executeCustomActionInSidePanel) {
            executeCustomAction(request as ExecuteCustomActionInSidePanelRequest).then(() => sendResponse(true)).catch(() => sendResponse(false));
        }
        return undefined;
    });

    chrome.storage.session.onChanged.addListener((changes) => {
        if(changes["llmMessage"]) {
            showActionsPane();
            actionResultsContainer.innerHTML = markdownRenderer.render(changes["llmMessage"].newValue);
        }
    });
}

if(!getCurrentChatId()) {
    startNewChat();
}