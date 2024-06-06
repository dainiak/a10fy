import { JSONParser } from "@streamparser/json";
import { GoogleGenerativeAI } from "@google/generative-ai";

const cssPrefix = "a10fy_";

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

async function asyncRequestAndParse(requestData, parser) {
    const gemini = getJsonGeminiModel();
    const result = await gemini.generateContentStream(requestData);

    for await (const chunk of result.stream) {
        parser.write(chunk.text())
    }
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

    const parser = new JSONParser({stringBufferSize: undefined, paths: ["$.*.*"]});
    parser.onValue = ({value, key, parent, stack}) => {
        console.log(stack, value);
    };

    await asyncRequestAndParse(requestData, parser);

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
            text:  `The user wants to perform the following action on the webpage: \`\`\`${actionDescription}\`\`\`. Return a JSON object with keys "isPossible" - a boolean value signifying if the action could be technically performed on the webpage or not, and "steps" - an array of steps of DOM element tweaking necessary to perform the action. Each step is represented with an array [elementIndex, stepCommand] or [elementIndex, stepCommand, value]. The elementIndex is the number that stands after ${cssPrefix}-prefix in the element's CSS class. The stepCommand is a string that represents the action to be performed on the element. The following are the possible values of stepCommand with corresponding action on the DOM element:
    - "click" - run "element.click()"
    - "focus" - run "element.focus()"
    - "scrollIntoView" - run "element.scrollIntoView()"
    - "select" - run "element.select()"
    - "submit" - run "element.submit()"
    - "setChecked" - set "element.checked" to true
    - "setUnchecked" - set "element.checked" to false
    - "remove" - run "element.remove()"
    - "hide" - set "element.style.display" to "none"
    - "setValue" - set "element.value" to the provided value
    - "setText" - set "element.textContent" to the provided value
The step sequence should ideally correspond to what a user would do to perform the action. I.e., before changing a text input value, the user would first click or focus on it.
        `
        }
    ];

    let requestData = {
        contents: [{
            role: "user",
            parts: requestParts
        }]
    }

    const parser = new JSONParser({stringBufferSize: undefined, paths: ["$.steps.*"]});

    parser.onValue = ({value, key, parent, stack}) => {
        console.log(stack, value);
        let index, command, val;
        if (value.length === 2)
            [index, command] = value;
        else
            [index, command, val] = value;
        chrome.tabs.sendMessage(tab.id, {action: "performCommand", index: index, command: command, value: val})
    };

    asyncRequestAndParse(requestData, parser);

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
    function (request, sender, sendResponse) {
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

    const tabDocumentInfo = await chrome.tabs.sendMessage(tab.id, {action: "getDocumentInfo"});

    sendWebsiteActionRequest(tabScreenshot, tabDocumentInfo, "Search for \"chrome side panel\"", tab);
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