import {HarmBlockThreshold} from "@google/generative-ai";

export interface SerializedPersona {
    sortingIndex: number,
    id: string,
    name: string,
    description: string,
    defaultModel: string,
    systemInstruction: string
}

export interface SerializedModel {
    sortingIndex: number,
    id: string,
    name: string,
    description: string,
    technicalName: string,
    topK: number | null,
    topP: number | null,
    temperature: number | null,
    apiKey: string,
    safetySettings: {
        dangerousContent: HarmBlockThreshold,
        hateSpeech: HarmBlockThreshold,
        harassment: HarmBlockThreshold,
        sexuallyExplicit: HarmBlockThreshold
    }
}
