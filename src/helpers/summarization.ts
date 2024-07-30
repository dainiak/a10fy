import {getSummarizationJSONModel, getTextEmbedding} from "./geminiInterfacing";
import {ChatMessageTypes, SerializedChat} from "./storage/chatStorage";
import {SerializedPageSnapshot} from "./storage/pageStorage";
import {getInlineDataPart} from "./promptParts";
import {Part} from "@google/generative-ai";

function truncateMessageContent(messageContent: string, maxLength: number = 1000) {
    if (messageContent.length <= maxLength)
        return messageContent;
    maxLength -= 3;
    return messageContent.slice(0, Math.floor(maxLength / 2)) + "\n...\n" + messageContent.slice(Math.ceil(messageContent.length - maxLength / 2));
}


export async function summarizeChat(chat: SerializedChat): Promise<{title: string, summaries: string[], vectors: number[][]} | null> {
    const systemInstruction = `
You are a large language model. The current date is ${new Date().toISOString().slice(0, 10)}. You will be given a dialog between a user and an AI assistant, the messages in the dialog being inside <user-message>...</user-message> and <assistant-message>...</assistant-message> tags. You need to output a JSON object with key "summaries" and "title". The value of "summaries" key is an array of strings (from one to three), each string is a long sentence that summarizes the dialog or part of a dialog if the dialog consists of relatively independent parts (mention what the user asked for and what the model responded generally speaking). You should provide a summary that captures the main points of the dialog, mentioning topic-specific keywords. You should not include any information that is not present in the dialog. You should also not output the "summaries" array of length more than one if the dialog was on one topic and did not diverge much from it. The value of "title" key should be a single string: a short title for the whole dialog. 
`.trim();

    const chatContent = chat.messages.slice(0, 15).map(message => {
        const tag = message.type === ChatMessageTypes.USER ? "user-message" : "assistant-message";
        return `<${tag}>\n${truncateMessageContent(message.content)}\n</${tag}>`;
    }).join("\n\n");

    try {
        const summarizationModel = await getSummarizationJSONModel(systemInstruction);
        if(!summarizationModel)
            return null;
        const modelResult = await summarizationModel.generateContent(chatContent);
        const summarizationResults = JSON.parse(modelResult.response.text());
        if(summarizationResults.summaries instanceof String) {
            summarizationResults.summaries = [summarizationResults.summaries];
        }
        if(!Array.isArray(summarizationResults.summaries)) {
            summarizationResults.summaries = [];
        }
        if(summarizationResults.summaries.length > 0) {
            summarizationResults.summaries = summarizationResults.summaries.slice(0, 3);
            try {
                summarizationResults.vectors = await getTextEmbedding(summarizationResults.summaries);
            }
            catch {}
        }
        return summarizationResults;
    }
    catch {
        return null;
    }
}

export async function summarizePage(page: SerializedPageSnapshot): Promise<{title: string, keywords: string[], summaries: string[], vectors: number[][]} | null> {
    const systemInstruction = `
You are a large language model. The current date is ${new Date().toISOString().slice(0, 10)}. You will be given information on a webpage and you will need to summarize the page. You need to output a JSON object with key "title", "keywords", and "summaries". The value of the "title" key should equal to the provided title of the page if the title is informative and represents the content of the page well; otherwise you can provide you own version of the title. The "keywords" is an array of strings with topic-specific keywords (up to ten) for the webpage. The value of "summaries" key is an array of strings (from one to three), each of these strings being a medium-sized paragraph that summarizes the page or part of the page if the page consists of relatively independent parts. You should provide a summary that captures the main points of the page. You should not output the "summaries" array of length more than one if the page was on one topic and did not diverge much from it.`.trim();

    const parts: Part[] = [];
    parts.push({
        text: `Page title: \`\`\`${page.title.replace(/```/g, '"""').slice(0, 1000)}\`\`\``
    })
    parts.push({
        text: `Page url: \`\`\`${page.url.slice(0, 300)}\`\`\``
    })
    parts.push({
        text: `Page innerText: \`\`\`${page.text.replace(/```/g, '"""').slice(0, 50000)}\`\`\``
    })

    if(page.screenshot) {
        parts.push({
            text: `Page screenshot is attached as an image.`
        });
        parts.push(getInlineDataPart(page.screenshot));
    }

    try {
        const summarizationModel = await getSummarizationJSONModel(systemInstruction);
        if(!summarizationModel)
            return null;
        const modelResult = await summarizationModel.generateContent({
            contents: [
                {
                    role: "user",
                    parts: parts
                }
            ]
        });
        const summarizationResults = JSON.parse(modelResult.response.text());
        if(summarizationResults.summaries instanceof String) {
            summarizationResults.summaries = [summarizationResults.summaries];
        }
        if(!Array.isArray(summarizationResults.summaries)) {
            summarizationResults.summaries = [];
        }
        if(summarizationResults.summaries.length > 0) {
            summarizationResults.summaries = summarizationResults.summaries.slice(0, 3);
            try {
                summarizationResults.vectors = await getTextEmbedding(summarizationResults.summaries);
            }
            catch {}
        }
        if(summarizationResults.keywords instanceof String) {
            summarizationResults.keywords = summarizationResults.keywords.split(/\s*,\s*/);
        }
        if(!Array.isArray(summarizationResults.keywords)) {
            summarizationResults.keywords = [];
        }
        if(!summarizationResults.title) {
            summarizationResults.title = page.title;
        }
        return summarizationResults;
    }
    catch {
        return null;
    }
}