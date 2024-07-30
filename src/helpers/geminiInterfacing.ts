import {
    FunctionDeclarationSchema,
    FunctionDeclarationSchemaProperty,
    FunctionDeclarationSchemaType,
    GenerateContentRequest,
    GenerationConfig,
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
    ResponseSchema, Schema
} from "@google/generative-ai";
import type {ParsedElementInfo} from "@streamparser/json/dist/mjs/utils/types/ParsedElementInfo";
import {JSONParser} from "@streamparser/json";
import {storageKeys} from "./constants";
import {
    getAssistantSystemPrompt,
    getChatSystemInstructionDummyScope, getDefaultChatSystemPromptTemplate
} from "./prompts";
import {getFromStorage} from "./storage/storageHandling";
import {SerializedModel, SerializedPersona} from "./settings/dataModels";
import {liquidEngine} from "./sidePanel/liquid";

function alertOfAbsentApiKey() {
    if(chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage().catch();
    } else if(window) {
        window.alert("API key is not set. Please set the API key in the settings page.");
    }
}

async function getAssistantJSONModel() {
    const systemInstruction = getAssistantSystemPrompt();
    const assistantModelSettings: SerializedModel | null = await getFromStorage(storageKeys.assistantModel);
    const apiKey = assistantModelSettings?.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);
    if(!apiKey) {
        alertOfAbsentApiKey();
        return null;
    }

    const responseSchema: ResponseSchema = {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            understoodAs: {
                type: FunctionDeclarationSchemaType.STRING,
            } as FunctionDeclarationSchema,
            clarificationNeeded: {
                type: FunctionDeclarationSchemaType.BOOLEAN,
            } as FunctionDeclarationSchema,
            // @ts-ignore
            actionList: {
                type: FunctionDeclarationSchemaType.ARRAY,
                items: {
                    type: FunctionDeclarationSchemaType.ARRAY
                },
            } as FunctionDeclarationSchema
        }
    }
    const generationConfig: GenerationConfig = {
        topK: assistantModelSettings?.topK || 64,
        topP: assistantModelSettings?.topP || 0.95,
        temperature: assistantModelSettings?.temperature || 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        // responseSchema: responseSchema
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

export async function getSummarizationJSONModel(systemInstruction: string) {
    const modelSettings: SerializedModel | null = await getFromStorage(storageKeys.summarizationModel);
    const apiKey = modelSettings?.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);

    if(!apiKey) {
        alertOfAbsentApiKey();
        return null;
    }

    const generationConfig: GenerationConfig = {
        topK: modelSettings?.topK || 64,
        topP: modelSettings?.topP || 0.95,
        temperature: modelSettings?.temperature || 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
    };

    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: modelSettings?.safetySettings?.dangerousContent || HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: modelSettings?.safetySettings?.hateSpeech || HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: modelSettings?.safetySettings?.harassment || HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: modelSettings?.safetySettings?.sexuallyExplicit || HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
    ];

    return (new GoogleGenerativeAI(apiKey)).getGenerativeModel(
        {
            model: modelSettings?.technicalName || "gemini-1.5-flash-latest",
            generationConfig: generationConfig,
            safetySettings: safetySettings,
            systemInstruction: systemInstruction
        }
    );
}

export async function asyncRequestAndParseJSON(requestData: GenerateContentRequest, jsonPaths: Array<string>, onValueCallback: (parsedElementInfo: ParsedElementInfo) => void) {
    const parser = new JSONParser({stringBufferSize: undefined, paths: jsonPaths});

    parser.onValue = onValueCallback;
    parser.onError = () => {}; // TODO: log parsing error

    const gemini = await getAssistantJSONModel();
    if(!gemini)
        return null;
    const result = await gemini.generateContentStream(requestData);
    let completeText = "";

    for await (const chunk of result.stream) {
        const text = chunk.text();
        parser.write(text);
        completeText += text;
    }
    // TODO: log parsing errors
}

export async function getTextEmbedding(data: string | string[]) {
    const embeddingModelSettings: SerializedModel | null = await getFromStorage(storageKeys.embeddingModel);
    const apiKey = embeddingModelSettings?.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);
    if(!apiKey) {
        alertOfAbsentApiKey();
        return null;
    }

    const modelName = embeddingModelSettings?.technicalName || "text-embedding-004";
    const geminiEmbed = (new GoogleGenerativeAI(apiKey)).getGenerativeModel({model: modelName});

    if(Array.isArray(data)) {
        const embeddings = await geminiEmbed.batchEmbedContents(
            {
                requests: data.map((text) => ({content: {role: "user", parts: [{text:text}]}}))
            }
        );
        return embeddings.embeddings.map((embedding) => embedding.values);
    }
    else {
        const embedding = await geminiEmbed.embedContent(data);
        return embedding.embedding.values;
    }
}

export async function getGeminiTextModel(model: SerializedModel, persona: SerializedPersona | null) {
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

    const scope = getChatSystemInstructionDummyScope();
    scope.model.name = model.name;
    scope.model.description = model.description;
    scope.persona.name = persona ? persona.name : "";
    scope.persona.description = persona ? persona.description : "";
    const systemInstruction = liquidEngine.parseAndRenderSync(persona ? persona.systemInstructionTemplate : getDefaultChatSystemPromptTemplate(), scope);

    return (new GoogleGenerativeAI(apiKey)).getGenerativeModel({
        model: model.technicalName,
        generationConfig: generationConfig,
        safetySettings: safetySettings,
        systemInstruction: systemInstruction
    });
}

export async function getModelForCustomAction(model: SerializedModel, systemInstruction: string, jsonMode: boolean = false) {
    const apiKey = model.apiKey || await getFromStorage(storageKeys.mainGoogleApiKey);
    const generationConfig: GenerationConfig = {
        temperature: model.temperature || 0,
        topK: model.topK || 64,
        topP: model.topP || 0.95,
        maxOutputTokens: 8192,
        responseMimeType: jsonMode ? "application/json" : "text/plain"
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
        systemInstruction: systemInstruction
    });
}
