import { JSONParser } from "@streamparser/json";
import { GoogleGenerativeAI } from "@google/generative-ai";

const cssPrefix = "a10fy_";

const ACTIONS = {
    getDocumentInfo: "getDocumentInfo",
    performCommand: "performCommand",
    getUserQuery: "getUserQuery"
}


function getInlineImage(imageData) {
    return {
        inlineData: {
            mimeType: "image/jpeg",
            data: imageData.replace(/^data:image\/?[A-z]*;base64,/, "")
        }
    }
}

function getJsonGeminiModel() {
    const GOOGLE_API_KEY = "AIzaSyD4YqBxteEa_aAR4wr1VEMNsMJJdnCkVXQ";
    const gemini = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel(
        {
            model: "gemini-1.5-flash"
        }
    );
    gemini.generationConfig.responseMimeType = "application/json";
    return gemini;
}

async function asyncRequestAndParse(requestData, jsonPaths, onValueCallback) {
    const parser = new JSONParser({stringBufferSize: undefined, paths: jsonPaths});
    parser.onValue = onValueCallback;

    const gemini = getJsonGeminiModel();
    const result = await gemini.generateContentStream(requestData);
    let completeText = "";

    for await (const chunk of result.stream) {
        const text = chunk.text();
        parser.write(text);
        completeText += text;
    }
    console.log(completeText);
}

async function sendWebsiteDescriptionRequest(dataUrl, request){
    let personDescription = "9-year-old non-native English speaking child";
    let requestParts = [
        {
            text: "Here is a screenshot of a website:"
        },
        getInlineImage(dataUrl),
        {
            text: (
                `The website title is \`\`\`${request.document.title}\`\`\`.\n` +
                `The website URL is \`\`\`${request.document.url}\`\`\`.\n` +
                `The simplified representation of the DOM structure of the website is as follows (with removed styles and scripts, and injected "${cssPrefix}..." classes for identifying the DOM elements): \n` +
                `\`\`\`${request.document.html}\`\`\``
            )
        },
        {
            text:  `Describe this website in one medium-sized paragraph for a ${personDescription} and provide the list of at most 10 useful actions that such person can perform on this website (follow some links, play some video, perform search etc.). Return a JSON object with keys 'website_description' and 'available_actions'.`
        }
    ];

    let requestData = {
        contents: [{
            role: "user",
            parts: requestParts
        }]
    }

    await asyncRequestAndParse(requestData, ["$.*.*"], ({value, stack}) => {
        console.log(stack, value);
    });

    // then((response) => {
    //     return response.json();
    // }).then((data) => {
    //     // console.log(data);
    //     let geminiResponse = data.candidates[0].content.parts[0].text;
    //     // chrome.tts.speak(geminiResponse, {"lang": "en-US", "rate": 1.0});
    //     console.log(geminiResponse);
    // });
}

async function sendWebsiteActionRequest(dataUrl, websiteData, actionDescription, tab){
    const possibleActions = websiteData.pageActionDescriptions.map((action) => `${action.name} - ${action.description}`).join("\n");
    actionDescription = actionDescription.trim().replace(/`/g, "'").replace(/\n/g, " ");

    let requestParts = [
        {
            text: "Here is a screenshot of a webpage:"
        },
        getInlineImage(dataUrl),
        {
            text: (
                `The webpage title is \`\`\`${websiteData.title}\`\`\`.\n` +
                `The webpage URL is \`\`\`${websiteData.url}\`\`\`.\n` +
                `The simplified representation of the DOM structure of the webpage is as follows (with removed styles and scripts, and injected "${cssPrefix}..." classes for identifying the DOM elements): \n` +
                `\`\`\`${websiteData.html}\`\`\``
            )
        },
        {
            text:  `The user wants to perform the following action on the webpage: \`\`\`${actionDescription}\`\`\`. Return a JSON object with three keys: "understoodAs" - a string describing the user intention according to how you understood it, "isPossible" - a boolean value signifying if the action could be technically performed on the webpage or not, and "steps" - an array of steps of DOM tweaking or user interaction simulation necessary to perform the action. Each step is represented with an array [elementIndex, stepCommand] or [elementIndex, stepCommand, commandParams]. The elementIndex is the integer number that stands after ${cssPrefix}-prefix in the element's CSS class. The stepCommand is a string that represents the action to be performed on the element. The commandParams is an optional value required for some of the commands. The following are the possible values of stepCommand with the descriptions of their effects on the DOM elements:
${possibleActions}

All in all, your response should look like \`\`\`{
    "understoodAs": "...",
    "isPossible": ..., 
    "steps": [[...], ...]
}\`\`\`.`
        }
    ];

    let requestData = {
        contents: [{
            role: "user",
            parts: requestParts
        }]
    }

    console.log(`Sending request for action: ${actionDescription} on the website to LLM.`)
    await asyncRequestAndParse(requestData, ["$.steps.*"], ({value, key, parent, stack}) => {
        console.log(key, parent, stack, value);
        let index, command, val;
        if (value.length === 2)
            [index, command] = value;
        else
            [index, command, val] = value;
        chrome.tabs.sendMessage(tab.id, {action: ACTIONS.performCommand, index: index, command: command, value: val})
    });

    // then((response) => {
    //     return response.json();
    // }).then((data) => {
    //     // console.log(data);
    //     let geminiResponse = data.candidates[0].content.parts[0].text;
    //     // chrome.tts.speak(geminiResponse, {"lang": "en-US", "rate": 1.0});
    //     console.log(geminiResponse);
    // });
}

chrome.runtime.onMessage.addListener(
    function (request, sender) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        console.log(request);

        // if (request.greeting === "hello"){
        //     chrome.tts.speak("Hello, world.", {"lang": "en-US", "rate": 1.0});
        //     sendResponse({
        //         farewell: "goodbye"
        //     });
        // }

        chrome.tabs.captureVisibleTab(
            {
                "format": "jpeg",
                "quality": 40
            }
        ).then((dataUrl) => sendWebsiteDescriptionRequest(dataUrl, {document: request.document}));
    }
);


chrome.commands.onCommand.addListener(async (command) => {
    if(command !== "analysePage")
        return;

    const tabScreenshot = await chrome.tabs.captureVisibleTab(
        {
            "format": "jpeg",
            "quality": 40
        }
    );
    const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });

    const tabDocumentInfo = await chrome.tabs.sendMessage(tab.id, {action: ACTIONS.getDocumentInfo});

    const query = await chrome.tabs.sendMessage(tab.id, {action: ACTIONS.getUserQuery});
    if (query !== null && query !== "") {
        sendWebsiteActionRequest(tabScreenshot, tabDocumentInfo, query, tab);
    }
});


chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).finally();

// chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
//     if (!tab.url) return;
//
//     const url = new URL(tab.url);
//
//     if (url.origin === 'https://example.com') {
//         chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
//     } else {
//         chrome.sidePanel.setOptions({ tabId, enabled: false });
//     }
// });