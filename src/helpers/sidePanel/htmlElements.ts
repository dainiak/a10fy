import * as Bootstrap from "bootstrap";

const themeType: ("dark" | "light") = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

const chatPaneInputTextArea = document.querySelector('.a10fy-input-area textarea') as HTMLTextAreaElement;
const chatPaneChatArea = document.querySelector('.a10fy-chat-area') as HTMLDivElement;
const chatPaneInputArea = document.querySelector(".a10fy-input-area") as HTMLDivElement;
const chatInputFormElement = document.querySelector('.a10fy-input-area form') as HTMLFormElement;
const chatListTab = document.getElementById("chatListTab") as HTMLElement;

const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;


function updateInputAreaHeight() {
    chatPaneInputTextArea.style.setProperty("height", "auto");
    const newHeight = Math.min(chatPaneInputTextArea.scrollHeight, 183);
    chatPaneInputTextArea.style.setProperty("height", `${newHeight}px`);
    chatPaneInputTextArea.style.setProperty("overflow-y", chatPaneInputTextArea.scrollHeight > 180 ? 'auto' : 'hidden');
    chatPaneChatArea.style.setProperty("height", `calc(100vh - ${73 + newHeight}px)`);
}

function makeUserInputAreaAutoexpandable() {
    chatPaneInputTextArea.addEventListener('input', updateInputAreaHeight);
    updateInputAreaHeight();
}

function showChatTab() {
    Bootstrap.Tab.getInstance(document.getElementById("chatTab") as HTMLElement)?.show()
}

function showChatListTab() {
    Bootstrap.Tab.getInstance(chatListTab)?.show()
}

function showActionsTab() {
    Bootstrap.Tab.getInstance(document.getElementById("browserActionsTab") as HTMLElement)?.show()
}

function showSettingsTab() {
    Bootstrap.Tab.getInstance(document.getElementById("settingsTab") as HTMLElement)?.show()
}


export {
    chatPaneInputTextArea, chatPaneChatArea, chatPaneInputArea, chatInputFormElement, hljsStyle, themeType, updateInputAreaHeight, makeUserInputAreaAutoexpandable,
    showSettingsTab, showActionsTab, showChatListTab, showChatTab, chatListTab
};