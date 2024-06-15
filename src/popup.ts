document.addEventListener("DOMContentLoaded", function () {
  let startRecordBtn = document.getElementById("start-record-btn");
  let statusText = document.getElementById("status");
  startRecordBtn?.addEventListener("click", function () {
    startRecording();
    if(statusText)
      statusText.textContent = "Recording.";
  });

  function startRecording() {
    if (!("webkitSpeechRecognition" in window) && statusText) {
      statusText.textContent = "Web Speech API is not supported by this browser.";
      return;
    }

  }
});
