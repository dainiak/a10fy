const extensionActions = {
    getDocumentInfo: "getDocumentInfo",
    executePageAction: "executePageAction",
    getUserQuery: "getUserQuery",
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
    [key: string]: any;
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

export {
    extensionActions, storageKeys, cssPrefix, cssPrefixFallbackSymbol, ActionRequest, UserRequest, ElementPropertiesResult, TabDocumentInfo,
    ExtensionMessageRequest, ExtensionMessageImageModificationRequest, RunInSandboxRequest, SandboxedTaskResult
};