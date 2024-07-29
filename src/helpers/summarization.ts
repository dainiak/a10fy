import {getSummarizationJSONModel} from "./geminiInterfacing";
import {ChatMessageTypes, SerializedChat} from "./sidePanel/chatStorage";

function truncateMessageContent(messageContent: string, maxLength: number = 1000) {
    if (messageContent.length <= maxLength)
        return messageContent;
    maxLength -= 3;
    return messageContent.slice(0, Math.floor(maxLength / 2)) + "\n...\n" + messageContent.slice(Math.ceil(messageContent.length - maxLength / 2));
}


export async function summarizeChat(chat: SerializedChat): Promise<{title: string, summaries: string[]}> {
    const systemInstruction = `
You are a large language model. The current date is ${new Date().toISOString().slice(0, 10)}. You will be given a dialog between a user and an AI assistant, the messages in the dialog being inside <user-message>...</user-message> and <assistant-message>...</assistant-message> tags. You need to output a JSON object with key "summaries" and "title". The value of "summaries" key is an array of strings (from one to three), each string is a long sentence that summarizes the dialog or part of a dialog if the dialog consists of relatively independent parts. You should provide a summary that captures the main points of the dialog, mentioning topic-specific keywords. You should not include any information that is not present in the dialog. You should also not output the "summaries" array of length more than one if the dialog was on one topic and did not diverge much from it. The value of "title" key should be a single string: a short title for the whole dialog. 
`.trim();

    const chatContent = chat.messages.slice(0, 15).map(message => {
        const tag = message.type === ChatMessageTypes.USER ? "user-message" : "assistant-message";
        return `<${tag}>\n${truncateMessageContent(message.content)}\n</${tag}>`;
    }).join("\n\n");

    try {
        const summarizationModel = await getSummarizationJSONModel(systemInstruction);
        const modelResult = await summarizationModel.generateContent(chatContent);
        return JSON.parse(modelResult.response.text());
    }
    catch {
        return {
            title: "(Error during title generation)",
            summaries: []
        }
    }
}