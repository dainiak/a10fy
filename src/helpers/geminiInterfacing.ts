import {
    FunctionDeclarationSchemaType,
    GenerateContentRequest,
    GenerationConfig,
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
    ResponseSchema
} from "@google/generative-ai";
import type {ParsedElementInfo} from "@streamparser/json/dist/mjs/utils/types/ParsedElementInfo";
import {JSONParser} from "@streamparser/json";
import {storageKeys} from "./constants";
import {getAssistantSystemPrompt, getChatSystemPrompt} from "./prompts";
import {getFromStorage} from "./storageHandling";
import {SerializedModel, SerializedPersona} from "./settings/dataModels";

async function getJSONGeminiModel() {
    const systemInstruction = getAssistantSystemPrompt();
    const assistantModelSettings: SerializedModel | null = await getFromStorage(storageKeys.assistantModel);
    const apiKey = assistantModelSettings?.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);
    const responseSchema: ResponseSchema = {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            //@ts-ignore
            understoodAs: {
                "type": FunctionDeclarationSchemaType.STRING,
            },
            //@ts-ignore
            clarificationNeeded: {
                type: FunctionDeclarationSchemaType.BOOLEAN,
            },
            //@ts-ignore
            actionList: {
                type: FunctionDeclarationSchemaType.ARRAY,
                //@ts-ignore
                items: {
                    type: FunctionDeclarationSchemaType.ARRAY
                }
            }
        }
    }
    const generationConfig: GenerationConfig = {
        topK: assistantModelSettings?.topK || 64,
        topP: assistantModelSettings?.topP || 0.95,
        temperature: assistantModelSettings?.temperature || 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: responseSchema
    };

    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: assistantModelSettings?.safetySettings?.dangerousContent || HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: assistantModelSettings?.safetySettings?.hateSpeech || HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: assistantModelSettings?.safetySettings?.harassment || HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: assistantModelSettings?.safetySettings?.sexuallyExplicit || HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
    ];

    return (new GoogleGenerativeAI(apiKey)).getGenerativeModel(
        {
            model: assistantModelSettings?.technicalName || "gemini-1.5-flash-latest",
            generationConfig: generationConfig,
            safetySettings: safetySettings,
            systemInstruction: systemInstruction
        }
    );
}

async function asyncRequestAndParse(requestData: GenerateContentRequest, jsonPaths: Array<string>, onValueCallback: (parsedElementInfo: ParsedElementInfo) => void) {
    const parser = new JSONParser({stringBufferSize: undefined, paths: jsonPaths});

    parser.onValue = onValueCallback;
    parser.onError = (error) => console.log("Error while parsing JSON: ", error);

    const gemini = await getJSONGeminiModel();
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
    const embeddingModelSettings: SerializedModel | null = await getFromStorage(storageKeys.embeddingModel);
    const apiKey = embeddingModelSettings?.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);
    const modelName = embeddingModelSettings?.technicalName || "text-embedding-004";
    const geminiEmbed = (new GoogleGenerativeAI(apiKey)).getGenerativeModel({model: modelName});
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

async function getGeminiTextModel(model: SerializedModel, persona: SerializedPersona) {
    const apiKey = model.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);
    const generationConfig: GenerationConfig = {
        temperature: model.temperature || 0,
        topK: model.topK || 64,
        topP: model.topP || 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain"
    };

    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: model.safetySettings.dangerousContent
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: model.safetySettings.hateSpeech
        },
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: model.safetySettings.harassment
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: model.safetySettings.sexuallyExplicit
        }
    ];

    return (new GoogleGenerativeAI(apiKey)).getGenerativeModel({
        model: model.technicalName,
        generationConfig: generationConfig,
        safetySettings: safetySettings,
        systemInstruction: getChatSystemPrompt(persona.systemInstruction)
    });
}

export {asyncRequestAndParse, getTextEmbedding, getGeminiTextModel};