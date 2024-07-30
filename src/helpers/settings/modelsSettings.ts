import {storageKeys} from "../constants";
import {SerializedModel} from "./dataModels";
import Modal from "bootstrap/js/dist/modal";
import {HarmBlockThreshold} from "@google/generative-ai";
import {uniqueString} from "../misc";
import {getFromStorage, setToStorage} from "../storage/storageHandling";
import {ensureNonEmptyModels} from "./ensureNonEmpty";

const modelModalElement = document.getElementById("editModelModal") as HTMLDivElement;
const modelModal = Modal.getOrCreateInstance(modelModalElement);


export async function fillModelsTable() {
    let models: SerializedModel[] = await ensureNonEmptyModels();
    const modelsTable = document.getElementById("modelsTable") as HTMLTableElement;
    const tbody = modelsTable.querySelector("tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    models.forEach((model: SerializedModel) => {
        const tr = document.createElement("tr");
        tr.dataset.id = model.id;
        tr.innerHTML = `
            <td class="model-name"></td>
            <td class="model-description"></td>
            <td><code class="model-technical-name"></code></td>
            <td class="model-generation-settings"></td>
            <td><code class="model-api-key"></code></td>
            <td>
                <button class="btn btn-outline-secondary btn-sm edit-btn" data-model-id="${model.id}" aria-label="Edit model" title="Edit model"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm delete-btn" data-model-id="${model.id}" aria-label="Delete model" title="Delete model"><i class="bi bi-trash"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-up-btn" data-model-id="${model.id}" aria-label="Move model up the list" title="Move model up the list"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-down-btn" data-model-id="${model.id}" aria-label="Move model down the list" title="Move model down the list"><i class="bi bi-arrow-down"></i></button>
            </td>
        `;
        (tr.querySelector("td.model-name") as HTMLTableCellElement).textContent = model.name;
        (tr.querySelector("td.model-description") as HTMLTableCellElement).textContent = model.description;
        (tr.querySelector("code.model-technical-name") as HTMLElement).textContent = model.technicalName;
        (tr.querySelector("td.model-generation-settings") as HTMLTableCellElement).textContent = `${model.topK !== null ? model.topK : "—"} / ${model.topP !== null ? model.topP : "—"} / ${model.temperature !== null ? model.temperature : "—"}`;
        (tr.querySelector("code.model-api-key") as HTMLTableCellElement).innerHTML = model.apiKey ? `<code>…${model.apiKey.slice(model.apiKey.length-4)}</code>` : "";
        (tr.querySelector("button.edit-btn") as HTMLButtonElement).onclick = () => editModel(model.id);
        (tr.querySelector("button.delete-btn") as HTMLButtonElement).onclick = () => deleteModel(model.id, tr);
        (tr.querySelector("button.move-up-btn") as HTMLButtonElement).onclick = () => moveModelUp(model.id, tr);
        (tr.querySelector("button.move-down-btn") as HTMLButtonElement).onclick = () => moveModelDown(model.id, tr);
        tbody.appendChild(tr);
    });
    if(!models.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No models defined</td></tr>`;
    }
}

async function moveModelUp(modelId: string, tr: HTMLTableRowElement) {
    const models = await ensureNonEmptyModels();
    const modelIndex = models.findIndex((model: SerializedModel) => model.id === modelId);
    if (modelIndex === 0)
        return;
    models[modelIndex].sortingIndex = modelIndex - 1;
    models[modelIndex - 1].sortingIndex = modelIndex;
    await setToStorage(storageKeys.models, models);
    tr.parentElement?.insertBefore(tr, tr.previousSibling);
}

async function moveModelDown(modelId: string, tr: HTMLTableRowElement) {
    const models = await ensureNonEmptyModels();
    const modelIndex = models.findIndex((model: SerializedModel) => model.id === modelId);
    if (modelIndex === models.length - 1)
        return;
    models[modelIndex].sortingIndex = modelIndex + 1;
    models[modelIndex + 1].sortingIndex = modelIndex;
    await setToStorage(storageKeys.models, models);
    tr.parentElement?.insertBefore(tr, tr.nextSibling?.nextSibling || null);
}

async function deleteModel(modelId: string, tr: HTMLTableRowElement) {
    const models: SerializedModel[] = (await getFromStorage(storageKeys.models) || []).filter((model: SerializedModel) => model.id !== modelId).sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    models.forEach((model: SerializedModel, idx: number) => model.sortingIndex = idx);
    await setToStorage(storageKeys.models, models);
    if(models.length > 0)
        tr.remove()
    else {
        await ensureNonEmptyModels();
        await fillModelsTable();
    }
}

export async function setupAssistantModelSettings() {
    let assistantModel: SerializedModel | null = await getFromStorage(storageKeys.assistantModel);
    if(!assistantModel) {
        assistantModel = {
            sortingIndex: 0,
            id: uniqueString(),
            name: "Assistant model",
            description: "Assistant model",
            technicalName: "gemini-1.5-flash-latest",
            topK: null,
            topP: null,
            temperature: null,
            apiKey: "",
            isVisibleInChat: true,
            safetySettings: {
                dangerousContent: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                hateSpeech: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                harassment: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                sexuallyExplicit: HarmBlockThreshold.BLOCK_ONLY_HIGH
            }
        }
        await setToStorage(storageKeys.assistantModel, assistantModel);
    }
    const assistantModelApiKeyInput = document.getElementById("assistantModelApiKey") as HTMLInputElement;
    assistantModelApiKeyInput.value = assistantModel?.apiKey || "";
    assistantModelApiKeyInput.addEventListener("change", async () => {
        assistantModel.apiKey = assistantModelApiKeyInput.value;
        await setToStorage(storageKeys.assistantModel, assistantModel);
    });
    const assistantModelNameInput = document.getElementById("assistantModelTechnicalName") as HTMLInputElement;
    assistantModelNameInput.value = assistantModel?.technicalName || "gemini-1.5-flash-latest";
    assistantModelNameInput.addEventListener("change", async () => {
        assistantModel.technicalName = assistantModelNameInput.value;
        await setToStorage(storageKeys.assistantModel, assistantModel);
    });

    (document.getElementById("editAssistantModelButton") as HTMLButtonElement).onclick = () => editModel(assistantModel.id, true);
}

export async function setupEmbeddingModelSettings() {
    let embeddingModel: SerializedModel | null = await getFromStorage(storageKeys.embeddingModel);
    if(!embeddingModel) {
        embeddingModel = {
            sortingIndex: 0,
            id: uniqueString(),
            name: "Embedding model",
            description: "Embedding model",
            technicalName: "text-embedding-004",
            topK: null,
            topP: null,
            temperature: null,
            apiKey: "",
            isVisibleInChat: false,
            safetySettings: {
                dangerousContent: HarmBlockThreshold.BLOCK_NONE,
                hateSpeech: HarmBlockThreshold.BLOCK_NONE,
                harassment: HarmBlockThreshold.BLOCK_NONE,
                sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE
            }
        }
        await setToStorage(storageKeys.embeddingModel, embeddingModel);
    }
    const embeddingModelApiKeyInput = document.getElementById("embeddingModelApiKey") as HTMLInputElement;
    embeddingModelApiKeyInput.value = embeddingModel?.apiKey || "";
    embeddingModelApiKeyInput.addEventListener("change", async () => {
        embeddingModel.apiKey = embeddingModelApiKeyInput.value.trim();
        await setToStorage(storageKeys.assistantModel, embeddingModel);
    });
    const embeddingModelNameInput = document.getElementById("embeddingModelTechnicalName") as HTMLInputElement;
    embeddingModelNameInput.value = embeddingModel?.technicalName || "text-embedding-004";
    embeddingModelNameInput.addEventListener("change", async () => {
        embeddingModel.technicalName = embeddingModelNameInput.value.trim();
        await setToStorage(storageKeys.assistantModel, embeddingModel);
    });

    (document.getElementById("editAssistantModelButton") as HTMLButtonElement).onclick = () => editModel(embeddingModel.id, true);
}

async function editModel(modelId: string, isAssistantModel: boolean = false) {
    let models: SerializedModel[] = [];
    let model: SerializedModel;
    if(isAssistantModel) {
        model = await getFromStorage(storageKeys.assistantModel);
        if(!model) {
            model = {
                sortingIndex: 0,
                id: uniqueString(),
                name: "Assistant model",
                description: "Assistant model",
                technicalName: "gemini-1.5-flash-latest",
                topK: null,
                topP: null,
                temperature: null,
                apiKey: "",
                isVisibleInChat: false,
                safetySettings: {
                    dangerousContent: HarmBlockThreshold.BLOCK_NONE,
                    hateSpeech: HarmBlockThreshold.BLOCK_NONE,
                    harassment: HarmBlockThreshold.BLOCK_NONE,
                    sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE
                }
            }
            await setToStorage(storageKeys.assistantModel, model);
        }
    }
    else {
        models = await getFromStorage(storageKeys.models) || [];
        model = models.find((model: SerializedModel) => model.id === modelId) || models[0];
    }

    const modelNameInput = document.getElementById("modelName") as HTMLInputElement;
    const modelDescriptionInput = document.getElementById("modelDescription") as HTMLTextAreaElement;
    const modelTopKInput = document.getElementById("modelTopK") as HTMLInputElement;
    const modelTopPInput = document.getElementById("modelTopP") as HTMLInputElement;
    const modelTemperatureInput = document.getElementById("modelTemperature") as HTMLInputElement;
    const modelApiKeyInput = document.getElementById("modelApiKey") as HTMLInputElement;
    const modelTechnicalNameInput = document.getElementById("modelTechnicalName") as HTMLInputElement;
    const modelSafetyDangerousContentInput = document.getElementById("modelSafetyDangerousContent") as HTMLSelectElement;
    const modelSafetyHateSpeechInput = document.getElementById("modelSafetyHateSpeech") as HTMLSelectElement;
    const modelSafetyHarassmentInput = document.getElementById("modelSafetyHarassment") as HTMLSelectElement;
    const modelSafetySexuallyExplicitInput = document.getElementById("modelSafetySexuallyExplicit") as HTMLSelectElement;
    const modelVisibleInChatCheckbox = document.getElementById("modelVisibleInChat") as HTMLInputElement;

    modelNameInput.value = model.name;
    modelDescriptionInput.value = model.description;
    modelTechnicalNameInput.value = model.technicalName;
    modelTopKInput.value = model.topK !== null ? model.topK.toString() : "";
    modelTopPInput.value = model.topP !== null ? model.topP.toString() : "";
    modelTemperatureInput.value = model.temperature !== null ? model.temperature.toString() : "";
    modelApiKeyInput.value = model.apiKey;
    modelVisibleInChatCheckbox.checked = model.isVisibleInChat;
    modelSafetyDangerousContentInput.value = model.safetySettings.dangerousContent;
    modelSafetyHateSpeechInput.value = model.safetySettings.hateSpeech;
    modelSafetyHarassmentInput.value = model.safetySettings.harassment;
    modelSafetySexuallyExplicitInput.value = model.safetySettings.sexuallyExplicit;

    const saveButton = document.getElementById("saveModelButton") as HTMLButtonElement;
    saveButton.onclick = async () => {
        model.name = modelNameInput.value.trim();
        model.description = modelDescriptionInput.value.trim();
        model.technicalName = modelTechnicalNameInput.value.trim();
        model.topK = modelTopKInput.value ? parseInt(modelTopKInput.value.trim()) : null;
        model.topP = modelTopPInput.value ? parseFloat(modelTopPInput.value.trim()) : null;
        model.temperature = modelTemperatureInput.value ? parseFloat(modelTemperatureInput.value.trim()) : null;
        model.apiKey = modelApiKeyInput.value.trim();
        model.isVisibleInChat = modelVisibleInChatCheckbox.checked;
        model.safetySettings = {
            dangerousContent: modelSafetyDangerousContentInput.value as HarmBlockThreshold,
            hateSpeech: modelSafetyHateSpeechInput.value as HarmBlockThreshold,
            harassment: modelSafetyHarassmentInput.value as HarmBlockThreshold,
            sexuallyExplicit: modelSafetySexuallyExplicitInput.value as HarmBlockThreshold
        }
        if(isAssistantModel) {
            await setToStorage(storageKeys.assistantModel, model);
            await setupAssistantModelSettings();
        }
        else {
            await setToStorage(storageKeys.models, models);
            await fillModelsTable();
        }

        saveButton.onclick = null;
        modelModal.hide();
    };
    modelModal.show();
}

export function setupNewModelButton() {
    (document.getElementById("newModelButton") as HTMLButtonElement).onclick = async () => {
        const models = await getFromStorage(storageKeys.models) || [];
        const newModel: SerializedModel = {
            sortingIndex: models.length,
            id: uniqueString(),
            name: "New model",
            description: "(Description here)",
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
        };
        await setToStorage(storageKeys.models, [...models, newModel]);
        await fillModelsTable();
        await editModel(newModel.id);
    };
}