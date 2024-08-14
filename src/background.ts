import {
    extensionMessageGoals,
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
import {asyncRequestAndParseJSON} from "./helpers/geminiInterfacing";
import {llmGlobalActions} from "./helpers/llmGlobalActions";
import {llmPageActions} from "./helpers/llmPageActions";
import {GenerateContentRequest, Part} from "@google/generative-ai";
import {getFromStorage} from "./helpers/storage/storageHandling";
import {SerializedCustomAction} from "./helpers/settings/dataModels";
import {SerializedPageSnapshot} from "./helpers/storage/pageStorage";
import {injectContentScript, uniqueString} from "./helpers/misc";
import {summarizePage} from "./helpers/summarization";
import {addSerializedPage, getTimestampStringForPage} from "./helpers/storage/pageStorage";
import {stockContextMenuItems} from "./helpers/stockContextMenuItems";
import InjectionTarget = chrome.scripting.InjectionTarget;
import ScriptInjection = chrome.scripting.ScriptInjection;

setupOffscreenDocument().catch();
rebuildContextMenus();

let workingStatus: "idleAfterFailure" | "idleAfterSuccess" | "idle" | "busy" = "idle";
let busyBadgeState: number = 0;
let timeoutId: NodeJS.Timeout | number | null = null;
chrome.storage.session.get(storageKeys.workingStatus).then((result) => {
    workingStatus = result[storageKeys.workingStatus] || "idle";
});

setInterval(() => {
    if(workingStatus === "busy") {
        busyBadgeState = 1 - busyBadgeState;
        chrome.action.setBadgeText({text: busyBadgeState ? "⏳" : "⌛"}).catch();
    }
}, 300);

function setWorkingStatus(status: "idleAfterFailure" | "idleAfterSuccess" | "idle" | "busy") {
    chrome.storage.session.set({[storageKeys.workingStatus]: status}).catch();
}

chrome.storage.session.onChanged.addListener((changes) => {
    if (changes[storageKeys.workingStatus]) {
        workingStatus = changes[storageKeys.workingStatus].newValue;
        if(workingStatus === "idleAfterSuccess") {
            setDoneBadge().catch();
        }
        else if(workingStatus === "idleAfterFailure") {
            setErrorBadge().catch();
        }
        else if(workingStatus === "busy") {
            setBusyBadge().catch();
        }
    }
});

async function setDoneBadge() {
    await chrome.action.setBadgeText({text: "✔"});
    await chrome.action.setBadgeBackgroundColor({color: "#198754"});
    timeoutId && clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        if(workingStatus === "idleAfterSuccess") {
            chrome.action.setBadgeText({text: ""});
            workingStatus = "idle";
        }
    }, 2000);
}

async function setErrorBadge() {
    await chrome.action.setBadgeText({text: "❌"});
    await chrome.action.setBadgeBackgroundColor({color: "#dc3545"});
    timeoutId && clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        if(workingStatus === "idleAfterFailure") {
            chrome.action.setBadgeText({text: ""});
            workingStatus = "idle";
        }
    }, 2000);
}

async function setBusyBadge() {
    await chrome.action.setBadgeText({text: "⌛"});
    await chrome.action.setBadgeBackgroundColor({color: "#0d6efd"});
}


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

    await asyncRequestAndParseJSON(requestData, ["$.actionList.*"], ({value, key, parent, stack}) => {
        let elementIndex, actionName, actionParams;
        if (value instanceof Array && value.length === 2)
            [actionName, elementIndex] = value;
        else if(value instanceof Array && value.length === 3)
            [actionName, elementIndex, actionParams] = value;
        else
            return;

        if (llmPageActions.hasOwnProperty(actionName as string) && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                messageGoal: extensionMessageGoals.executePageAction,
                elementIndex: elementIndex,
                actionName: actionName,
                actionParams: actionParams
            } as ExtensionMessageRequest)
        }
        else if (llmGlobalActions.hasOwnProperty(actionName as string)) {
            llmGlobalActions[actionName as string].execute(elementIndex as number|null, actionParams, tab)
        } else {
            //TODO: log error
        }
    })
}

async function getTabDocumentInfo(tab: chrome.tabs.Tab) {
    if (!tab || !tab.id)
        return {};

    let tabScreenshot = "";
    try {
        tabScreenshot = await chrome.tabs.captureVisibleTab(undefined,
            {
                "format": "jpeg",
                "quality": 40
            }
        );
    }
    catch {}

    try {
        const tabDocumentInfo: TabDocumentInfo = await chrome.tabs.sendMessage(tab.id, {messageGoal: extensionMessageGoals.getDocumentInfo} as ExtensionMessageRequest);
        tabDocumentInfo.screenshot = tabScreenshot;
        return tabDocumentInfo;
    } catch {
        return {};
    }
}

async function textCommandGetThenExecute() {
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true
        });

        if (!tab.id)
            return;
        const response: PromptUserResult = await chrome.tabs.sendMessage(tab.id, {messageGoal: extensionMessageGoals.promptUser} as PromptUserRequest);
        if (response.userResponse !== null && response.userResponse !== "") {
            setWorkingStatus("busy");
            const tabDocumentInfo = await getTabDocumentInfo(tab);
            submitUserRequest(tabDocumentInfo, {text: response.userResponse}, tab).then(() => {
                setWorkingStatus("idleAfterSuccess");
            }).catch((err) => {
                console.log(err);
                setWorkingStatus("idleAfterFailure");
            });
        }
    }
    catch {}
}

function rebuildContextMenus() {
    chrome.contextMenus.removeAll(async () => {
        const createdItems = new Set<string>();
        const actions = [...stockContextMenuItems, ...((await getFromStorage(storageKeys.customActions) || []) as SerializedCustomAction[])];
        for (const action of actions) {
            if(action.pathInContextMenu) {
                let [parentItem, menuItem] = action.pathInContextMenu.split("/").map(s => s.trim()) as (string | undefined)[];
                if (!menuItem) {
                    menuItem = parentItem;
                    parentItem = undefined;
                }
                if (parentItem) {
                    const parentProperties: any = {
                        title: parentItem,
                        contexts: ["all"],
                        visible: true
                    };
                    if(createdItems.has(parentItem)) {
                        await chrome.contextMenus.update(parentItem, parentProperties);
                    }
                    else {
                        chrome.contextMenus.create({id: parentItem, ...parentProperties});
                        createdItems.add(parentItem);
                    }
                }
                const itemProperties: any = {
                    title: menuItem,
                    contexts: [action.selectedTextRegExp ? "selection" : "all"],
                    visible: true,
                    enabled: false
                };
                if(parentItem) {
                    itemProperties.parentId = parentItem;
                }
                if(createdItems.has(action.id)) {
                    await chrome.contextMenus.update(action.id, itemProperties);
                } else {
                    chrome.contextMenus.create({id: action.id, ...itemProperties});
                    createdItems.add(action.id);
                }
            }
        }
    });
}

async function voiceCommandRecordThenExecute(){
    await setupOffscreenDocument();
    chrome.tts.stop();
    await chrome.storage.session.set({[storageKeys.voiceRecordingInProgress]: true});
    chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.startAudioCapture} as ExtensionMessageRequest).then(
        async (response: AudioRecordingResult) => {
            if (response.audio) {
                const [tab] = await chrome.tabs.query({
                    active: true,
                    lastFocusedWindow: true
                });
                if(!tab || !tab.id)
                    return;
                setWorkingStatus("busy");
                const tabDocumentInfo = await getTabDocumentInfo(tab);
                submitUserRequest(tabDocumentInfo, {audio: response.audio}, tab).then(() => {
                    setWorkingStatus("idleAfterSuccess");
                }).catch(() => {
                    setWorkingStatus("idleAfterFailure");
                });;
            }
        }
    );
}

async function voiceCommandStopRecording() {
    await setupOffscreenDocument();
    await chrome.storage.session.set({[storageKeys.voiceRecordingInProgress]: false});
    await chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.stopAudioCapture} as ExtensionMessageRequest);
}


chrome.contextMenus.onClicked.addListener((info, tab) => {
    if(!tab)
        return;

    chrome.sidePanel.open({windowId: tab.windowId}, async () => {
        setWorkingStatus("busy");
        try {
            const actions = [...stockContextMenuItems, ...((await getFromStorage(storageKeys.customActions) || []) as SerializedCustomAction[])];
            const action = actions.find((a: SerializedCustomAction) => a.id === info.menuItemId) as SerializedCustomAction;
            if (!action) {
                return;
            }
            if (!tab.id)
                return;
            const data = await chrome.tabs.sendMessage(tab.id, {
                messageGoal: extensionMessageGoals.requestDataForCustomAction,
                actionId: info.menuItemId
            } as DataForCustomActionRequest) as DataForCustomActionResult;
            const context: CustomActionContext = {
                ...data
            };

            if (action.context.pageSnapshot || action.context.elementSnapshot && data) {
                const tabScreenshot = await chrome.tabs.captureVisibleTab(undefined, {"format": "png"});
                if (action.context.pageSnapshot) {
                    context.pageSnapshot = tabScreenshot;
                }

                if (action.context.elementSnapshot && data.elementBoundingRect) {
                    await setupOffscreenDocument();
                    const elementImageModificationResult: ImageModificationResult = await chrome.runtime.sendMessage({
                        messageGoal: extensionMessageGoals.modifyImage,
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

                    if (elementImageModificationResult.image)
                        context.elementSnapshot = elementImageModificationResult.image;
                }
                if (action.context.selectionSnapshot && data.selectionContainerBoundingRect) {
                    await setupOffscreenDocument();
                    const selectionImageModificationResult: ImageModificationResult = await chrome.runtime.sendMessage({
                        messageGoal: extensionMessageGoals.modifyImage,
                        modification: "crop",
                        image: tabScreenshot,
                        parameters: {
                            x: data.selectionContainerBoundingRect?.x,
                            y: data.selectionContainerBoundingRect?.y,
                            width: data.selectionContainerBoundingRect?.width,
                            height: data.selectionContainerBoundingRect?.height,
                            viewportWidth: data.viewportRect?.width,
                            viewportHeight: data.viewportRect?.height
                        },
                        output: {
                            format: "jpeg",
                            quality: 50
                        }
                    } as ExtensionMessageImageModificationRequest);

                    if (selectionImageModificationResult.image)
                        context.selectionSnapshot = selectionImageModificationResult.image;
                }
            }

            const customActionSuccess = await chrome.runtime.sendMessage({
                messageGoal: extensionMessageGoals.executeCustomActionInSidePanel,
                actionId: action.id,
                context: context,
            } as ExecuteCustomActionInSidePanelRequest);
            setWorkingStatus(customActionSuccess ? "idleAfterSuccess" : "idleAfterFailure");
        }
        catch {
            setWorkingStatus("idleAfterFailure");
        }
    });
});

async function registerContextMenuEvent(request: RegisterContextMenuEventRequest) {
    const actions = [...stockContextMenuItems, ...((await getFromStorage(storageKeys.customActions) || []) as SerializedCustomAction[])];
    const availableActions = actions.filter((a: SerializedCustomAction) => request.availableCustomActions.includes(a.id)) as SerializedCustomAction[];
    const parentItems = new Set<string>();
    for (const action of actions) {
        if(!action.pathInContextMenu)
            continue;
        let [parentItem, menuItem] = action.pathInContextMenu.split("/").map(s => s.trim()) as (string | undefined)[];
        if (!menuItem) {
            menuItem = parentItem;
            parentItem = undefined;
        }
        if(availableActions.includes(action)) {
            if (parentItem) {
                parentItems.add(parentItem);
                await chrome.contextMenus.update(
                    parentItem,
                    {
                        enabled: true
                    }
                );
            }
            await chrome.contextMenus.update(
                action.id,
                {
                    enabled: true
                }
            );
        }
        else {
            if (parentItem && !parentItems.has(parentItem))
                await chrome.contextMenus.update(
                    parentItem,
                    {
                        enabled: false
                    }
                );
            await chrome.contextMenus.update(
                action.id,
                {
                    enabled: false
                }
            );
        }
    }
}

async function takeCurrentPageSnapshot() {
    setWorkingStatus("busy");
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true
        });

        const tabDocumentInfo = await getTabDocumentInfo(tab);
        const serializedPage: SerializedPageSnapshot = {
            id: uniqueString(),
            timestamp: getTimestampStringForPage(),
            text: tabDocumentInfo.text || "",
            title: tabDocumentInfo.title || "",
            url: tabDocumentInfo.url || "",
            keywords: [],
            summaries: [],
            vectors: [],
            screenshot: tabDocumentInfo.screenshot || ""
        };
        const result = await summarizePage(serializedPage);
        serializedPage.text = "";
        if (result) {
            serializedPage.title = result?.title || serializedPage.title;
            serializedPage.summaries = result?.summaries || [];
            serializedPage.keywords = result?.keywords || [];
            serializedPage.vectors = result?.vectors || [];
        }
        serializedPage.screenshot = ""
        addSerializedPage(serializedPage);
        chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.pageSnapshotTaken} as ExtensionMessageRequest).catch();
        setWorkingStatus("idleAfterSuccess");
    }
    catch {
        setWorkingStatus("idleAfterFailure");
    }
}

chrome.runtime.onMessage.addListener((request: ExtensionMessageRequest, sender, sendResponse) => {
    if (request.messageGoal === extensionMessageGoals.registerContextMenuEvent) {
        registerContextMenuEvent(request as RegisterContextMenuEventRequest).then(() => sendResponse());
    } else if (request.messageGoal === extensionMessageGoals.rebuildContextMenus) {
        rebuildContextMenus();
    } else if (request.messageGoal === extensionMessageGoals.voiceCommandRecordThenExecute) {
        voiceCommandRecordThenExecute().catch();
    } else if (request.messageGoal === extensionMessageGoals.voiceCommandStopRecording) {
        voiceCommandStopRecording().catch();
    } else if (request.messageGoal === extensionMessageGoals.textCommandGetThenExecute) {
        textCommandGetThenExecute().catch();
    } else if (request.messageGoal === extensionMessageGoals.takeCurrentPageSnapshot) {
        takeCurrentPageSnapshot().catch();
    }

    return undefined;
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "textCommandGetThenExecute") {
        await injectContentScript();
        textCommandGetThenExecute().catch();
    }
    else if (command === "voiceCommandRecordThenExecute") {
        await injectContentScript();
        voiceCommandRecordThenExecute().catch();
    }
    else if (command === "voiceCommandStopRecording") {
        await voiceCommandStopRecording();
    }
    else if (command === "showSettingsPage") {
        await chrome.tabs.create({
            url: chrome.runtime.getURL("settings.html"),
            active: true
        })
    }
    else if (command === "takeCurrentPageSnapshot") {
        await injectContentScript();
        await takeCurrentPageSnapshot();
    }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).finally();

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        await chrome.runtime.openOptionsPage();
    }
});

//
// chrome.action.onClicked.addListener((tab) => {
//     console.log("Action clicked");
//     chrome.scripting.executeScript({
//         target: {tabId: tab.id},
//         files: ["js/contentScript.js"]
//     } as ScriptInjection).catch(console.log);
// });