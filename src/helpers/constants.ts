const extensionActions = {
    getDocumentInfo: "getDocumentInfo",
    executePageAction: "executePageAction",
    promptUser: "promptUser",
    startAudioCapture: "startAudioCapture",
    stopAudioCapture: "stopAudioCapture",
    copyTextToClipboard: "copyTextToClipboard",
    getTextFromClipboard: "getTextFromClipboard",
    processUserAudioQuery: "processUserAudioQuery",
    getDomElementProperties: "getDomElementProperties",
    registerContextMenuEvent: "registerContextMenuEvent",
    modifyImage: "modifyImage",
    runInSandbox: "runInSandbox",
    sandboxedTaskResultsUpdate: "sandboxedTaskResultsUpdate",
}

const storageKeys = {
    googleApiKey: "googleApiKey"
}

const cssPrefix = "a10fy_";
const cssPrefixFallbackSymbol = Symbol(cssPrefix);

interface ActionRequest {
    actionName: string;
    elementIndex: string;
    actionParams: string;
}


interface UserRequest {
    text?: string;
    audio?: string;
}

interface ElementPropertiesResult {
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

interface TabDocumentInfo {
    html?: string;
    text?: string;
    url?: string;
    title?: string;
    screenshot?: string;
}

interface ExtensionMessageRequest {
    action: string;
}

interface ExecutePageActionRequest extends ExtensionMessageRequest {
    actionName: string;
    elementIndex: string;
    actionParams: string;
}

interface DocumentInfoResult {
    html?: string,
    text?: string,
    url?: string,
    title?: string
}

interface PromptUserResult {
    userResponse: string | null
}

interface ExtensionMessageImageModificationRequest extends ExtensionMessageRequest {
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

interface ImageModificationResult {
    image?: string,
    error?: string
}

interface RunInSandboxRequest extends ExtensionMessageRequest {
    action: typeof extensionActions.runInSandbox,
    taskType: string,
    taskParams: any,
    requestId: string
}

interface SandboxedTaskResult extends ExtensionMessageRequest {
    action: typeof extensionActions.sandboxedTaskResultsUpdate,
    requestId: string,
    result: any,
    isFinal: boolean
}

interface AudioRecordingResult {
    audio?: string,
    error?: string
}

interface PromptUserRequest extends ExtensionMessageRequest {
    promptText?: string
}

interface ElementPropertiesRequest extends ExtensionMessageRequest {
    elementIndex: string,
    propertyNames: string[]
}

interface RegisterContextMenuEventRequest extends ExtensionMessageRequest {
    boundingRect: DOMRect,
    viewportRect: DOMRect
}


export {
    extensionActions, storageKeys, cssPrefix, cssPrefixFallbackSymbol, ActionRequest, UserRequest, ElementPropertiesResult, TabDocumentInfo,
    ExtensionMessageRequest, ExtensionMessageImageModificationRequest, RunInSandboxRequest, SandboxedTaskResult, ImageModificationResult, AudioRecordingResult, DocumentInfoResult,
    PromptUserResult, ExecutePageActionRequest, PromptUserRequest, ElementPropertiesRequest, RegisterContextMenuEventRequest
};