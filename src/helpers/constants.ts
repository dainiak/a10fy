export enum extensionMessageGoals {
    getDocumentInfo = "getDocumentInfo",
    executePageAction = "executePageAction",
    promptUser = "promptUser",
    startAudioCapture = "startAudioCapture",
    stopAudioCapture = "stopAudioCapture",
    copyTextToClipboard = "copyTextToClipboard",
    getTextFromClipboard = "getTextFromClipboard",
    processUserAudioQuery = "processUserAudioQuery",
    getDomElementProperties = "getDomElementProperties",
    registerContextMenuEvent = "registerContextMenuEvent",
    rebuildContextMenus = "rebuildContextMenus",
    requestDataForCustomAction = "requestDataForCustomAction",
    executeCustomActionInSidePanel = "executeCustomActionInSidePanel",
    modifyImage = "modifyImage",
    runInSandbox = "runInSandbox",
    sandboxedTaskResultsUpdate = "sandboxedTaskResultsUpdate",

    textCommandGetThenExecute = "textCommandGetThenExecute",
    voiceCommandRecordThenExecute = "voiceCommandRecordThenExecute",
    voiceCommandStopRecording = "voiceCommandStopRecording",
}

export enum storageKeys {
    mainGoogleApiKey = "googleApiKey",
    models = "models",
    personas = "personas",
    assistantModel = "assistantModel",
    summarizationModel = "summarizationModel",
    embeddingModel = "embeddingModel",
    codePlayers = "codePlayers",
    customActions = "customActions",
    ttsVoicePreferences = "ttsVoicePreferences",
}

export const cssPrefix = "a10fy_";
export const cssPrefixFallbackSymbol = Symbol(cssPrefix);

export interface ActionRequest {
    actionName: string;
    elementIndex: string;
    actionParams: string;
}


export interface UserRequest {
    text?: string;
    audio?: string;
}

export interface ElementPropertiesResult {
    error?: string;
    value?: string;
    style?: CSSStyleDeclaration;
    computedStyle?: CSSStyleDeclaration;
    boundingRect?: DOMRect;
    id?: string;
    innerHTML?: string;
    outerHTML?: string;
    innerText?: string;
    textContent?: string | null;
    [key: string]: any;
}

export interface TabDocumentInfo {
    html?: string;
    text?: string;
    url?: string;
    title?: string;
    screenshot?: string;
}

export interface ExtensionMessageRequest {
    messageGoal: extensionMessageGoals;
}

export interface DataForCustomActionRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.requestDataForCustomAction,
    actionId: string,
}

export interface DataForCustomActionResult {
    elementInnerHTML?: string,
    elementOuterHTML?: string,
    documentCompleteHTML?: string,
    documentSimplifiedHTML?: string,
    documentTitle?: string,
    documentURL?: string,
    elementInnerText?: string,
    selectionText?: string,
    selectionContainerOuterHTML?: string,
    selectionContainerInnerText?: string,
    elementBoundingRect?: DOMRect,
    selectionContainerBoundingRect?: DOMRect,
    viewportRect?: {width: number, height: number},
    error?: string
}

export interface CustomActionContext {
    elementInnerHTML?: string,
    elementOuterHTML?: string,
    documentCompleteHTML?: string,
    documentSimplifiedHTML?: string,
    documentTitle?: string,
    documentURL?: string,
    elementInnerText?: string,
    selectionText?: string,
    selectionContainerOuterHTML?: string,
    selectionContainerInnerText?: string,
    elementSnapshot?: string,
    pageSnapshot?: string,
    selectionSnapshot?: string,
}

export interface ExecuteCustomActionInSidePanelRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.executeCustomActionInSidePanel,
    actionId: string,
    context: CustomActionContext
}

export interface ExecutePageActionRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.executePageAction,
    actionName: string;
    elementIndex: string | number | null;
    actionParams: string;
}

export interface DocumentInfoResult {
    html?: string,
    text?: string,
    url?: string,
    title?: string
}

export interface PromptUserResult {
    userResponse: string | null
}

export interface ExtensionMessageImageModificationRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.modifyImage,
    image: string,
    output: {
        format: "jpeg" | "png" | "bmp" | "gif" | "webp",
        quality: number
    },
    modification: "crop",
    parameters: {
        x: number,
        y: number,
        width: number,
        height: number,
        viewportWidth: number,
        viewportHeight: number
    }
}

export interface ImageModificationResult {
    image?: string,
    error?: string
}

export interface RunInSandboxRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.runInSandbox,
    executor: "offscreen" | "sidePanel",
    taskType: string,
    taskParams: any,
    requestId: string
}

export interface CustomPlayerRequestParams {
    customCSS: string,
    customJS: string,
    customHTML: string,
    language: string,
    code: string
}

export interface CustomPlayerResult {
    html?: string,
    width?: number,
    height?: number
}

export interface SandboxedTaskResult extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.sandboxedTaskResultsUpdate,
    requestId: string,
    result: any,
    isFinal: boolean
}

export interface AudioRecordingResult {
    audio?: string,
    error?: string
}

export interface PromptUserRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.promptUser,
    promptText?: string
}

export interface ElementPropertiesRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.getDomElementProperties,
    elementIndex: string,
    propertyNames: string[]
}

export interface RegisterContextMenuEventRequest extends ExtensionMessageRequest {
    messageGoal: typeof extensionMessageGoals.registerContextMenuEvent,
    availableCustomActions: string[],
    selectedText: string
}

export const voiceRecordingInProgress = "voiceRecordingInProgress";