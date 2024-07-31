import {addAttachmentToChatInput, pasteTextToChatInput} from "./sidePanel/attachments";
import {MessageAttachmentTypes} from "./storage/chatStorage";
import {CustomActionContext, stockContextMenuItemID} from "./constants";


function htmlTableToCSV(tableHTML: string) {
    const tableDiv = document.createElement("div");
    tableDiv.innerHTML = tableHTML;
    const csv = Array.from(tableDiv.querySelectorAll("tr")).map(row => {
        const cells = Array.from(row.querySelectorAll("td, th"));
        return cells.map(cell => {
            let cellText = (cell as HTMLElement).innerText.trim();
            cellText = cellText.replace(/\n/g, " ");
            if(cellText.match(/.*[,"].*/)) {
                cellText = `"${cellText.replace(/"/g, '\\"')}"`;
            }
            return cellText;
        }).join(",");
    }).join("\n");
    return `\n\`\`\`csv\n${csv}\n\`\`\``;
}

export function executeStockMenuAction(actionId: string, context: CustomActionContext) {
    if(actionId === stockContextMenuItemID.attachPageScreenshotToCurrentChat) {
        if(context.pageSnapshot) {
            addAttachmentToChatInput(MessageAttachmentTypes.IMAGE, context.pageSnapshot);
            return true;
        }
    }
    else if(actionId === stockContextMenuItemID.attachAsImageToCurrentChat) {
        if(context.elementSnapshot) {
            addAttachmentToChatInput(MessageAttachmentTypes.IMAGE, context.elementSnapshot);
            return true;
        }
    }
    else if (actionId === stockContextMenuItemID.sendTableAsHTMLToCurrentChat) {
        if(context.elementOuterHTMLSimplified) {
            pasteTextToChatInput(context.elementOuterHTMLSimplified);
            return true;
        }
    }
    else if (actionId === stockContextMenuItemID.sendTableAsCSVToCurrentChat) {
        if(context.elementOuterHTMLSimplified) {
            pasteTextToChatInput(htmlTableToCSV(context.elementOuterHTMLSimplified));
            return true;
        }
    }
    return false;
}