import {extensionActions} from "./constants";

const llmGlobalActionNames = {
    speak: "speak",
    speakElementText: "speakElementText",
    showMessageInSidePanel: "showMessageInSidePanel"
}

const llmGlobalActions = {
    [llmGlobalActionNames.speak]: {
        description: "Speak a given text using browser TTS engine. The elementIndex is null in this case. The actionParams is an object with two keys: \"content\" (what to speak) and \"lang\" (the language of the speech, assumed to be \"en-US\" if omitted). If in need to speak large paragraph(s) of text, do not cram them into the content of a single speak action, but rather emit multiple speak actions with smaller chunks of text per action. To avoid TTS engine cutting off the speech in the middle of a sentence or a word, only end chunks on punctuation marks.",
        execute: (elementIndex, actionParams) => {
            actionParams.content && chrome.tts.speak(actionParams.content, {lang: actionParams.lang || "en-US", rate: 1.0, enqueue: true});
        }
    },
    [llmGlobalActionNames.speakElementText]: {
        description: "Use browser TTS engine to speak the innerText of some DOM element identified by elementIndex. The actionParams is an object with a single key \"lang\" (the language of the speech, assumed to be \"en-US\" if omitted).",
        execute: (elementIndex, actionParams) => {
            chrome.tabs.sendMessage(tab.id, {
                action: extensionActions.getDomElementProperties,
                elementIndex: elementIndex,
                propertyNames: ["innerText"]
            }).then((response) => {
                if (response.innerText)
                    chrome.tts.speak(response.innerText, {lang: actionParams.lang || "en-US", rate: 1.0, enqueue: true});
            });
        }
    },
    [llmGlobalActionNames.showMessageInSidePanel]: {
        description: "Show a message in browser side panel alongside the current tab. The elementIndex is null and the actionParams is a string hosting the HTML content of the message to show. You can only use the following tags: h3, h4, h5, a, pre, code, ul, ol, li, p, em, strong, table, tbody, thead, tfoot, tr, td. No other tags are allowed.",
        execute: (_, actionParams) => chrome.storage.session.set({ llmMessage: actionParams })
    }
}

export {llmGlobalActions, llmGlobalActionNames};