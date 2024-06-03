// chrome.action.onClicked.addListener((tab) => {
//     chrome.scripting.executeScript({
//         target: {tabId: tab.id},
//         files: ["content-script.js"]
//     });
// });


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.greeting === "hello"){
            chrome.tts.speak("Hello, world.", {"lang": "en-US", "rate": 1.0});
            sendResponse({farewell: "goodbye"});
        }

        chrome.tabs.captureVisibleTab(
            {
                "format": "jpeg",
                "quality": 40
            }
        ).then((dataUrl) => {
            dataUrl = dataUrl.replace(/^data:image\/?[A-z]*;base64,/, "");
            let geminiRequestData = {
                "contents": [
                    {
                        "parts":[
                            {"text": "What is this picture?"},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": dataUrl
                                }
                            }
                        ]
                    }
                ]
            };
            let geminiRequestHeaders = {
                "Content-Type": "application/json"
            };
            let GOOGLE_API_KEY = "AIzaSyD4YqBxteEa_aAR4wr1VEMNsMJJdnCkVXQ";
            let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
            fetch(geminiUrl, {
                "method": "POST",
                "headers": geminiRequestHeaders,
                "body": JSON.stringify(geminiRequestData)
            }).then((response) => {
                return response.json();
            }).then((data) => {
                console.log(data);
                // let geminiResponse = data["contents"][0]["parts"][1]["text"];
                // chrome.tts.speak(geminiResponse, {"lang": "en-US", "rate": 1.0});
            });
        })
    }
);


