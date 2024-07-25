import {uniqueString} from "../uniqueId";
import {HarmBlockThreshold} from "@google/generative-ai";
import {SerializedModel} from "./dataModels";
import {getFromStorage, setToStorage} from "../storageHandling";
import {storageKeys} from "../constants";

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