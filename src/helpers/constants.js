const extensionActions = {
    getDocumentInfo: "getDocumentInfo",
    executePageAction: "executePageAction",
    getUserQuery: "getUserQuery",
    startAudioCapture: "startAudioCapture",
    stopAudioCapture: "stopAudioCapture",
    processUserAudioQuery: "processUserAudioQuery",
    getDomElementProperties: "getDomElementProperties"
}

const storageKeys = {
    googleApiKey: "googleApiKey"
}

const cssPrefix = "a10fy_";
const cssPrefixFallbackSymbol = Symbol(cssPrefix);

export { extensionActions, storageKeys, cssPrefix, cssPrefixFallbackSymbol };