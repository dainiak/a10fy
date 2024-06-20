import {GenerateContentRequest, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory} from "@google/generative-ai";
import {JSONParser} from "@streamparser/json";
import {cssPrefix, storageKeys} from "./constants";
import type {ParsedElementInfo} from "@streamparser/json/dist/mjs/utils/types/ParsedElementInfo";
import {getOutputFormatDescription} from "./promptParts";

async function getJsonGeminiModel() {
    const outputDescription = getOutputFormatDescription();
    const systemInstruction = `You are an AI assistant in the form of a Google Chrome extension. You fulfill user requests provided in form of text or voice audio recording. With the user's request you are usually given some details about the webpage the user is currently on (both screenshot of the webpage, as well as a simplified HTML representation of the webpage with ${cssPrefix}-prefixed CSS classes for HTML elements identification). You can use this context to provide the user with the information they need. You can also ask the user for more information if you need it. Your response should always be a ${outputDescription}`;
    console.log("Gemini system instruction: ", systemInstruction);

    const GOOGLE_API_KEY = (await chrome.storage.sync.get([storageKeys.googleApiKey]))[storageKeys.googleApiKey];
    const gemini = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel(
        {
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        }
    );
    gemini.generationConfig.responseMimeType = "application/json";
    gemini.safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
            category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
            threshold: HarmBlockThreshold.BLOCK_NONE
        }
    ]

    return gemini;
}

async function asyncRequestAndParse(requestData: GenerateContentRequest, jsonPaths: Array<string>, onValueCallback: (parsedElementInfo: ParsedElementInfo) => void) {
    const parser = new JSONParser({stringBufferSize: undefined, paths: jsonPaths});

    parser.onValue = onValueCallback;
    parser.onError = (error) => console.log("Error while parsing JSON: ", error);

    const gemini = await getJsonGeminiModel();
    console.log("Request complete data: ", requestData);
    gemini.countTokens(requestData).then((count) => console.log(count));

    const result = await gemini.generateContentStream(requestData);
    let completeText = "";

    for await (const chunk of result.stream) {
        const text = chunk.text();
        parser.write(text);
        completeText += text;
    }

    try {
        console.log("Complete response text: ", JSON.parse(completeText));
    }
    catch {
        console.log("Complete response text: ", completeText);
    }
}

async function getTextEmbedding(data: string | string[]) {
    const GOOGLE_API_KEY = (await chrome.storage.sync.get([storageKeys.googleApiKey]))[storageKeys.googleApiKey];
    const geminiEmbed = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel({model: "text-embedding-004"});
    if (data instanceof String) {
        const embedding = await geminiEmbed.embedContent(data);
        return embedding.embedding.values;
    }
    else if(Array.isArray(data)) {
        const embeddings = await geminiEmbed.batchEmbedContents(
            {
                requests: data.map((text) => ({content: {role: "user", parts: [{text:text}]}}))
            }
        );
        return embeddings.embeddings.map((embedding) => embedding.values);
    }
}

export {asyncRequestAndParse, getTextEmbedding};