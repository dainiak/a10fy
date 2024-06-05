import { JSONParser } from "@streamparser/json";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getInlineImage(imageData) {
    return {
        inlineData: {
            mimeType: "image/jpeg",
            data: imageData.replace(/^data:image\/?[A-z]*;base64,/, "")
        }
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
                `The simplified representation of the DOM structure of the website is as follows: \n` +
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

    const GOOGLE_API_KEY = "AIzaSyD4YqBxteEa_aAR4wr1VEMNsMJJdnCkVXQ";
    const gemini = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel(
        {
            model: "gemini-1.5-flash"
        }
    );
    gemini.generationConfig.responseMimeType = "application/json";

    const parser = new JSONParser({stringBufferSize: undefined, paths: ["$.*.*"]});

    parser.onValue = ({value, key, parent, stack}) => {
        console.log(stack, value);
    };

    const result = await gemini.generateContentStream(requestData);

    for await (const chunk of result.stream) {
        parser.write(chunk.text())
    }

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

    const tabScreenshot = chrome.tabs.captureVisibleTab(
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

});


