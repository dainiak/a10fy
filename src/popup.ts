document.addEventListener("DOMContentLoaded", function () {
  document.body.setAttribute(
      "data-bs-theme",
      window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
  );


  let statusText = document.getElementById("status");
  let startRecordBtn = document.getElementById("voiceCommandButton") as HTMLButtonElement;
  startRecordBtn.onclick = () => {
    if(statusText)
      statusText.textContent = "Recording.";
  };

  let openSidePanelBtn = document.getElementById("openSidePanelButton") as HTMLButtonElement;
  openSidePanelBtn.onclick = async function () {
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({windowId: currentWindow.id});
  }
});
