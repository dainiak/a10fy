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
    ImageModificationResult,
    storageKeys,
    DataForCustomActionRequest,
    DataForCustomActionResult,
    CustomActionContext,
    ExecuteCustomActionInSidePanelRequest
} from "./helpers/constants";
import {getInlineDataPart, getMainPromptParts} from "./helpers/promptParts";
import {setupOffscreenDocument} from "./helpers/setupOffscreenDocument";
import {asyncRequestAndParse} from "./helpers/geminiInterfacing";
import {llmGlobalActions} from "./helpers/llmGlobalActions";
import {llmPageActions} from "./helpers/llmPageActions";
import {GenerateContentRequest, Part} from "@google/generative-ai";
import {getFromStorage} from "./helpers/storageHandling";
import {SerializedCustomAction} from "./helpers/settings/dataModels";

setupOffscreenDocument().catch();
rebuildContextMenus().catch();

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

async function textBasedCommandOnPage() {
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });

    // @ts-ignore
    const response: PromptUserResult = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.promptUser} as PromptUserRequest);
    if (response.userResponse !== null && response.userResponse !== "") {
        const tabDocumentInfo = await getTabDocumentInfo(tab);
        await submitUserRequest(tabDocumentInfo, {text: response.userResponse}, tab);
    }
}

async function rebuildContextMenus() {
    await chrome.contextMenus.removeAll();
    const actions = await getFromStorage(storageKeys.customActions) as SerializedCustomAction[];
    const createdParentItems = new Set<string>();
    for (const action of actions) {
        if(action.pathInContextMenu) {
            let [parentItem, menuItem] = action.pathInContextMenu.split("/").map(s => s.trim()) as (string | undefined)[];
            if (!menuItem) {
                menuItem = parentItem;
                parentItem = undefined;
            }
            if (parentItem && !createdParentItems.has(parentItem)) {
                chrome.contextMenus.create({
                    id: parentItem,
                    title: parentItem,
                    contexts: ["all"],
                    visible: false
                });
                createdParentItems.add(parentItem);
            }
            chrome.contextMenus.create({
                id: action.id,
                title: menuItem,
                contexts: [action.selectedTextRegExp ? "selection" : "all"],
                visible: false
            });
        }
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

// chrome.contextMenus.removeAll();
//     chrome.contextMenus.update(
//     "dsf",
//     {
//         visible:
//     }
// )
//
// chrome.contextMenus.create({
//     title: "A test menu parent item 1",
//     id: "testParentItem",
//     contexts:["selection", "image", "page"]
// });
//
// chrome.contextMenus.create({
//     title: "A test menu parent item 2",
//     id: "testParentItem2",
//     contexts:["selection", "image", "page"]
// });
//
// chrome.contextMenus.create({
//     title: "A test menu item",
//     id: "testMenuItem",
//     contexts:["selection", "image", "page"],
//     parentId: "testParentItem"
// });

chrome.contextMenus.onClicked.addListener(async (info) => {
    const action = (await getFromStorage(storageKeys.customActions) || []).find((a: SerializedCustomAction) => a.id === info.menuItemId) as SerializedCustomAction;
    if(!action) {
        return;
    }

    const data = await chrome.runtime.sendMessage({action: extensionActions.requestDataForCustomAction, actionId: info.menuItemId} as DataForCustomActionRequest) as DataForCustomActionResult;
    const context: CustomActionContext = {
        ...data
    };
    if(action.context.pageSnapshot || action.context.elementSnapshot && data) {
        const tabScreenshot = await chrome.tabs.captureVisibleTab({"format": "png"});
        if(action.context.pageSnapshot) {
            context.pageSnapshot = tabScreenshot;
        }
        if(action.context.elementSnapshot && data.elementBoundingRect) {
            await setupOffscreenDocument();
            const imageModificationResult: ImageModificationResult = await chrome.runtime.sendMessage({
                action: extensionActions.modifyImage,
                modification: "crop",
                image: tabScreenshot,
                parameters: {
                    x: data.elementBoundingRect?.x,
                    y: data.elementBoundingRect?.y,
                    width: data.elementBoundingRect?.width,
                    height: data.elementBoundingRect?.height,
                    viewportWidth: data.viewportRect?.width,
                    viewportHeight: data.viewportRect?.height
                },
                output: {
                    format: "jpeg",
                    quality: 50
                }
            } as ExtensionMessageImageModificationRequest);
            if(imageModificationResult.image)
                context.elementSnapshot = imageModificationResult.image;
        }
    }
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const window = await chrome.windows.getLastFocused();
    //@ts-ignore
    chrome.sidePanel.open({tabId: tab.id, windowId: window.id}, () => {
        chrome.runtime.sendMessage({
            action: extensionActions.executeCustomActionInSidePanel,
            actionId: action.id,
            context: context,
        } as ExecuteCustomActionInSidePanelRequest);
    });
});

chrome.runtime.onMessage.addListener(async (request: ExtensionMessageRequest) => {
    if (request.action === extensionActions.registerContextMenuEvent) {
        const menuEventRequest = request as RegisterContextMenuEventRequest;
        const availableCustomActions = (await getFromStorage(storageKeys.customActions) || []).filter((a: SerializedCustomAction) => menuEventRequest.availableCustomActions.includes(a.id)) as SerializedCustomAction[];
        for (const action of availableCustomActions) {
            let [parentItem, menuItem] = action.pathInContextMenu.split("/").map(s => s.trim()) as (string | undefined)[];
            if (!menuItem) {
                menuItem = parentItem;
                parentItem = undefined;
            }
            if(parentItem)
                chrome.contextMenus.update(
                    parentItem,
                    {
                        visible: true
                    }
                );
            chrome.contextMenus.update(
                action.id,
                {
                    visible: true
                }
            );
        }



        // console.log(result);
    } else if (request.action === extensionActions.rebuildContextMenus) {
        await rebuildContextMenus();
    }
});