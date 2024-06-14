import {extensionActions, cssPrefix} from "./helpers/constants";
import {getInlineImagePart, getMainPromptParts} from "./helpers/promptParts";
import {setupOffscreenDocument} from "./helpers/setupOffscreenDocument";
import {asyncRequestAndParse} from "./helpers/geminiInterfacing";


setupOffscreenDocument().finally();

async function submitUserRequest(websiteData, userRequest, tab) {
    let requestParts = [
        {
            text: "Here is a screenshot of a webpage:"
        },
        getInlineImagePart(websiteData.screenshot),
        {
            text: (
                `The webpage title is \`\`\`${websiteData.title}\`\`\`.\n` +
                `The webpage URL is \`\`\`${websiteData.url}\`\`\`.\n` +
                `The simplified representation of the DOM structure of the webpage is as follows (with removed styles and scripts, and injected "${cssPrefix}..." classes for identifying the DOM elements): \n` +
                `\`\`\`${websiteData.html}\`\`\``
            )
        },
        ...getMainPromptParts(userRequest)
    ];

    let requestData = {
        contents: [{
            role: "user",
            parts: requestParts
        }]
    }

    console.log(`Sending request for action: ${userRequest} on the website to LLM.`)
    await asyncRequestAndParse(requestData, ["$.actionList.*"], ({value, key, parent, stack}) => {
        console.log(key, parent, stack, value);
        let index, command, val;
        if (value.length === 2)
            [command, index] = value;
        else
            [command, index, val] = value;

        if (command === "speak") {
            if (index === null)
                chrome.tts.speak(val, {lang: "en-US", rate: 1.0, enqueue: true});
            else {
                chrome.tabs.sendMessage(tab.id, {
                    action: extensionActions.getDomElementProperties,
                    elementIndex: index,
                    propertyNames: ["innerText"]
                }).then((response) => {
                    if (response.innerText)
                        chrome.tts.speak(response.innerText, {lang: "en-US", rate: 1.0, enqueue: true});
                });
            }
        } else {
            chrome.tabs.sendMessage(tab.id, {
                action: extensionActions.performCommand,
                elementIndex: index,
                command: command,
                value: val
            })
        }
    });
}

chrome.runtime.onMessage.addListener(
    async function (request, sender) {
        if (!sender.tab && request.action === extensionActions.processUserAudioQuery && request.audio) {
            console.log("Audio query received.", request.audio);

            const [tab] = await chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            });
            const tabDocumentInfo = await getTabDocumentInfo(tab);
            await submitUserRequest(tabDocumentInfo, {audio: request.audio}, tab);
        }
    }
);

async function getTabDocumentInfo(tab) {
    const tabScreenshot = await chrome.tabs.captureVisibleTab(
        {
            "format": "jpeg",
            "quality": 40
        }
    );

    const tabDocumentInfo = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.getDocumentInfo});
    tabDocumentInfo.screenshot = tabScreenshot;
    return tabDocumentInfo;
}

async function textBasedCommandOnPage() {
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });

    const query = await chrome.tabs.sendMessage(tab.id, {action: extensionActions.getUserQuery});
    if (query !== null && query !== "") {
        const tabDocumentInfo = await getTabDocumentInfo(tab);
        await submitUserRequest(tabDocumentInfo, {text: query}, tab);
    }
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "analysePage")
        return textBasedCommandOnPage();
    if (command === "voiceCommandRecord") {
        await setupOffscreenDocument();
        chrome.tts.stop();
        await chrome.runtime.sendMessage({action: extensionActions.startAudioCapture});
        return;
    }
    if (command === "voiceCommandExecute") {
        await setupOffscreenDocument();
        await chrome.runtime.sendMessage({action: extensionActions.stopAudioCapture});
    }
    if (command === "showWelcomeScreen") {
        await chrome.tabs.create({
            url: chrome.runtime.getURL("welcome.html"),
            active: true
        })
    }
});


// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).finally();


chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason.search(/install/g) === -1)
        return;
    await chrome.tabs.create({
        url: chrome.runtime.getURL("welcome.html"),
        active: true
    })
})
