const globalActions = {
    getDocumentInfo: "getDocumentInfo",
    performCommand: "performCommand",
    getUserQuery: "getUserQuery",
    startAudioCapture: "startAudioCapture",
    stopAudioCapture: "stopAudioCapture"
}

const cssPrefix = "a10fy_";
const cssPrefixFallbackSymbol = Symbol(cssPrefix);

export { globalActions, cssPrefix, cssPrefixFallbackSymbol };