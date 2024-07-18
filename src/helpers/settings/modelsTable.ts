import {storageKeys} from "../constants";
import {SerializedModel} from "./dataModels";
import * as Bootstrap from "bootstrap";
import {HarmBlockThreshold} from "@google/generative-ai";
import {uniqueString} from "../uniqueId";

export async function fillModelsTable() {
    const modelsWrapped = await chrome.storage.sync.get([storageKeys.models]);
    if (!modelsWrapped[storageKeys.models]) {
        await chrome.storage.sync.set({[storageKeys.models]: [{
            sortingIndex: 0,
            id: uniqueString(),
            name: "Default",
            description: "Default model",
            technicalName: "gemini-1.5-flash-latest",
            apiKey: "",
            safetySettings: {
                dangerousContent: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                hateSpeech: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                harassment: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                sexuallyExplicit: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED
            }
        }]});
    }
    const models: SerializedModel[] = modelsWrapped[storageKeys.models].sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    const modelsTable = document.getElementById("modelsTable") as HTMLTableElement;
    const tbody = modelsTable.querySelector("tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    models.forEach((model: SerializedModel) => {
        const tr = document.createElement("tr");
        tr.dataset.id = model.id;
        tr.innerHTML = `
            <td class="model-name"></td>
            <td class="model-description"></td>
            <td class="model-technical-name"></td>
            <td class="model-api-key"></td>
            <td>
                <button class="btn btn-outline-secondary btn-sm edit-btn" data-model-id="${model.id}" aria-label="Edit model" title="Edit model"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm delete-btn" data-model-id="${model.id}" aria-label="Delete model" title="Delete model"><i class="bi bi-trash"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-up-btn" data-model-id="${model.id}" aria-label="Move model up the list" title="Move model up the list"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-down-btn" data-model-id="${model.id}" aria-label="Move model down the list" title="Move model down the list"><i class="bi bi-arrow-down"></i></button>
            </td>
        `;
        (tr.querySelector(".model-name") as HTMLTableCellElement).textContent = model.name;
        (tr.querySelector(".model-description") as HTMLTableCellElement).textContent = model.description;
        (tr.querySelector(".model-technical-name") as HTMLTableCellElement).textContent = model.technicalName;
        (tr.querySelector(".model-api-key") as HTMLTableCellElement).textContent = model.apiKey;
        (tr.querySelector(".edit-btn") as HTMLButtonElement).onclick = () => editModel(model.id);
        (tr.querySelector(".delete-btn") as HTMLButtonElement).onclick = () => deleteModel(model.id, tr);
        (tr.querySelector(".move-up-btn") as HTMLButtonElement).onclick = () => moveModelUp(model.id, tr);
        (tr.querySelector(".move-down-btn") as HTMLButtonElement).onclick = () => moveModelDown(model.id, tr);
        tbody.appendChild(tr);
    });
}

async function moveModelUp(modelId: string, tr: HTMLTableRowElement) {
    const modelsWrapped = await chrome.storage.sync.get([storageKeys.models]);

    const models = modelsWrapped[storageKeys.models].sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    const modelIndex = models.findIndex((model: SerializedModel) => model.id === modelId);
    if (modelIndex === 0)
        return;
    models[modelIndex].sortingIndex = modelIndex - 1;
    models[modelIndex - 1].sortingIndex = modelIndex;
    await chrome.storage.sync.set({[storageKeys.models]: models});
    tr.parentElement?.insertBefore(tr, tr.previousSibling);
}

async function moveModelDown(modelId: string, tr: HTMLTableRowElement) {
    const modelsWrapped = await chrome.storage.sync.get([storageKeys.models]);

    const models = modelsWrapped[storageKeys.models].sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    const modelIndex = models.findIndex((model: SerializedModel) => model.id === modelId);
    if (modelIndex === models.length - 1)
        return;
    models[modelIndex].sortingIndex = modelIndex + 1;
    models[modelIndex + 1].sortingIndex = modelIndex;
    await chrome.storage.sync.set({[storageKeys.models]: models});
    tr.parentElement?.insertBefore(tr, tr.nextSibling?.nextSibling || null);
}

async function deleteModel(modelId: string, tr: HTMLTableRowElement) {
    const modelsWrapped = await chrome.storage.sync.get([storageKeys.models]);
    const models: SerializedModel[] = modelsWrapped[storageKeys.models].filter((model: SerializedModel) => model.id !== modelId).sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    models.forEach((model: SerializedModel, idx: number) => model.sortingIndex = idx)
    await chrome.storage.sync.set({[storageKeys.models]: models});
    tr.remove();
}

async function editModel(modelId: string) {
    const modalElement = document.getElementById("editModelModal") as HTMLDivElement;
    const modal = Bootstrap.Modal.getOrCreateInstance(modalElement);
    const models = await chrome.storage.sync.get([storageKeys.models]);
    const model = models[storageKeys.models].find((model: SerializedModel) => model.id === modelId);
    const modelNameInput = document.getElementById("modelName") as HTMLInputElement;
    const modelDescriptionInput = document.getElementById("modelDescription") as HTMLTextAreaElement;
    const modelApiKeyInput = document.getElementById("modelApiKey") as HTMLInputElement;
    const modelTechnicalNameInput = document.getElementById("modelTechnicalName") as HTMLInputElement;
    const modelSafetyDangerousContentInput = document.getElementById("modelSafetyDangerousContent") as HTMLSelectElement;
    const modelSafetyHateSpeechInput = document.getElementById("modelSafetyHateSpeech") as HTMLSelectElement;
    const modelSafetyHarassmentInput = document.getElementById("modelSafetyHarassment") as HTMLSelectElement;
    const modelSafetySexuallyExplicitInput = document.getElementById("modelSafetySexuallyExplicit") as HTMLSelectElement;

    modelNameInput.value = model.name;
    modelDescriptionInput.value = model.description;
    modelTechnicalNameInput.value = model.technicalName;
    modelApiKeyInput.value = model.apiKey;
    modelSafetyDangerousContentInput.value = model.safetySettings.dangerousContent;
    modelSafetyHateSpeechInput.value = model.safetySettings.hateSpeech;
    modelSafetyHarassmentInput.value = model.safetySettings.harassment;
    modelSafetySexuallyExplicitInput.value = model.safetySettings.sexuallyExplicit;

    const closeModalButton = document.getElementById("saveModelButton") as HTMLButtonElement;
    closeModalButton.onclick = async () => {
        const newModel: SerializedModel = {
            sortingIndex: model.sortingIndex,
            id: model.id,
            name: modelNameInput.value,
            description: modelDescriptionInput.value,
            technicalName: modelTechnicalNameInput.value,
            apiKey: modelApiKeyInput.value,
            safetySettings: {
                dangerousContent: modelSafetyDangerousContentInput.value as HarmBlockThreshold,
                hateSpeech: modelSafetyHateSpeechInput.value as HarmBlockThreshold,
                harassment: modelSafetyHarassmentInput.value as HarmBlockThreshold,
                sexuallyExplicit: modelSafetySexuallyExplicitInput.value as HarmBlockThreshold
            }
        };
        const newModels = models[storageKeys.models].map((m: SerializedModel) => m.id === modelId ? newModel : m);
        await chrome.storage.sync.set({[storageKeys.models]: newModels});
        closeModalButton.onclick = null;
        await fillModelsTable();
        modal.hide();
    };
    modal.show();
}

export function setupNewModelButton() {
    (document.querySelector("#newModelButton") as HTMLButtonElement).addEventListener("click", async () => {
        const modelsWrapped = await chrome.storage.sync.get([storageKeys.models]);
        const models = modelsWrapped[storageKeys.models] || [];
        const newModel: SerializedModel = {
            sortingIndex: models.length,
            id: uniqueString(),
            name: "New model",
            description: "(Description here)",
            technicalName: "gemini-1.5-flash-latest",
            apiKey: "",
            safetySettings: {
                dangerousContent: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                hateSpeech: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                harassment: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED,
                sexuallyExplicit: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED
            }
        };
        await chrome.storage.sync.set({[storageKeys.models]: [...models, newModel]});
        await fillModelsTable();
        await editModel(newModel.id);
    });
}