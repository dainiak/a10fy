document.addEventListener("DOMContentLoaded", function () {
  var startRecordBtn = document.getElementById("start-record-btn");
  var statusText = document.getElementById("status");
  startRecordBtn.addEventListener("click", function () {
    startRecording();
    statusText.textContent = "Recording.";
  });

  function startRecording() {
    if (!("webkitSpeechRecognition" in window)) {
      statusText.textContent = "Web Speech API is not supported by this browser.";
      return;
    }

    var recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = function () {
      statusText.textContent = "Listening...";
    };

    recognition.onresult = function (event) {
      var transcript = event.results[0][0].transcript;
      statusText.textContent = "You said: " + transcript;
    };

    recognition.onerror = function (event) {
      statusText.textContent = "Error occurred: " + event.error;
    };

    recognition.onend = function () {
      statusText.textContent = "Press the button to start recording";
    };

    recognition.start();
  }
});
