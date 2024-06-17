import {extensionActions} from "./constants";
import {llmPageActionNames} from "./llmPageActions";

const llmGlobalActionNames = {
    speak: "speak",
    speakElementText: "speakElementText",
    showMessage: "showMessage",
    copyTextToClipboard: "copyTextToClipboard",
    copyElementPropertyToClipboard: "copyElementPropertyToClipboard",
    setElementPropertyFromClipboard: "setElementPropertyFromClipboard"
}

interface LLMGlobalAction {
    description: string;
    execute: (elementIndex: number | null, actionParams: any, tab: chrome.tabs.Tab) => void;
}

interface LlmGlobalActions {
    [key: string]: LLMGlobalAction;
}

async function speak(content: string, lang: string = "en-US") {
    const ttsSettings = await chrome.storage.sync.get(["ttsRate", "ttsVoices"]);
    const options: {rate?: number; voiceName?: string; enqueue?: boolean; lang?: string;} = {enqueue: true};
    if(ttsSettings.ttsRate)
        options.rate = ttsSettings.ttsRate;

    const voicesSettings: {[key: string]: string} = ttsSettings.ttsVoices || {};
    const stockVoices = await chrome.tts.getVoices();
    let stockVoiceForLang = stockVoices.find((v) => v.lang === lang);
    if (!stockVoiceForLang) {
        stockVoiceForLang = stockVoices.find((v) => (v.lang || "").toLowerCase().split(/[_-]/)[0] === lang.toLowerCase().split(/[_-]/)[0]);
        lang = ""
        if(stockVoiceForLang && stockVoiceForLang.lang)
            lang = stockVoiceForLang.lang;
    }
    if(lang)
        options.lang = lang;

    let preferredVoiceName = voicesSettings.hasOwnProperty(lang) ? voicesSettings[lang] : "";
    if(preferredVoiceName) {
        const preferredVoiceForLang = stockVoices.find((v) => v.voiceName === preferredVoiceName);
        if (preferredVoiceForLang)
            options.voiceName = preferredVoiceName;
        else if(stockVoiceForLang && stockVoiceForLang.voiceName){
            voicesSettings[lang] = stockVoiceForLang.voiceName;
            await chrome.storage.sync.set({ttsVoices: voicesSettings});
        }
    }

    chrome.tts.speak(content, options);
}


const llmGlobalActions: LlmGlobalActions = {
    [llmGlobalActionNames.speak]: {
        description: "Speak a given text using browser TTS engine. The elementIndex is null in this case. The actionParams is an object with two keys: \"content\" (what to speak) and \"lang\" (the language of the speech, assumed to be \"en-US\" if omitted). If in need to speak large paragraph(s) of text, do not cram them into the content of a single speak action, but rather emit multiple speak actions with smaller chunks of text per action. To avoid TTS engine cutting off the speech in the middle of a sentence or a word, only end chunks on punctuation marks.",
        execute: (_1, actionParams, _2) => {
            if (actionParams?.content)
                speak(actionParams.content, actionParams?.lang || "en-US");
        }
    },
    [llmGlobalActionNames.speakElementText]: {
        description: "Use browser TTS engine to speak the innerText of some DOM element identified by elementIndex. The actionParams is an object with a single key \"lang\" (the language of the speech, assumed to be \"en-US\" if omitted).",
        execute: (elementIndex, actionParams, tab) => {
            if (!tab.id)
                return;

            chrome.tabs.sendMessage(tab.id, {
                action: extensionActions.getDomElementProperties,
                elementIndex: elementIndex,
                propertyNames: ["innerText"]
            }).then((response: any) => {
                if (response?.innerText)
                    speak(response.innerText, actionParams?.lang || "en-US");
            });
        }
    },
    [llmGlobalActionNames.showMessage]: {
        description: "Use to display a given message for the user to see. Technically this is shown in browser Side Panel alongside the current tab. The elementIndex is null and the actionParams is a string hosting the HTML content of the message to show. You can only use the following tags: h3, h4, h5, a, pre, code, ul, ol, li, p, em, strong, table, tbody, thead, tfoot, tr, td. No other tags are allowed. Use this action whenever you need to answer some generic user question or provide some additional information to the user in a non-spoken form. If the user request was in textual form, prefer using this action instead of \"speak\".",
        execute: (_1, actionParams, _2) => chrome.storage.session.set({llmMessage: actionParams})
    },
    [llmGlobalActionNames.copyTextToClipboard]: {
        description: "Copy the provided text to the clipboard. The elementIndex is null and the actionParams is a string to be copied.",
        execute: (_1, actionParams, _2) => {
            chrome.runtime.sendMessage({
                action: extensionActions.copyTextToClipboard,
                text: actionParams
            })
        }
    },
    [llmGlobalActionNames.copyElementPropertyToClipboard]: {
        description: "Copy the provided property of the element identified by elementIndex to the clipboard. The actionParams is a string taking one of values \"value\", \"innerText\", \"innerHTML\".",
        execute: (elementIndex, actionParams, tab) => {
            if (!tab.id || !["value", "innerText", "innerHTML"].includes(actionParams))
                return;

            chrome.tabs.sendMessage(tab.id, {
                action: extensionActions.getDomElementProperties,
                elementIndex: elementIndex,
                propertyNames: [actionParams]
            }).then((response: any) => {
                if (response?.[actionParams])
                    chrome.runtime.sendMessage({
                        action: extensionActions.copyTextToClipboard,
                        text: response[actionParams?.propertyType || "innerText"]
                    })
            });
        }
    },
    [llmGlobalActionNames.setElementPropertyFromClipboard]: {
        description: "Set the provided property of the element identified by elementIndex to the value copied to the clipboard. The actionParams is a string taking one of values \"value\", \"innerText\", \"innerHTML\".",
        execute: (elementIndex, actionParams, tab) => {
            if (!tab.id || !["value", "innerText", "innerHTML"].includes(actionParams))
                return;

            const tabId: number = tab.id;

            chrome.runtime.sendMessage({
                action: extensionActions.getTextFromClipboard
            }, (response: {text?: string}) => {
                if (!response?.text)
                    return;

                if (actionParams === "value")
                    chrome.tabs.sendMessage(tabId, {
                        action: extensionActions.executePageAction,
                        actionName: llmPageActionNames.setValue,
                        elementIndex: elementIndex,
                        actionParams: response.text
                    })
                else if (actionParams === "innerText")
                    chrome.tabs.sendMessage(tabId, {
                        action: extensionActions.executePageAction,
                        actionName: llmPageActionNames.setText,
                        elementIndex: elementIndex,
                        actionParams: response.text
                    })
                else if (actionParams === "innerHTML")
                    chrome.tabs.sendMessage(tabId, {
                        action: extensionActions.executePageAction,
                        actionName: llmPageActionNames.setHTML,
                        elementIndex: elementIndex,
                        actionParams: response.text
                    })
            })
        }
    }
}

export {llmGlobalActions, llmGlobalActionNames};