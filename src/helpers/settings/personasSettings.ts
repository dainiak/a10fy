import {storageKeys} from "../constants";
import {SerializedModel, SerializedPersona} from "./dataModels";
import Modal from "bootstrap/js/dist/modal";
import {uniqueString} from "../uniqueId";
import {getChatSystemInstructionDummyScope, getDefaultChatSystemPromptTemplate} from "../prompts";
import {getFromStorage, setToStorage} from "../storageHandling";
import {createLiquidCodeMirror} from "../codeMirror";
import {EditorView} from "@codemirror/view";

export const personaModalElement = document.getElementById("editPersonaModal") as HTMLDivElement;
const personaModal = Modal.getOrCreateInstance(personaModalElement);
let personaModalSystemInstructionCodeMirrorView: EditorView | null = null;

export async function fillPersonasTable() {
    let personas = (await getFromStorage(storageKeys.personas) || []).sort((a: SerializedPersona, b: SerializedPersona) => a.sortingIndex - b.sortingIndex);
    if (!personas.length) {
        personas = [{
            sortingIndex: 0,
            id: uniqueString(),
            name: "Default",
            description: "Default Persona",
            defaultModel: "",
            systemInstruction: getDefaultChatSystemPromptTemplate()
        }];
        await setToStorage(storageKeys.personas, personas);
    }

    const models: SerializedModel[] = (await getFromStorage(storageKeys.models) || []);

    const personasTable = document.getElementById("personasTable") as HTMLTableElement;
    const tbody = personasTable.querySelector("tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    personas.forEach((persona: SerializedPersona) => {
        const tr = document.createElement("tr");
        tr.dataset.id = persona.id;
        tr.innerHTML = `
            <td class="persona-name"></td>
            <td class="persona-description"></td>
            <td class="persona-model"></td>
            <td class="persona-system-instruction"></td>
            <td>
                <button class="btn btn-outline-secondary btn-sm edit-btn" data-persona-id="${persona.id}" aria-label="Edit persona" title="Edit persona"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm delete-btn" data-persona-id="${persona.id}" aria-label="Delete persona" title="Delete persona"><i class="bi bi-trash"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-up-btn" data-persona-id="${persona.id}" aria-label="Move persona up the list" title="Move persona up the list"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-down-btn" data-persona-id="${persona.id}" aria-label="Move persona down the list" title="Move persona down the list"><i class="bi bi-arrow-down"></i></button>
            </td>
        `;
        (tr.querySelector("td.persona-name") as HTMLTableCellElement).textContent = persona.name;
        (tr.querySelector("td.persona-description") as HTMLTableCellElement).textContent = persona.description;
        const modelForPersona = models.find((model: SerializedModel) => model.id === persona.defaultModel);
        (tr.querySelector("td.persona-model") as HTMLTableCellElement).textContent = modelForPersona ? modelForPersona.name : "(default)";

        (tr.querySelector("td.persona-system-instruction") as HTMLTableCellElement).textContent = persona.systemInstructionTemplate.length > 60 ? persona.systemInstructionTemplate.slice(0, 50) + "…" : persona.systemInstructionTemplate;
        (tr.querySelector("button.edit-btn") as HTMLButtonElement).onclick = () => editPersona(persona.id);
        (tr.querySelector("button.delete-btn") as HTMLButtonElement).onclick = () => deletePersona(persona.id, tr);
        (tr.querySelector("button.move-up-btn") as HTMLButtonElement).onclick = () => movePersonaUp(persona.id, tr);
        (tr.querySelector("button.move-down-btn") as HTMLButtonElement).onclick = () => movePersonaDown(persona.id, tr);
        tbody.appendChild(tr);
    });
    if(!personas.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No personas defined</td></tr>`;
    }
}

async function editPersona(personaId: string) {
    const personas: SerializedPersona[] = (await getFromStorage(storageKeys.personas)) || [];
    const persona = personas.find((persona: SerializedPersona) => persona.id === personaId);
    if (!persona)
        return;

    const nameInput = document.getElementById("personaName") as HTMLInputElement;
    const descriptionInput = document.getElementById("personaDescription") as HTMLInputElement;
    const modelSelect = document.getElementById("personaModel") as HTMLSelectElement;
    // const systemInstructionInput = document.getElementById("personaSystemInstruction") as HTMLInputElement;
    // systemInstructionInput.value = persona.systemInstruction;
    const systemInstructionInputContainer = document.getElementById("personaSystemInstruction") as HTMLDivElement;
    const isVisibleInChatCheckbox = document.getElementById("personaVisibleInChat") as HTMLInputElement;
    nameInput.value = persona.name;
    descriptionInput.value = persona.description;

    const models: SerializedModel[] = (await getFromStorage(storageKeys.models)|| []).sort((a: SerializedModel, b: SerializedModel) => a.sortingIndex - b.sortingIndex);
    modelSelect.innerHTML = "";
    const emptyModelOption = document.createElement("option");
    emptyModelOption.value = "";
    emptyModelOption.text = "";
    modelSelect.appendChild(emptyModelOption);

    models.forEach((model: SerializedModel) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.text = model.name;
        if(model.id === persona.defaultModel)
            option.selected = true;
        modelSelect.appendChild(option);
    });
    modelSelect.value = persona.defaultModel;

    isVisibleInChatCheckbox.checked = persona.isVisibleInChat;

    const saveSystemInstruction = async (editorView: EditorView) => {
        persona.systemInstructionTemplate = editorView.state.doc.toString();
        editorView.destroy();
        personaModalSystemInstructionCodeMirrorView = null;
    };

    personaModalSystemInstructionCodeMirrorView = createLiquidCodeMirror(systemInstructionInputContainer, persona.systemInstructionTemplate, saveSystemInstruction, getChatSystemInstructionDummyScope());

    const saveButton = document.getElementById("savePersonaButton") as HTMLButtonElement;
    saveButton.onclick = async () => {
        persona.name = nameInput.value.trim();
        persona.description = descriptionInput.value.trim();
        persona.defaultModel = modelSelect.value;
        await saveSystemInstruction(personaModalSystemInstructionCodeMirrorView!);
        // persona.systemInstruction = systemInstructionInput.value;
        persona.isVisibleInChat = isVisibleInChatCheckbox.checked;
        await setToStorage(storageKeys.personas, personas);
        personaModal.hide();
        await fillPersonasTable();
    };

    personaModal.show();
}

async function deletePersona(personaId: string, tr: HTMLTableRowElement) {
    const personas: SerializedPersona[] = (await  getFromStorage(storageKeys.personas) || []).filter((persona: SerializedPersona) => persona.id !== personaId).sort((a: SerializedPersona, b: SerializedPersona) => a.sortingIndex - b.sortingIndex);
    personas.forEach((persona: SerializedPersona, idx: number) => persona.sortingIndex = idx);
    await setToStorage(storageKeys.personas, personas);

    if(personas.length > 0)
        tr.remove();
    else
        await fillPersonasTable();
}

async function movePersonaUp(personaId: string, tr: HTMLTableRowElement) {
    const personas: SerializedPersona[] = (await  getFromStorage(storageKeys.personas) || []).sort((a: SerializedPersona, b: SerializedPersona) => a.sortingIndex - b.sortingIndex);
    const personaIndex = personas.findIndex((persona: SerializedPersona) => persona.id === personaId);
    if (personaIndex === 0)
        return;
    personas[personaIndex].sortingIndex = personaIndex - 1;
    personas[personaIndex - 1].sortingIndex = personaIndex;
    await setToStorage(storageKeys.personas, personas);
    tr.parentElement?.insertBefore(tr, tr.previousSibling);
}

async function movePersonaDown(personaId: string, tr: HTMLTableRowElement) {
    const personas: SerializedPersona[] = (await  getFromStorage(storageKeys.personas) || []).sort((a: SerializedPersona, b: SerializedPersona) => a.sortingIndex - b.sortingIndex);
    const personaIndex = personas.findIndex((persona: SerializedPersona) => persona.id === personaId);
    if (personaIndex === personas.length - 1)
        return;
    personas[personaIndex].sortingIndex = personaIndex + 1;
    personas[personaIndex + 1].sortingIndex = personaIndex;
    await setToStorage(storageKeys.personas, personas);
    tr.parentElement?.insertBefore(tr, tr.nextSibling?.nextSibling || null);
}

export function setupNewPersonaButton() {
    (document.getElementById("newPersonaButton") as HTMLButtonElement).onclick = async () => {
        const personas: SerializedPersona[] = await  getFromStorage(storageKeys.personas) || [];
        const newPersona: SerializedPersona = {
            sortingIndex: personas.length,
            id: uniqueString(),
            name: "New Persona",
            description: "Description",
            defaultModel: "",
            systemInstructionTemplate: "You are a helpful assistant.",
            isVisibleInChat: true,
        };
        await setToStorage(storageKeys.personas, [...personas, newPersona]);
        await fillPersonasTable();
        await editPersona(newPersona.id);
    };
}

export function destroyPersonaCodeMirrors() {
    if(personaModalSystemInstructionCodeMirrorView) {
        personaModalSystemInstructionCodeMirrorView.destroy();
        personaModalSystemInstructionCodeMirrorView = null;
    }
}