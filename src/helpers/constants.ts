export enum extensionActions {
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
}

export enum storageKeys {
    mainGoogleApiKey = "googleApiKey",
    models = "models",
    personas = "personas",
    assistantModel = "assistantModel",
    embeddingModel = "embeddingModel",
    codePlayers = "codePlayers",
    customActions = "customActions",
    menuItems = "menuItems",
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
    action: extensionActions;
}

export interface DataForCustomActionRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.requestDataForCustomAction,
    actionId: string,
}

export interface DataForCustomActionResult {
    elementHTML?: string,
    documentHTML?: string,
    elementText?: string,
    selectionText?: string,
    elementBoundingRect?: DOMRect,
    viewportRect?: {width: number, height: number},
    error?: string
}

export interface CustomActionContext {
    elementHTML?: string,
    documentHTML?: string,
    elementText?: string,
    selectionText?: string,
    elementSnapshot?: string,
    pageSnapshot?: string,
}

export interface ExecuteCustomActionInSidePanelRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.executeCustomActionInSidePanel,
    actionId: string,
    context: CustomActionContext
}

export interface ExecutePageActionRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.executePageAction,
    actionName: string;
    elementIndex: string;
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
    action: typeof extensionActions.modifyImage,
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
    action: typeof extensionActions.runInSandbox,
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
    action: typeof extensionActions.sandboxedTaskResultsUpdate,
    requestId: string,
    result: any,
    isFinal: boolean
}

export interface AudioRecordingResult {
    audio?: string,
    error?: string
}

export interface PromptUserRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.promptUser,
    promptText?: string
}

export interface ElementPropertiesRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.getDomElementProperties,
    elementIndex: string,
    propertyNames: string[]
}

export interface RegisterContextMenuEventRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.registerContextMenuEvent,
    availableCustomActions: string[],
    selectedText: string
}

