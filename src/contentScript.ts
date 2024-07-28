import {
    extensionMessageGoals,
    ElementPropertiesResult,
    DocumentInfoResult,
    PromptUserResult,
    ExecutePageActionRequest,
    PromptUserRequest,
    ExtensionMessageRequest,
    ElementPropertiesRequest,
    RegisterContextMenuEventRequest, storageKeys, DataForCustomActionRequest, DataForCustomActionResult
} from "./helpers/constants";
import {getDocumentSkeleton, findElementByIndex, gatherElementsForCustomActions} from "./helpers/domTools";
import {enqueuePageAction} from "./helpers/llmPageActions";

import ActionQueue from "./helpers/actionQueue";
import {SerializedCustomAction} from "./helpers/settings/dataModels";
import {getFromStorage} from "./helpers/storageHandling";

const pageActionQueue = new ActionQueue();
setInterval(
    () => pageActionQueue.executeNext(),
    20
);

let contextMenuPossibleActionTargets: Map<string, Element|null> = new Map();


function getDomElementProperties(element: Node, propertyNames: Array<string>){
    const properties: ElementPropertiesResult = {};
    for (const propertyName of propertyNames)
        switch(propertyName) {
            case "value": if(element instanceof HTMLInputElement) properties.value = element.value; break;
            case "style": if(element instanceof HTMLElement) properties.style = element.style; break;
            case "computedStyle": if(element instanceof HTMLElement) properties.computedStyle = window.getComputedStyle(element); break;
            case "id": if(element instanceof HTMLElement) properties.id = element.id; break;
            case "innerHTML": if(element instanceof HTMLElement) properties.innerHTML = element.innerHTML; break;
            case "outerHTML": if(element instanceof HTMLElement) properties.outerHTML = element.outerHTML; break;
            case "innerText": if(element instanceof HTMLElement) properties.innerText = element.innerText; break;
            case "textContent": properties.textContent = element.textContent; break;
            case "boundingRect":
                if(element instanceof HTMLElement)
                    properties.boundingRect = element.getBoundingClientRect();
                else {
                    while (element && !(element instanceof HTMLElement) && element.parentNode) element = element.parentNode;
                    if (element instanceof HTMLElement) properties.boundingRect = element.getBoundingClientRect();
                }
                break;
            default: if(element instanceof HTMLElement) properties[propertyName] = element.getAttribute(propertyName); break;
        }

    return properties;
}

chrome.runtime.onMessage.addListener(
    function (request: ExtensionMessageRequest, sender, sendResponse: (_: any) => void) {
        if (sender.tab)
            return;
        if (request.messageGoal === extensionMessageGoals.getDocumentInfo) {
            sendResponse({
                html: getDocumentSkeleton(),
                text: document.body.innerText,
                url: document.location.href,
                title: document.title
            } as DocumentInfoResult);
        } else if (request.messageGoal === extensionMessageGoals.executePageAction) {
            const executePageActionRequest = request as ExecutePageActionRequest;
            enqueuePageAction(
                pageActionQueue,
                {
                    actionName: executePageActionRequest.actionName,
                    elementIndex: executePageActionRequest.elementIndex?.toString() || "",
                    actionParams: executePageActionRequest.actionParams
                }
            );
        }
        else if (request.messageGoal === extensionMessageGoals.promptUser) {
            const promptRequest = request as PromptUserRequest;
            const promptText = promptRequest.promptText || "Enter your query:";
            const userResponse = prompt(promptText);
            sendResponse({userResponse: userResponse} as PromptUserResult);
        }
        else if (request.messageGoal === extensionMessageGoals.getDomElementProperties) {
            const propertiesRequest = request as ElementPropertiesRequest;
            const element = findElementByIndex(propertiesRequest.elementIndex) as HTMLElement;
            if (!element) {
                sendResponse({error: "Element not found."} as ElementPropertiesResult);
                return;
            }
            sendResponse(getDomElementProperties(element, propertiesRequest.propertyNames) as ElementPropertiesResult);
        }
        else if (request.messageGoal === extensionMessageGoals.requestDataForCustomAction) {
            const actionId = (request as DataForCustomActionRequest).actionId;
            getFromStorage(storageKeys.customActions).then(actions => {
                const action = (actions as SerializedCustomAction[] || []).find(action => action.id === actionId);

                if(action) {
                    const element = contextMenuPossibleActionTargets.get(action.id);
                    let selectionContainer: Node | null = null;
                    const selection = window.getSelection();
                    try {
                        selectionContainer = selection ? selection.getRangeAt(0).commonAncestorContainer : null;
                    }
                    catch {}

                    const result: DataForCustomActionResult = {
                        elementOuterHTML: element ? element.outerHTML : "",
                        elementInnerHTML: element ? element.innerHTML : "",
                        documentCompleteHTML: document.body.outerHTML,
                        documentSimplifiedHTML: getDocumentSkeleton(),
                        documentTitle: document.title,
                        documentURL: document.location.href,
                        elementInnerText: element instanceof HTMLElement ? element.innerText || "" : "",
                        selectionText: selection ? selection.toString() : "",
                        selectionContainerOuterHTML: selectionContainer instanceof HTMLElement ? selectionContainer.outerHTML : "",
                        selectionContainerInnerText: selectionContainer instanceof HTMLElement ? selectionContainer.innerText : "",
                    };

                    if(action.context.selectionSnapshot && selectionContainer || action.context.elementSnapshot && element) {
                        result.viewportRect = {
                            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
                            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
                        };
                    }
                    if(action.context.selectionSnapshot && selectionContainer) {
                        const properties = getDomElementProperties(selectionContainer, ["boundingRect"]);
                        result.selectionContainerBoundingRect = properties.boundingRect;
                    }
                    if(action.context.elementSnapshot && element) {
                        const properties = getDomElementProperties(element, ["boundingRect"]);
                        result.elementBoundingRect = properties.boundingRect;
                    }
                    sendResponse(result);
                } else {
                    sendResponse({error: "Action not found."} as DataForCustomActionResult);
                }
            })
            return true;
        }
    }
);

document.addEventListener("contextmenu", async (event) => {
    const element = event.target as HTMLElement;
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : "";
    const actions: SerializedCustomAction[] = (await getFromStorage(storageKeys.customActions) || []).filter((action: SerializedCustomAction) => {
        return action.pathInContextMenu && (!action.selectedTextRegExp || selectedText.match(RegExp(action.selectedTextRegExp)))
    });
    const possibleActionsElements = await gatherElementsForCustomActions(actions, element);
    contextMenuPossibleActionTargets = possibleActionsElements;
    chrome.runtime.sendMessage({
        messageGoal: extensionMessageGoals.registerContextMenuEvent,
        availableCustomActions: Array.from(possibleActionsElements.keys()),
        selectedText: selectedText,
    } as RegisterContextMenuEventRequest).catch();
});
