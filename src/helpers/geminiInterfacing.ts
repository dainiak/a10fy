import {
    GenerateContentRequest,
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory
} from "@google/generative-ai";
import type {ParsedElementInfo} from "@streamparser/json/dist/mjs/utils/types/ParsedElementInfo";
import {JSONParser} from "@streamparser/json";
import {storageKeys} from "./constants";
import {GOOGLE_API_KEY_TEMP} from "../_secrets";
import {getOutputFormatDescription} from "./promptParts";
import {getAssistantSystemPrompt, getChatSystemPrompt} from "./prompts";

async function getJsonGeminiModel() {
    const outputDescription = getOutputFormatDescription();
    const systemInstruction = getAssistantSystemPrompt();

    const GOOGLE_API_KEY = (await chrome.storage.sync.get([storageKeys.googleApiKey]))[storageKeys.googleApiKey];
    const generationConfig = {
        temperature: 0,
        // topP: 0.95,
        // topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
    };

    const safetySettings = [
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
        }
    ];

    const gemini = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel(
        {
            model: "gemini-1.5-flash-latest",
            generationConfig: generationConfig,
            safetySettings: safetySettings,
            systemInstruction: systemInstruction
        }
    );
    // gemini.generationConfig.responseMimeType = "application/json" or "text/plain";


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

async function getGeminiChat() {
    // const GOOGLE_API_KEY = (await chrome.storage.sync.get([storageKeys.googleApiKey]))[storageKeys.googleApiKey];
    const GOOGLE_API_KEY = GOOGLE_API_KEY_TEMP;
    const gemini = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        systemInstruction: getChatSystemPrompt()
    });

    return gemini.startChat();
}

export {asyncRequestAndParse, getTextEmbedding, getGeminiChat};