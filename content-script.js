console.log("content-script.js");

chrome.runtime.sendMessage({greeting: "hello"});