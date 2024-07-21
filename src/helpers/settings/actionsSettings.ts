import {
    CustomActionResultsPresentation,
    CustomActionTargetSelectorBehavior,
    SerializedCustomAction,
    SerializedCustomCodePlayer,
    SerializedModel
} from "./dataModels";
import {getFromStorage, setToStorage} from "../storageHandling";
import {storageKeys} from "../constants";
import Modal from "bootstrap/js/dist/modal";
import {uniqueString} from "../uniqueId";

const actionModalElement = document.getElementById("editCustomActionModal") as HTMLDivElement;
const actionModal = Modal.getOrCreateInstance(actionModalElement);

export async function fillCustomActionsTable() {
    const actions: SerializedCustomAction[] = await getFromStorage(storageKeys.customActions) || [];
    const table = document.getElementById("customActionsTable") as HTMLTableElement;
    const tbody = table.querySelector("tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    if(!actions.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">No custom actions defined</td></tr>`;
    }
    actions.forEach((action: SerializedCustomAction) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="custom-action-name"></td>
            <td><code class="custom-action-handle"></code></td>
            <td class="custom-action-description"></td>
            <td>
                <button class="btn btn-outline-secondary btn-sm edit-btn" aria-label="Edit action" title="Edit action"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm delete-btn" aria-label="Delete action" title="Delete action"><i class="bi bi-trash"></i></button>
            </td>
        `;
        (tr.querySelector('td.custom-action-name') as HTMLTableCellElement).textContent = action.name;
        (tr.querySelector('code.custom-action-handle') as HTMLElement).textContent = action.handle;
        (tr.querySelector('td.custom-action-description') as HTMLTableCellElement).textContent = action.description;
        (tr.querySelector('button.edit-btn') as HTMLButtonElement).onclick = () => editAction(action.id);
        (tr.querySelector('button.delete-btn') as HTMLButtonElement).onclick = () => deleteAction(action.id, tr);
        tbody.appendChild(tr);
    });
}

async function editAction(actionId: string) {
    const actions: SerializedCustomAction[] = await getFromStorage(storageKeys.customActions) || [];
    const action = actions.find((action: SerializedCustomAction) => action.id === actionId);
    if (!action)
        return;
    const nameInput = document.getElementById("customActionName") as HTMLInputElement;
    nameInput.value = action.name;
    const handleInput = document.getElementById("customActionHandle") as HTMLInputElement;
    handleInput.value = action.handle;
    const descriptionInput = document.getElementById("customActionDescription") as HTMLInputElement;
    descriptionInput.value = action.description;
    const systemInstructionInput = document.getElementById("customActionSystemInstruction") as HTMLInputElement;
    systemInstructionInput.value = action.systemInstruction;
    const jsonModeInput = document.getElementById("customActionModelJSONMode") as HTMLInputElement;
    jsonModeInput.checked = action.jsonMode;
    const modelSelect = document.getElementById("customActionModel") as HTMLSelectElement;
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
        if(model.id === action.modelId)
            option.selected = true;
        modelSelect.appendChild(option);
    });

    const playersSelect = document.getElementById("customActionPlayer") as HTMLSelectElement;
    const codePlayers: SerializedCustomCodePlayer[] = await getFromStorage(storageKeys.codePlayers) || [];
    playersSelect.innerHTML = "";
    const emptyPlayerOption = document.createElement("option");
    emptyPlayerOption.value = "";
    emptyPlayerOption.text = "";
    playersSelect.appendChild(emptyPlayerOption);
    codePlayers.forEach((player: SerializedCustomCodePlayer) => {
        const option = document.createElement("option");
        option.value = player.id;
        option.text = player.name;
        if(player.id === action.playerId)
            option.selected = true;
        playersSelect.appendChild(option);
    });

    const customActionModelJSONMode = document.getElementById("customActionModelJSONMode") as HTMLInputElement;
    customActionModelJSONMode.checked = action.jsonMode;
    const customActionSelectorInput = document.getElementById("customActionSelector") as HTMLInputElement;
    customActionSelectorInput.value = action.targetsFilter.selector;
    const customActionSelectorBehaviorSelect = document.getElementById("customActionSelectorBehavior") as HTMLSelectElement;
    customActionSelectorBehaviorSelect.value = action.targetsFilter.selectorBehavior;
    const customActionSelectorImageRequired = document.getElementById("customActionSelectorImageRequired") as HTMLInputElement;
    customActionSelectorImageRequired.checked = action.targetsFilter.imageRequired;
    const customActionSelectorAllowChildSelection = document.getElementById("customActionSelectorAllowSearchInDescendants") as HTMLInputElement;
    customActionSelectorAllowChildSelection.checked = action.targetsFilter.allowSearchInDescendants;
    const customActionSelectorAllowSearchInSelection = document.getElementById("customActionSelectorAllowSearchInSelection") as HTMLInputElement;
    customActionSelectorAllowSearchInSelection.checked = action.targetsFilter.allowSearchInPageSelection;
    const customActionResultsPresentationSelect = document.getElementById("customActionResultsPresentation") as HTMLSelectElement;
    customActionResultsPresentationSelect.value = action.resultsPresentation;
    const customActionElementSnapshot = document.getElementById("customActionSendElementSnapshotToLLM") as HTMLInputElement;
    customActionElementSnapshot.checked = action.context.elementSnapshot;
    const customActionPageSnapshot = document.getElementById("customActionSendPageSnapshotToLLM") as HTMLInputElement;
    customActionPageSnapshot.checked = action.context.pageSnapshot;

    const saveButton = document.getElementById("saveCustomActionButton") as HTMLButtonElement;
    saveButton.onclick = async () => {
        action.name = nameInput.value.trim();
        action.handle = handleInput.value.trim();
        action.description = descriptionInput.value.trim();
        action.systemInstruction = systemInstructionInput.value.trim();
        action.jsonMode = jsonModeInput.checked;
        action.modelId = modelSelect.value;
        action.playerId = playersSelect.value;
        action.targetsFilter.selector = customActionSelectorInput.value.trim();
        action.targetsFilter.selectorBehavior = customActionSelectorBehaviorSelect.value as CustomActionTargetSelectorBehavior;
        action.targetsFilter.imageRequired = customActionSelectorImageRequired.checked;
        action.targetsFilter.allowSearchInDescendants = customActionSelectorAllowChildSelection.checked;
        action.targetsFilter.allowSearchInPageSelection = customActionSelectorAllowSearchInSelection.checked;
        action.resultsPresentation = customActionResultsPresentationSelect.value as CustomActionResultsPresentation;
        action.context.elementSnapshot = customActionElementSnapshot.checked;
        action.context.pageSnapshot = customActionPageSnapshot.checked;
        await setToStorage(storageKeys.customActions, actions);
        actionModal.hide();
        await fillCustomActionsTable();
    };

    actionModal.show();
}

async function deleteAction(actionId: string, tr: HTMLTableRowElement) {
    const actions: SerializedCustomAction[] = (await getFromStorage(storageKeys.customActions) || []).filter((action: SerializedCustomAction) => action.id !== actionId);
    await setToStorage(storageKeys.customActions, actions);
    tr.remove();
}

export function setupNewCustomActionButton(){
    (document.getElementById("newCustomActionButton") as HTMLButtonElement).onclick = async () => {
        const actions: SerializedCustomAction[] = await getFromStorage(storageKeys.customActions) || [];
        const newAction: SerializedCustomAction = {
            id: uniqueString(),
            name: "",
            description: "",
            handle: "",
            jsonMode: false,
            systemInstruction: "",
            modelId: "",
            playerId: "",
            targetsFilter: {
                selector: "",
                selectorBehavior: CustomActionTargetSelectorBehavior.deepest,
                imageRequired: false,
                allowSearchInDescendants: false,
                allowSearchInPageSelection: false
            },
            context: {
                elementSnapshot: false,
                pageSnapshot: false
            },
            resultsPresentation: CustomActionResultsPresentation.chatPane
        };
        actions.push(newAction);
        await setToStorage(storageKeys.customActions, actions);
        await fillCustomActionsTable();
        await editAction(newAction.id);
    };
}