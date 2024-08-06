import {
    CustomActionResultsPresentation,
    CustomActionTargetSelectorBehavior,
    SerializedCustomAction,
    SerializedCustomCodePlayer,
    SerializedModel
} from "./dataModels";
import {getFromStorage, setToStorage} from "../storage/storageHandling";
import {extensionMessageGoals, ExtensionMessageRequest, storageKeys} from "../constants";
import Modal from "bootstrap/js/dist/modal";
import {uniqueString} from "../misc";
import {EditorView} from "@codemirror/view";
import {createLiquidCodeMirror} from "../codeMirror";
import {getChatSystemInstructionDummyScope, getCustomActionSystemInstructionDummyScope} from "../prompts";

export const actionModalElement = document.getElementById("editCustomActionModal") as HTMLDivElement;
const actionModal = Modal.getOrCreateInstance(actionModalElement);
let actionSystemInstructionCodeMirrorView: EditorView | null = null;
let actionMessageCodeMirrorView: EditorView | null = null;

function rebuildContextMenus() {
    if(chrome.runtime) {
        chrome.runtime.sendMessage({messageGoal: extensionMessageGoals.rebuildContextMenus} as ExtensionMessageRequest).catch();
    }
}

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
            <td class="custom-action-menu-item"></td>
            <td class="custom-action-description"></td>
            <td>
                <button class="btn btn-outline-secondary btn-sm edit-btn" aria-label="Edit action" title="Edit action"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm delete-btn" aria-label="Delete action" title="Delete action"><i class="bi bi-trash"></i></button>
            </td>
        `;
        (tr.querySelector('td.custom-action-name') as HTMLTableCellElement).textContent = action.name;
        (tr.querySelector('code.custom-action-handle') as HTMLElement).textContent = action.handle;
        (tr.querySelector('td.custom-action-menu-item') as HTMLTableCellElement).innerHTML = action.pathInContextMenu ? `<i class="bi bi-check"></i>` : "";
        (tr.querySelector('td.custom-action-description') as HTMLTableCellElement).textContent = action.description;
        (tr.querySelector('button.edit-btn') as HTMLButtonElement).onclick = () => editAction(action.id);
        (tr.querySelector('button.delete-btn') as HTMLButtonElement).onclick = () => deleteAction(action.id, tr);
        tbody.appendChild(tr);
    });

    if(!actions.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No custom actions defined</td></tr>`;
    }
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
    const pathInContextMenuInput = document.getElementById("customActionPathInContextMenu") as HTMLInputElement;
    pathInContextMenuInput.value = action.pathInContextMenu;
    const descriptionInput = document.getElementById("customActionDescription") as HTMLInputElement;
    descriptionInput.value = action.description;
    // const systemInstructionInput = document.getElementById("customActionSystemInstruction") as HTMLInputElement;
    // systemInstructionInput.value = action.systemInstructionTemplate;
    // const messageTextInput = document.getElementById("customActionMessage") as HTMLInputElement;
    // messageTextInput.value = action.messageTemplate;
    const systemInstructionInputContainer = document.getElementById("customActionSystemInstruction") as HTMLDivElement;

    const saveSystemInstruction = async (editorView: EditorView) => {
        action.systemInstructionTemplate = editorView.state.doc.toString();
        editorView.destroy();
        actionSystemInstructionCodeMirrorView = null;
    }
    actionSystemInstructionCodeMirrorView = createLiquidCodeMirror(
        systemInstructionInputContainer, action.systemInstructionTemplate, saveSystemInstruction, getCustomActionSystemInstructionDummyScope()
    );

    const messageTextInputContainer = document.getElementById("customActionMessage") as HTMLDivElement;
    const saveMessage = async (editorView: EditorView) => {
        action.messageTemplate = editorView.state.doc.toString();
        editorView.destroy();
        actionMessageCodeMirrorView = null;
    }
    actionMessageCodeMirrorView = createLiquidCodeMirror(
        messageTextInputContainer, action.messageTemplate, saveMessage, getCustomActionSystemInstructionDummyScope()
    );

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

    const modelJSONModeCheckbox = document.getElementById("customActionModelJSONMode") as HTMLInputElement;
    modelJSONModeCheckbox.checked = action.jsonMode;
    const textSelectionRegExpInput = document.getElementById("customActionTextSelectionRegExp") as HTMLInputElement;
    textSelectionRegExpInput.value = action.selectedTextRegExp;
    const targetSelectorInput = document.getElementById("customActionSelector") as HTMLInputElement;
    targetSelectorInput.value = action.targetsFilter.selector;
    const selectorBehaviorSelect = document.getElementById("customActionSelectorBehavior") as HTMLSelectElement;
    selectorBehaviorSelect.value = action.targetsFilter.selectorBehavior;
    const selectorImageRequiredCheckbox = document.getElementById("customActionSelectorImageRequired") as HTMLInputElement;
    selectorImageRequiredCheckbox.checked = action.targetsFilter.imageRequired;
    const allowChildSelectionCheckbox = document.getElementById("customActionSelectorAllowSearchInDescendants") as HTMLInputElement;
    allowChildSelectionCheckbox.checked = action.targetsFilter.allowSearchInDescendants;
    const allowSearchInSelectionCheckbox = document.getElementById("customActionSelectorAllowSearchInSelection") as HTMLInputElement;
    allowSearchInSelectionCheckbox.checked = action.targetsFilter.allowSearchInPageSelection;
    const resultsPresentationSelect = document.getElementById("customActionResultsPresentation") as HTMLSelectElement;
    resultsPresentationSelect.value = action.resultsPresentation;
    const elementSnapshotCheckbox = document.getElementById("customActionSendElementSnapshotToLLM") as HTMLInputElement;
    elementSnapshotCheckbox.checked = action.context.elementSnapshot;
    const selectionSnapshotCheckbox = document.getElementById("customActionSendSelectionSnapshotToLLM") as HTMLInputElement;
    selectionSnapshotCheckbox.checked = action.context.selectionSnapshot;
    const pageSnapshotCheckbox = document.getElementById("customActionSendPageSnapshotToLLM") as HTMLInputElement;
    pageSnapshotCheckbox.checked = action.context.pageSnapshot;

    const saveButton = document.getElementById("saveCustomActionButton") as HTMLButtonElement;
    saveButton.onclick = async () => {
        action.name = nameInput.value.trim();
        action.handle = handleInput.value.trim();
        action.pathInContextMenu = pathInContextMenuInput.value.trim();
        action.description = descriptionInput.value.trim();
        // action.systemInstructionTemplate = systemInstructionInput.value.trim();
        // action.messageTemplate = messageTextInput.value.trim();
        await saveSystemInstruction(actionSystemInstructionCodeMirrorView!);
        await saveMessage(actionMessageCodeMirrorView!);
        action.jsonMode = jsonModeInput.checked;
        action.modelId = modelSelect.value;
        action.playerId = playersSelect.value;
        action.selectedTextRegExp = textSelectionRegExpInput.value.trim();
        action.targetsFilter.selector = targetSelectorInput.value.trim();
        action.targetsFilter.selectorBehavior = selectorBehaviorSelect.value as CustomActionTargetSelectorBehavior;
        action.targetsFilter.imageRequired = selectorImageRequiredCheckbox.checked;
        action.targetsFilter.allowSearchInDescendants = allowChildSelectionCheckbox.checked;
        action.targetsFilter.allowSearchInPageSelection = allowSearchInSelectionCheckbox.checked;
        action.resultsPresentation = resultsPresentationSelect.value as CustomActionResultsPresentation;
        action.context.elementSnapshot = elementSnapshotCheckbox.checked;
        action.context.selectionSnapshot = selectionSnapshotCheckbox.checked;
        action.context.pageSnapshot = pageSnapshotCheckbox.checked;
        await setToStorage(storageKeys.customActions, actions);
        actionModal.hide();
        await fillCustomActionsTable();
        rebuildContextMenus();
    };

    actionModal.show();
}

async function deleteAction(actionId: string, tr: HTMLTableRowElement) {
    const actions: SerializedCustomAction[] = (await getFromStorage(storageKeys.customActions) || []).filter((action: SerializedCustomAction) => action.id !== actionId);
    await setToStorage(storageKeys.customActions, actions);
    if(actions.length > 0)
        tr.remove();
    else
        await fillCustomActionsTable();

    rebuildContextMenus();
}

export function setupNewCustomActionButton(){
    (document.getElementById("newCustomActionButton") as HTMLButtonElement).onclick = async () => {
        const actions: SerializedCustomAction[] = await getFromStorage(storageKeys.customActions) || [];
        const newAction: SerializedCustomAction = {
            id: uniqueString(),
            name: "",
            description: "",
            handle: "",
            pathInContextMenu: "",
            jsonMode: false,
            systemInstructionTemplate: "",
            messageTemplate: "",
            modelId: "",
            playerId: "",
            targetsFilter: {
                selector: "",
                selectorBehavior: CustomActionTargetSelectorBehavior.deepest,
                imageRequired: false,
                allowSearchInDescendants: false,
                allowSearchInPageSelection: false
            },
            selectedTextRegExp: ".*",
            context: {
                elementSnapshot: false,
                selectionSnapshot: false,
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

export function destroyCustomActionCodeMirrors() {
    if(actionSystemInstructionCodeMirrorView) {
        actionSystemInstructionCodeMirrorView.destroy();
        actionSystemInstructionCodeMirrorView = null;
    }
    if(actionMessageCodeMirrorView) {
        actionMessageCodeMirrorView.destroy();
        actionMessageCodeMirrorView = null;
    }
}