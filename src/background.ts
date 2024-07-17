import {
    extensionActions,
    cssPrefix,
    UserRequest,
    TabDocumentInfo,
    ExtensionMessageImageModificationRequest,
    ExtensionMessageRequest,
    RegisterContextMenuEventRequest,
    PromptUserRequest,
    PromptUserResult,
    AudioRecordingResult,
    ImageModificationResult
} from "./helpers/constants";
import {getInlineDataPart, getMainPromptParts} from "./helpers/promptParts";
import {setupOffscreenDocument} from "./helpers/setupOffscreenDocument";
import {asyncRequestAndParse} from "./helpers/geminiInterfacing";
import {llmGlobalActions} from "./helpers/llmGlobalActions";
import {llmPageActions} from "./helpers/llmPageActions";
import {GenerateContentRequest, Part} from "@google/generative-ai";

setupOffscreenDocument().catch();

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
            } as ExtensionMessageRequest)
        }
        else if (llmGlobalActions.hasOwnProperty(actionName as string)) {
            llmGlobalActions[actionName as string].execute(elementIndex as number|null, actionParams, tab)
        } else {
            console.error(`Unknown actionName: ${actionName}`);
        }
    });
}

async function getTabDocumentInfo(tab: chrome.tabs.Tab) {
    if (!tab.id)
        return {};

    const tabScreenshot = await chrome.tabs.captureVisibleTab(
        {
            "format": "jpeg",
            "quality": 40
        }
    );

    const tabDocumentInfo: TabDocumentInfo = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.getDocumentInfo} as ExtensionMessageRequest);
    tabDocumentInfo.screenshot = tabScreenshot;
    return tabDocumentInfo;
}

// async function getTabElementScreenshot(tab: chrome.tabs.Tab, elementIndex: number) {
//     if (!tab.id)
//         return null;
//
//     const tabScreenshot = await chrome.tabs.captureVisibleTab(
//         {"format": "png"}
//     );
//
//     const elementInfo:  = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.getDomElementProperties});
// }


async function textBasedCommandOnPage() {
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });

    // @ts-ignore
    // noinspection JSVoidFunctionReturnValueUsed
    const response: PromptUserResult = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.promptUser} as PromptUserRequest);
    if (response.userResponse !== null && response.userResponse !== "") {
        const tabDocumentInfo = await getTabDocumentInfo(tab);
        await submitUserRequest(tabDocumentInfo, {text: response.userResponse}, tab);
    }
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "analysePage")
        return textBasedCommandOnPage();
    if (command === "voiceCommandRecord") {
        await setupOffscreenDocument();
        chrome.tts.stop();
        chrome.runtime.sendMessage({action: extensionActions.startAudioCapture} as ExtensionMessageRequest).then(
            async (response: AudioRecordingResult) => {
                if (response.audio) {
                    const [tab] = await chrome.tabs.query({
                        active: true,
                        lastFocusedWindow: true
                    });
                    const tabDocumentInfo = await getTabDocumentInfo(tab);
                    await submitUserRequest(tabDocumentInfo, {audio: response.audio}, tab);
                }
            }

        );
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
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        await chrome.tabs.create({
            url: chrome.runtime.getURL("settings.html"),
            active: true
        })
    }
});

chrome.contextMenus.create({
    title: "A test menu parent item 1",
    id: "testParentItem",
    contexts:["selection", "image", "page"]
});

chrome.contextMenus.create({
    title: "A test menu parent item 2",
    id: "testParentItem2",
    contexts:["selection", "image", "page"]
});

chrome.contextMenus.create({
    title: "A test menu item",
    id: "testMenuItem",
    contexts:["selection", "image", "page"],
    parentId: "testParentItem"
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.selectionText) {
        console.log(info.selectionText);
    }
    else if (info.srcUrl && info.mediaType === "image" && tab?.id) {

    }
});

chrome.runtime.onMessage.addListener(async (request: ExtensionMessageRequest, sender, sendResponse) => {
    if (request.action === extensionActions.registerContextMenuEvent) {
        const menuEventRequest = request as RegisterContextMenuEventRequest;
        const tabScreenshot = await chrome.tabs.captureVisibleTab({"format": "png"});
        // console.log(tabScreenshot);
        // console.log(request.boundingRect);
        await setupOffscreenDocument();
        const result: ImageModificationResult = await chrome.runtime.sendMessage({
            action: extensionActions.modifyImage,
            modification: "crop",
            image: tabScreenshot,
            parameters: {
                x: menuEventRequest.boundingRect.x,
                y: menuEventRequest.boundingRect.y,
                width: menuEventRequest.boundingRect.width,
                height: menuEventRequest.boundingRect.height,
                viewportWidth: menuEventRequest.viewportRect.width,
                viewportHeight: menuEventRequest.viewportRect.height
            },
            output: {
                format: "jpeg",
                quality: 40
            }
        } as ExtensionMessageImageModificationRequest);
        console.log(result);
    }
});