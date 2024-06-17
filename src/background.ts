import {extensionActions, cssPrefix, UserRequest, TabDocumentInfo} from "./helpers/constants";
import {getInlineDataPart, getMainPromptParts} from "./helpers/promptParts";
import {setupOffscreenDocument} from "./helpers/setupOffscreenDocument";
import {asyncRequestAndParse} from "./helpers/geminiInterfacing";
import {llmGlobalActions} from "./helpers/llmGlobalActions";
import {llmPageActions} from "./helpers/llmPageActions";
import {GenerateContentRequest, Part} from "@google/generative-ai";


setupOffscreenDocument();

async function submitUserRequest(websiteData: TabDocumentInfo, userRequest: UserRequest, tab: chrome.tabs.Tab) {
    let requestParts: Part[] = [
        {
            text: "Here is a screenshot of a webpage that the user is currently on:"
        },
        getInlineDataPart(websiteData.screenshot),
        {
            text: (
                `The webpage URL is \`\`\`${websiteData.url}\`\`\`.\n` +
                `The simplified HTML of the webpage is as follows (with removed styles and scripts, and injected "${cssPrefix}..." classes for identifying the DOM elements): \n` +
                `\`\`\`\n\n\n${websiteData.html}\n\n\n\`\`\`\n`
            )
        },
        ...getMainPromptParts(userRequest)
    ];

    let requestData: GenerateContentRequest = {
        contents: [{
            role: "user",
            parts: requestParts
        }]
    }

    await asyncRequestAndParse(requestData, ["$.actionList.*"], ({value, key, parent, stack}) => {
        console.log(key, parent, stack, value);
        let elementIndex, actionName, actionParams;
        if (value instanceof Array && value.length === 2)
            [actionName, elementIndex] = value;
        else if(value instanceof Array && value.length === 3)
            [actionName, elementIndex, actionParams] = value;
        else
            return;

        if (llmPageActions.hasOwnProperty(actionName as string) && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                action: extensionActions.executePageAction,
                elementIndex: elementIndex,
                actionName: actionName,
                actionParams: actionParams
            })
        }
        else if (llmGlobalActions.hasOwnProperty(actionName as string)) {
            llmGlobalActions[actionName as string].execute(elementIndex as number|null, actionParams, tab)
        } else {
            console.error(`Unknown actionName: ${actionName}`);
        }
    });
}

chrome.runtime.onMessage.addListener(
    async function (request, sender) {
        if (!sender.tab && request.action === extensionActions.processUserAudioQuery && request.audio) {
            const [tab] = await chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            });
            const tabDocumentInfo = await getTabDocumentInfo(tab);
            await submitUserRequest(tabDocumentInfo, {audio: request.audio}, tab);
        }
    }
);

async function getTabDocumentInfo(tab: chrome.tabs.Tab) {
    if (!tab.id)
        return {};

    const tabScreenshot = await chrome.tabs.captureVisibleTab(
        {
            "format": "jpeg",
            "quality": 40
        }
    );

    const tabDocumentInfo: TabDocumentInfo = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.getDocumentInfo});
    tabDocumentInfo.screenshot = tabScreenshot;
    return tabDocumentInfo;
}

async function textBasedCommandOnPage() {
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });

    // @ts-ignore
    // noinspection JSVoidFunctionReturnValueUsed
    const query = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.getUserQuery}) as string|null;
    if (query !== null && query !== "") {
        const tabDocumentInfo = await getTabDocumentInfo(tab);
        await submitUserRequest(tabDocumentInfo, {text: query}, tab);
    }
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "analysePage")
        return textBasedCommandOnPage();
    if (command === "voiceCommandRecord") {
        await setupOffscreenDocument();
        chrome.tts.stop();
        await chrome.runtime.sendMessage({action: extensionActions.startAudioCapture});
        return;
    }
    if (command === "voiceCommandExecute") {
        await setupOffscreenDocument();
        await chrome.runtime.sendMessage({action: extensionActions.stopAudioCapture});
    }
    if (command === "showWelcomeScreen") {
        await chrome.tabs.create({
            url: chrome.runtime.getURL("settings.html"),
            active: true
        })
    }
});


// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).finally();


chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason.search(/install/g) === -1)
        return;
    await chrome.tabs.create({
        url: chrome.runtime.getURL("settings.html"),
        active: true
    })
})
