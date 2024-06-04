chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        console.log(request);

        // if (request.greeting === "hello"){
        //     chrome.tts.speak("Hello, world.", {"lang": "en-US", "rate": 1.0});
        //     sendResponse({
        //         farewell: "goodbye"
        //     });
        // }

        /*chrome.tabs.captureVisibleTab(
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
                            {
                                "text": "Here is a screenshot of a website. Describe this website for a visually impaired person."
                            },
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
            let GOOGLE_API_KEY = "AIzaSyD4YqBxteEa_aAR4wr1VEMNsMJJdnCkVXQ";
            let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
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
        })*/
    }
);


