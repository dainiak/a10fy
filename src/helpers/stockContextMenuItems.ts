import {
    CustomActionResultsPresentation,
    CustomActionTargetSelectorBehavior,
    SerializedCustomAction
} from "./settings/dataModels";
import {CustomActionContext, stockContextMenuItemID} from "./constants";


export const stockContextMenuItems: SerializedCustomAction[] = [
    {
        id: stockContextMenuItemID.attachPageScreenshotToCurrentChat,
        name: stockContextMenuItemID.attachPageScreenshotToCurrentChat,
        description: stockContextMenuItemID.attachPageScreenshotToCurrentChat,
        handle: stockContextMenuItemID.attachPageScreenshotToCurrentChat,
        pathInContextMenu: "Send page screenshot to current chat",
        jsonMode: false,
        systemInstructionTemplate: "",
        messageTemplate: "",
        modelId: "",
        playerId: "",
        targetsFilter: {
            selector: "*",
            selectorBehavior: CustomActionTargetSelectorBehavior.deepest,
            allowSearchInDescendants: false,
            allowSearchInPageSelection: false,
            imageRequired: false
        },
        selectedTextRegExp: "",
        context: {
            elementSnapshot: false,
            pageSnapshot: true,
            selectionSnapshot: false
        },
        resultsPresentation: CustomActionResultsPresentation.chatPane
    },
    {
        id: stockContextMenuItemID.attachAsImageToCurrentChat,
        name: stockContextMenuItemID.attachAsImageToCurrentChat,
        description: stockContextMenuItemID.attachAsImageToCurrentChat,
        handle: stockContextMenuItemID.attachAsImageToCurrentChat,
        pathInContextMenu: "Send image to current chat",
        jsonMode: false,
        systemInstructionTemplate: "",
        messageTemplate: "",
        modelId: "",
        playerId: "",
        targetsFilter: {
            selector: "*",
            selectorBehavior: CustomActionTargetSelectorBehavior.deepest,
            allowSearchInDescendants: false,
            allowSearchInPageSelection: false,
            imageRequired: true
        },
        selectedTextRegExp: "",
        context: {
            elementSnapshot: true,
            pageSnapshot: false,
            selectionSnapshot: false
        },
        resultsPresentation: CustomActionResultsPresentation.chatPane
    },
    {
        id: stockContextMenuItemID.sendTableAsHTMLToCurrentChat,
        name: stockContextMenuItemID.sendTableAsHTMLToCurrentChat,
        description: stockContextMenuItemID.sendTableAsHTMLToCurrentChat,
        handle: stockContextMenuItemID.sendTableAsHTMLToCurrentChat,
        pathInContextMenu: "Table / Send as HTML to current chat",
        jsonMode: false,
        systemInstructionTemplate: "",
        messageTemplate: "",
        modelId: "",
        playerId: "",
        targetsFilter: {
            selector: "table",
            selectorBehavior: CustomActionTargetSelectorBehavior.closestToRoot,
            allowSearchInDescendants: false,
            allowSearchInPageSelection: false,
            imageRequired: false
        },
        selectedTextRegExp: "",
        context: {
            elementSnapshot: false,
            pageSnapshot: false,
            selectionSnapshot: false
        },
        resultsPresentation: CustomActionResultsPresentation.chatPane
    },
    {
        id: stockContextMenuItemID.sendTableAsCSVToCurrentChat,
        name: stockContextMenuItemID.sendTableAsCSVToCurrentChat,
        description: stockContextMenuItemID.sendTableAsCSVToCurrentChat,
        handle: stockContextMenuItemID.sendTableAsCSVToCurrentChat,
        pathInContextMenu: "Table / Send as CSV to current chat",
        jsonMode: false,
        systemInstructionTemplate: "",
        messageTemplate: "",
        modelId: "",
        playerId: "",
        targetsFilter: {
            selector: "table",
            selectorBehavior: CustomActionTargetSelectorBehavior.deepest,
            allowSearchInDescendants: false,
            allowSearchInPageSelection: false,
            imageRequired: false
        },
        selectedTextRegExp: "",
        context: {
            elementSnapshot: false,
            pageSnapshot: false,
            selectionSnapshot: false
        },
        resultsPresentation: CustomActionResultsPresentation.chatPane
    }
];
