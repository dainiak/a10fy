import Tab from "bootstrap/js/dist/tab";

export const themeType: ("dark" | "light") = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

export const chatPaneInputTextArea = document.querySelector('.a10fy-input-area textarea') as HTMLTextAreaElement;
export const chatPaneChatArea = document.querySelector('.a10fy-chat-area') as HTMLDivElement;
export const chatPaneInputArea = document.querySelector(".a10fy-input-area") as HTMLDivElement;
export const chatInputFormElement = document.querySelector('.a10fy-input-area form') as HTMLFormElement;
export const chatListTab = document.getElementById("chatListTab") as HTMLElement;
export const pageListTab = document.getElementById("pageListTab") as HTMLElement;
export const actionResultsContainer = document.getElementById("actionResultsContainer") as HTMLDivElement;
export const inputAreaAttachmentIconsContainer = document.querySelector(".a10fy-input-area-icons") as HTMLDivElement;

export const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;


export function updateInputAreaHeight() {
    chatPaneInputTextArea.style.setProperty("height", "auto");
    const newHeight = Math.min(chatPaneInputTextArea.scrollHeight, 183);
    chatPaneInputTextArea.style.setProperty("height", `${newHeight}px`);
    chatPaneInputTextArea.style.setProperty("overflow-y", chatPaneInputTextArea.scrollHeight > 180 ? 'auto' : 'hidden');
    chatPaneChatArea.style.setProperty("height", `calc(100dvh - ${73 + newHeight}px)`);
}

export function makeUserInputAreaAutoexpandable() {
    chatPaneInputTextArea.addEventListener('input', updateInputAreaHeight);
    updateInputAreaHeight();
}

export function showChatPane() {
    Tab.getOrCreateInstance(document.getElementById("chatTab") as HTMLElement).show()
}

export function showChatListPane() {
    Tab.getOrCreateInstance(chatListTab).show()
}

export function showActionsPane() {
    Tab.getOrCreateInstance(document.getElementById("actionResultsTab") as HTMLElement).show()
}

export function showSettingsPane() {
    Tab.getOrCreateInstance(document.getElementById("settingsTab") as HTMLElement).show()
}
