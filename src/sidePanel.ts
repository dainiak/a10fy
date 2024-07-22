import {initializeChatListTable} from "./helpers/sidePanel/chatList";
import {
    sendUserMessageToChat,
    updateCurrentChatDraftContent
} from "./helpers/sidePanel/messages";
import {
    chatInputFormElement,
    chatPaneInputTextArea,
    makeUserInputAreaAutoexpandable,
    showChatTab,
    themeType
} from "./helpers/sidePanel/htmlElements";
import {setInputAreaAttachmentEventListeners} from "./helpers/sidePanel/attachments";
import {loadChatAsCurrent, startNewChat,} from "./helpers/sidePanel/chatPane";
import {ChatMessageTypes, deleteChat} from "./helpers/sidePanel/chatStorage";
import {ExecuteCustomActionInSidePanelRequest, extensionActions, storageKeys} from "./helpers/constants";
import {getFromStorage, setToStorage} from "./helpers/storageHandling";
import {SerializedCustomAction, SerializedCustomCodePlayer, SerializedModel} from "./helpers/settings/dataModels";
import { Liquid } from 'liquidjs';
import {getModelForCustomAction} from "./helpers/geminiInterfacing";
import {getInlineDataPart} from "./helpers/promptParts";
import {Part} from "@google/generative-ai";
import {customPlayerFactory} from "./helpers/players/custom";
const liquidEngine = new Liquid();

async function loadChatToChatPane(chatId: string) {
    showChatTab();
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

    (document.getElementById("newChatButton") as HTMLButtonElement).addEventListener("click", async () => {
        startNewChat();
        showChatTab();
    });

    (document.getElementById("openSettingsPageButton") as HTMLButtonElement).addEventListener("click", async () => {
        await chrome.runtime.openOptionsPage();
    })

    initializeChatListTable(loadChatToChatPane, (chatId) => deleteChat(chatId)).catch();
    makeUserInputAreaAutoexpandable();
    setInputAreaAttachmentEventListeners();
});

chrome.runtime.onMessage.addListener(async (request, sender) => {
    if(sender.tab)
        return;
    if(request.action === extensionActions.executeCustomActionInSidePanel) {
        const executeCustomActionRequest = request as ExecuteCustomActionInSidePanelRequest;
        const action: SerializedCustomAction = (await getFromStorage(storageKeys.customActions) || []).find((action: SerializedCustomAction) => action.id === executeCustomActionRequest.actionId);
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

        const context = executeCustomActionRequest.context;
        if(systemInstruction) {
            const liquidScope = {
                "element": {
                    "innerHTML": context.elementHTML, // TODO: implement
                    "outerHTML": context.elementHTML, // TODO: implement
                    "textContent": context.elementText
                },
                "document": {
                    "body": context.documentHTML,
                    "title": context.elementHTML  // TODO: Change to document title
                },
                "selection": {
                    "text": context.selectionText
                }
            };
            const systemInstructionTemplate = liquidEngine.parse(systemInstruction);
            const renderedSystemInstruction = await liquidEngine.render(systemInstructionTemplate, liquidScope);
            const geminiModel = await getModelForCustomAction(model, renderedSystemInstruction, action.jsonMode);
            const messageTemplate = liquidEngine.parse(action.messageTemplate);
            const renderedMessage = await liquidEngine.render(messageTemplate, liquidScope);
            const parts: Part[] = [{text: renderedMessage}];
            if(action.context.pageSnapshot && context.pageSnapshot) {
                parts.push(getInlineDataPart(context.pageSnapshot));
            }
            if(action.context.elementSnapshot && context.elementSnapshot) {
                parts.push(getInlineDataPart(context.elementSnapshot));
            }
            const modelRunResult = await geminiModel.generateContent({
                contents: [{
                    role: "user",
                    parts: parts
                }]
            });
            const resultText = modelRunResult.response.text();
            if(!player) {
                // show resultText in the output panel

            } else {
                const executePlayer = customPlayerFactory(player.customCSS, player.customJS, player.customHTML);
                executePlayer()
            }

        }

    }
});