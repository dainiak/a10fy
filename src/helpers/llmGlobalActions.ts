import {ExecutePageActionRequest, extensionMessageGoals, ExtensionMessageRequest, storageKeys} from "./constants";
import {llmPageActionNames} from "./llmPageActions";
import 'chrome-types';
import {getFromStorage} from "./storage/storageHandling";
import {SerializedVoiceSettings} from "./settings/dataModels";

export enum llmGlobalActionNames {
    speak = "speak",
    speakElementText = "speakElementText",
    showMessage = "showMessage",
    copyTextToClipboard = "copyTextToClipboard",
    copyElementPropertyToClipboard = "copyElementPropertyToClipboard",
    setElementPropertyFromClipboard = "setElementPropertyFromClipboard",
    pageTour = "pageTour"
}

interface LLMGlobalAction {
    description: string;
    execute: (elementIndex: number | null, actionParams: any, tab: chrome.tabs.Tab) => void;
}

interface LlmGlobalActions {
    [key: string]: LLMGlobalAction;
}

async function speak(content: string, lang: string = "en-US") {
    const voicesSettings = (await getFromStorage(storageKeys.ttsVoicePreferences) || {}) as SerializedVoiceSettings;
    const options: chrome.tts.TtsOptions = {enqueue: true};

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

    let preferredVoiceName = voicesSettings.hasOwnProperty(lang) ? voicesSettings[lang].voiceName : "";
    let preferredRate = voicesSettings.hasOwnProperty(lang) ? voicesSettings[lang].rate : 1;
    if(preferredVoiceName) {
        const preferredVoiceForLang = stockVoices.find((v) => v.voiceName === preferredVoiceName);
        if (preferredVoiceForLang) {
            options.voiceName = preferredVoiceName;
            options.rate = preferredRate;
        }
        else if(stockVoiceForLang && stockVoiceForLang.voiceName){
            voicesSettings[lang].voiceName = stockVoiceForLang.voiceName;
            voicesSettings[lang].rate = preferredRate;
            await chrome.storage.sync.set({ttsVoices: voicesSettings});
        }
    }

    await chrome.tts.speak(content, options);
}


export const llmGlobalActions: LlmGlobalActions = {
    [llmGlobalActionNames.speak]: {
        description: "Speak a given text using browser TTS engine. The elementIndex is null in this case. The actionParams is an object with two keys: \"content\" (what to speak) and \"lang\" (the language of the speech, assumed to be \"en-US\" if omitted). If in need to speak large paragraph(s) of text, do not cram them into the content of a single speak action, but rather emit multiple speak actions with smaller chunks of text per action. To avoid TTS engine cutting off the speech in the middle of a sentence or a word, only end chunks on punctuation marks.",
        execute: (_1, actionParams, _2) => {
            if (actionParams?.content)
                speak(actionParams.content, actionParams?.lang || "en-US").catch();
        }
    },
    [llmGlobalActionNames.speakElementText]: {
        description: "Use browser TTS engine to speak the innerText of some DOM element identified by elementIndex. The actionParams is an object with a single key \"lang\" (the language of the speech, assumed to be \"en-US\" if omitted).",
        execute: (elementIndex, actionParams, tab) => {
            if (!tab.id)
                return;

            chrome.tabs.sendMessage(tab.id, {
                messageGoal: extensionMessageGoals.getDomElementProperties,
                elementIndex: elementIndex,
                propertyNames: ["innerText"]
            } as ExtensionMessageRequest).then((response: any) => {
                if (response?.innerText)
                    speak(response.innerText, actionParams?.lang || "en-US").catch();
            });
        }
    },
    [llmGlobalActionNames.showMessage]: {
        description: "Use to display a given message for the user to see. Technically this is shown in browser Side Panel alongside the current tab. The elementIndex is null and the actionParams is a string hosting the markdown content of the message to show. Use this action whenever you need to answer some generic user question or provide some additional information to the user in a non-spoken form. If the user request was in textual form, prefer using this action instead of \"speak\".",
        execute: (_1, actionParams, _2) => chrome.storage.session.set({llmMessage: actionParams})
    },
    [llmGlobalActionNames.copyTextToClipboard]: {
        description: "Copy the provided text to the clipboard. The elementIndex is null and the actionParams is a string to be copied.",
        execute: (_1, actionParams, _2) => {
            chrome.runtime.sendMessage({
                messageGoal: extensionMessageGoals.copyTextToClipboard,
                text: actionParams
            } as ExtensionMessageRequest).catch()
        }
    },
    [llmGlobalActionNames.copyElementPropertyToClipboard]: {
        description: "Copy the provided property of the element identified by elementIndex to the clipboard. The actionParams is a string taking one of values \"value\", \"innerText\", \"innerHTML\".",
        execute: (elementIndex, actionParams, tab) => {
            if (!tab.id || !["value", "innerText", "innerHTML"].includes(actionParams))
                return;

            chrome.tabs.sendMessage(tab.id, {
                messageGoal: extensionMessageGoals.getDomElementProperties,
                elementIndex: elementIndex,
                propertyNames: [actionParams]
            } as ExtensionMessageRequest).then((response: any) => {
                if (response?.[actionParams])
                    chrome.runtime.sendMessage({
                        messageGoal: extensionMessageGoals.copyTextToClipboard,
                        text: response[actionParams?.propertyType || "innerText"]
                    } as ExtensionMessageRequest).catch()
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
                messageGoal: extensionMessageGoals.getTextFromClipboard
            } as ExtensionMessageRequest).then((response: {text?: string}) => {
                if (!response?.text)
                    return;

                if (actionParams === "value")
                    chrome.tabs.sendMessage(tabId, {
                        messageGoal: extensionMessageGoals.executePageAction,
                        actionName: llmPageActionNames.setValue,
                        elementIndex: elementIndex,
                        actionParams: response.text
                    } as ExecutePageActionRequest).catch()
                else if (actionParams === "innerText")
                    chrome.tabs.sendMessage(tabId, {
                        messageGoal: extensionMessageGoals.executePageAction,
                        actionName: llmPageActionNames.setText,
                        elementIndex: elementIndex,
                        actionParams: response.text
                    } as ExecutePageActionRequest).catch()
                else if (actionParams === "innerHTML")
                    chrome.tabs.sendMessage(tabId, {
                        messageGoal: extensionMessageGoals.executePageAction,
                        actionName: llmPageActionNames.setHTML,
                        elementIndex: elementIndex,
                        actionParams: response.text
                    } as ExecutePageActionRequest).catch()
            })
        }
    }
}