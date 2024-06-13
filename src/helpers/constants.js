const extensionActions = {
    getDocumentInfo: "getDocumentInfo",
    performCommand: "performCommand",
    getUserQuery: "getUserQuery",
    startAudioCapture: "startAudioCapture",
    stopAudioCapture: "stopAudioCapture",
    processUserAudioQuery: "processUserAudioQuery"
}

const cssPrefix = "a10fy_";
const cssPrefixFallbackSymbol = Symbol(cssPrefix);

export { extensionActions, cssPrefix, cssPrefixFallbackSymbol };