import {storageKeys} from "../constants";
import {SerializedModel, SerializedPersona} from "./dataModels";
import Modal from "bootstrap/js/dist/modal";
import {uniqueString} from "../misc";
import {getChatSystemInstructionDummyScope} from "../prompts";
import {setToStorage} from "../storage/storageHandling";
import {createLiquidCodeMirror} from "../codeMirror";
import {EditorView} from "@codemirror/view";
import {ensureNonEmptyModels, ensureNonEmptyPersonas} from "./ensureNonEmpty";
import {getDataFromSharingString, getSharingStringFromData} from "../sharing";
import {openSharingModal} from "./sharingModal";

export const personaModalElement = document.getElementById("editPersonaModal") as HTMLDivElement;
const personaModal = Modal.getOrCreateInstance(personaModalElement);
let personaModalSystemInstructionCodeMirrorView: EditorView | null = null;

export async function fillPersonasTable() {
    const models: SerializedModel[] = await ensureNonEmptyModels();
    let personas = await ensureNonEmptyPersonas();

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
            <td><div class="d-flex flex-row">
                <button class="btn btn-outline-secondary btn-sm edit-btn mx-1" data-persona-id="${persona.id}" aria-label="Edit persona" title="Edit persona"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-secondary btn-sm share-btn mx-1" data-persona-id="${persona.id}" aria-label="Share persona" title="Share persona"><i class="bi bi-share-fill"></i></button>
                <button class="btn btn-outline-danger btn-sm delete-btn mx-1" data-persona-id="${persona.id}" aria-label="Delete persona" title="Delete persona"><i class="bi bi-trash"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-up-btn mx-1" data-persona-id="${persona.id}" aria-label="Move persona up the list" title="Move persona up the list"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-outline-secondary btn-sm move-down-btn mx-1" data-persona-id="${persona.id}" aria-label="Move persona down the list" title="Move persona down the list"><i class="bi bi-arrow-down"></i></button>
            </div></td>
        `;
        (tr.querySelector("td.persona-name") as HTMLTableCellElement).textContent = persona.name;
        (tr.querySelector("td.persona-description") as HTMLTableCellElement).textContent = persona.description;
        const modelForPersona = models.find((model: SerializedModel) => model.id === persona.defaultModel);
        (tr.querySelector("td.persona-model") as HTMLTableCellElement).textContent = modelForPersona ? modelForPersona.name : "(default)";

        (tr.querySelector("td.persona-system-instruction") as HTMLTableCellElement).textContent = persona.systemInstructionTemplate.length > 60 ? persona.systemInstructionTemplate.slice(0, 50) + "…" : persona.systemInstructionTemplate;
        (tr.querySelector("button.edit-btn") as HTMLButtonElement).onclick = () => editPersona(persona.id);
        (tr.querySelector("button.share-btn") as HTMLButtonElement).onclick = () => sharePersona(persona.id);
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
    const personas = await ensureNonEmptyPersonas();
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

    const models = await ensureNonEmptyModels();
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

async function sharePersona(personaId: string) {
    const personas = await ensureNonEmptyPersonas();
    const persona = personas.find((persona: SerializedPersona) => persona.id === personaId);
    if (!persona)
        return;

    persona.id = "";
    persona.sortingIndex = -1;
    const sharingLink = getSharingStringFromData(persona);
    if(sharingLink)
        openSharingModal("export", "persona", `https://a10fy.net/share/persona#${sharingLink}`);
}

async function deletePersona(personaId: string, tr: HTMLTableRowElement) {
    const personas: SerializedPersona[] = ( await ensureNonEmptyPersonas()).filter((persona: SerializedPersona) => persona.id !== personaId);
    personas.forEach((persona: SerializedPersona, idx: number) => persona.sortingIndex = idx);
    await setToStorage(storageKeys.personas, personas);

    if(personas.length > 0)
        tr.remove();
    else
        await fillPersonasTable();
}

async function movePersonaUp(personaId: string, tr: HTMLTableRowElement) {
    const personas: SerializedPersona[] = await ensureNonEmptyPersonas();
    const personaIndex = personas.findIndex((persona: SerializedPersona) => persona.id === personaId);
    if (personaIndex === 0)
        return;
    personas[personaIndex].sortingIndex = personaIndex - 1;
    personas[personaIndex - 1].sortingIndex = personaIndex;
    await setToStorage(storageKeys.personas, personas);
    tr.parentElement?.insertBefore(tr, tr.previousSibling);
}

async function movePersonaDown(personaId: string, tr: HTMLTableRowElement) {
    const personas = await ensureNonEmptyPersonas();
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
        const personas = await ensureNonEmptyPersonas();
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

export function setupImportPersonaButton() {
    (document.getElementById("importPersonaButton") as HTMLButtonElement).onclick = () => {
        openSharingModal("import", "persona", "", async (data: string) => {
            if(!data.startsWith("https://a10fy.net/share/persona#")) {
                alert("Invalid sharing link");
                return;
            }
            data = data.slice("https://a10fy.net/share/persona#".length);
            const providedPersona = getDataFromSharingString(data) as SerializedPersona;
            if(!providedPersona){
                alert("Invalid sharing link");
                return;
            }
            const personas = await ensureNonEmptyPersonas();
            personas.push({
                id: uniqueString(),
                sortingIndex: personas.length,
                name: providedPersona.name || "(Imported persona)",
                description: providedPersona.description || "",
                systemInstructionTemplate: providedPersona.systemInstructionTemplate || "You are a helpful assistant.",
                isVisibleInChat: true,
                defaultModel: "",
            });

            await setToStorage(storageKeys.personas, personas);
            await fillPersonasTable();
        });
    }
}

export function destroyPersonaCodeMirrors() {
    if(personaModalSystemInstructionCodeMirrorView) {
        personaModalSystemInstructionCodeMirrorView.destroy();
        personaModalSystemInstructionCodeMirrorView = null;
    }
}