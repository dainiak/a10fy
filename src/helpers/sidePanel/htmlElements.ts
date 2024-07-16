const themeType: ("dark" | "light") = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

const chatPaneInputTextArea = document.querySelector('.a10fy-input-area textarea') as HTMLTextAreaElement;
const chatPaneChatArea = document.querySelector('.a10fy-chat-area') as HTMLDivElement;
const currentChatSettingsCard = document.getElementById("currentChatSettingsCard") as HTMLDivElement;
const chatPaneInputArea = document.querySelector(".a10fy-input-area") as HTMLDivElement;
const chatInputFormElement = document.querySelector('.a10fy-input-area form') as HTMLFormElement;
const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;


function updateInputArea() {
    chatPaneInputTextArea.style.setProperty("height", "auto");
    const newHeight = Math.min(chatPaneInputTextArea.scrollHeight, 183);
    chatPaneInputTextArea.style.setProperty("height", `${newHeight}px`);
    chatPaneInputTextArea.style.setProperty("overflow-y", chatPaneInputTextArea.scrollHeight > 180 ? 'auto' : 'hidden');
    chatPaneChatArea.style.setProperty("height", `calc(100vh - ${73 + newHeight}px)`);
}

function makeUserInputAreaAutoexpandable() {
    chatPaneInputTextArea.addEventListener('input', updateInputArea);
    updateInputArea();
}


export {chatPaneInputTextArea, chatPaneChatArea, currentChatSettingsCard, chatPaneInputArea, chatInputFormElement, hljsStyle, themeType, updateInputArea, makeUserInputAreaAutoexpandable};