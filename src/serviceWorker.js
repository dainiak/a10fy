import { JSONParser } from "@streamparser/json";


function testJsonParser() {
    const jsonparser = new JSONParser({stringBufferSize: undefined, paths: ["$.users.*"]});
    jsonparser.onValue = ({value, key, parent, stack}) => {
        console.log(value);
    };

    fetch("https://dummyjson.com/users").then(response => response.body.getReader()).then(
        async reader => {
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                jsonparser.write(value);
            }
        }
    )
}

function getInlineImage(imageData) {
    return {
        "inline_data": {
            "mime_type": "image/jpeg",
            "data": imageData.replace(/^data:image\/?[A-z]*;base64,/, "")
        }
    }
}

function extractJson(llmOutput) {
    llmOutput = llmOutput.slice(llmOutput.indexOf("{"), llmOutput.lastIndexOf("}") + 1);
    try {
        return JSON.parse(llmOutput);
    }
    catch {
        return {};
    }
}

function sendWebsiteDescriptionRequest(dataUrl, request){
    let personDescription = "9-year-old non-native English speaking child";
    let geminiRequestData = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "Here is a screenshot of a website:"
                    },
                    getInlineImage(dataUrl),
                    {
                        "text": (
                            `The website title is \`\`\`${request.document.title}\`\`\`.\n` +
                            `The website URL is \`\`\`${request.document.url}\`\`\`.\n` +
                            `The simplified representation of the DOM structure of the website is as follows: \n` +
                            `\`\`\`${request.document.html}\`\`\``
                        )
                    },
                    {
                        "text":  `Describe this website in one medium-sized paragraph for a ${personDescription} and provide the list of at most 10 useful actions that such person can perform on this website (follow some links, play some video, perform search etc.). Return a JSON object with keys 'website_description' and 'available_actions'.`
                    }
                ]
            }
        ],
        "generation_config": {
            "response_mime_type": "application/json"
        }
    };
    const GOOGLE_API_KEY = "AIzaSyD4YqBxteEa_aAR4wr1VEMNsMJJdnCkVXQ";
    const MODEL_NAME = "gemini-1.5-flash";
    const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
    const streamingMode = false;
    const geminiCommand = streamingMode ? "streamGenerateContent" : "generateContent";
    const geminiUrl = `${API_BASE}/models/${MODEL_NAME}:${geminiCommand}?key=${GOOGLE_API_KEY}`;

    fetch(geminiUrl, {
        "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": JSON.stringify(geminiRequestData)
    }).then((response) => {
        return response.json();
    }).then((data) => {
        // console.log(data);
        let geminiResponse = data.candidates[0].content.parts[0]["text"];
        // chrome.tts.speak(geminiResponse, {"lang": "en-US", "rate": 1.0});
        console.log(geminiResponse);
    });
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        testJsonParser();
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        console.log(request);

        // if (request.greeting === "hello"){
        //     chrome.tts.speak("Hello, world.", {"lang": "en-US", "rate": 1.0});
        //     sendResponse({
        //         farewell: "goodbye"
        //     });
        // }

        // chrome.tabs.captureVisibleTab(
        //     {
        //         "format": "jpeg",
        //         "quality": 40
        //     }
        // ).then((dataUrl) => sendWebsiteDescriptionRequest(dataUrl, {document: request.document}));
    }
);


