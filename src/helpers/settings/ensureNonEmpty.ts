import {uniqueString} from "../uniqueId";
import {HarmBlockThreshold} from "@google/generative-ai";
import {SerializedModel, SerializedPersona} from "./dataModels";
import {getFromStorage, setToStorage} from "../storage/storageHandling";
import {storageKeys} from "../constants";
import {getDefaultChatSystemPromptTemplate} from "../prompts";

export async function ensureNonEmptyModels() {
    let models: SerializedModel[] = (await getFromStorage(storageKeys.models) || []).sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    if (models.length === 0) {
        models = [{
            sortingIndex: 0,
            id: uniqueString(),
            name: "Default",
            description: "Default model",
            technicalName: "gemini-1.5-flash-latest",
            topK: null,
            topP: null,
            temperature: null,
            isVisibleInChat: true,
            apiKey: "",
            safetySettings: {
                dangerousContent: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                hateSpeech: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                harassment: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                sexuallyExplicit: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED
            }
        } as SerializedModel];
        await setToStorage(storageKeys.models, models);
    }
    return models;
}

export async function ensureNonEmptyPersonas() {
    let personas: SerializedPersona[] = (await getFromStorage(storageKeys.personas) || []).sort((a: SerializedPersona, b: SerializedPersona) => a.sortingIndex - b.sortingIndex);
    if (!personas.length) {
        personas = [{
            sortingIndex: 0,
            id: uniqueString(),
            name: "Default",
            description: "Default Persona",
            defaultModel: "",
            systemInstructionTemplate: getDefaultChatSystemPromptTemplate(),
            isVisibleInChat: true
        } as SerializedPersona];
        await setToStorage(storageKeys.personas, personas);
    }
    return personas;
}