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
    getImage: "getImage"
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

export { extensionActions, storageKeys, cssPrefix, cssPrefixFallbackSymbol, ActionRequest, UserRequest, ElementPropertiesResult, TabDocumentInfo };