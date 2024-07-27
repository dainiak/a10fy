import {getSummarizationJSONModel} from "./geminiInterfacing";
import {ChatMessageTypes, getChat, SerializedChat} from "./sidePanel/chatStorage";

function truncateMessageContent(messageContent: string, maxLength: number = 1000) {
    if (messageContent.length <= maxLength)
        return messageContent;
    maxLength -= 3;
    return messageContent.slice(0, Math.floor(maxLength / 2)) + "\n...\n" + messageContent.slice(Math.ceil(messageContent.length - maxLength / 2));
}

export async function summarizeChat(chatId: string) {
    const chat = await getChat(chatId) as SerializedChat;
    const summarizationModel = await getSummarizationJSONModel();
    const chatContent = chat.messages.map(message => {
        const tag = message.type === ChatMessageTypes.USER ? "user-message" : "assistant-message";
        return `<${tag}>\n${truncateMessageContent(message.content)}\n</${tag}>`;
    }).join("\n\n");
    const modelResult = await summarizationModel.generateContent(chatContent);
    const resultJSON = JSON.parse(modelResult.response.text());
    console.log(resultJSON);
    return resultJSON.title;
}