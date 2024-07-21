import {getFromStorage} from "./storageHandling";
import {storageKeys} from "./constants";
import {SerializedCustomAction} from "./settings/dataModels";


export async function executeCustomAction(baseElement: HTMLElement, actionId: string) {
    const action: SerializedCustomAction = (await getFromStorage(storageKeys.customActions) || []).find((action: SerializedCustomAction) => action.id === actionId);
    if (!action)
        return;

    if (!action.) {

    }
}

