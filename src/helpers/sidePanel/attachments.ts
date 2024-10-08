import Modal from "bootstrap/js/dist/modal";
import {turndownService} from "./markdown";
import {
    chatPaneInputArea,
    chatPaneInputTextArea,
    inputAreaAttachmentIconsContainer,
    updateInputAreaHeight
} from "./htmlElements";
import {MessageAttachmentTypes} from "../storage/chatStorage";
import {addAttachmentToCurrentDraft, removeAttachmentFromCurrentDraft} from "./messages";

const pasteFormatChoiceModalElement = document.getElementById("pasteFormatChoiceModal") as HTMLDivElement;
const pasteFormatChoiceButtonGroup = pasteFormatChoiceModalElement.querySelector(".btn-group") as HTMLDivElement;
const pasteFormatChoiceModal = Modal.getOrCreateInstance(pasteFormatChoiceModalElement);


export function addAttachmentToChatInput(type: MessageAttachmentTypes, data: string) {
    const attachmentId = addAttachmentToCurrentDraft({type, data});
    if (!attachmentId)
        return;
    const iconContainer = document.createElement("div");
    iconContainer.className = "icon";
    const icon = type === MessageAttachmentTypes.IMAGE ? document.createElement("img") : document.createElement("i");
    if(type === MessageAttachmentTypes.IMAGE) {
        (icon as HTMLImageElement).src = data;
        icon.className = "object-fit-contain";
    }
    else {
        icon.className = "bi bi-file-earmark-music";
    }
    iconContainer.appendChild(icon);
    inputAreaAttachmentIconsContainer.appendChild(iconContainer);
    const trashIcon = document.createElement("i");
    trashIcon.className = "bi bi-trash";
    iconContainer.appendChild(trashIcon);
    iconContainer.onclick = () => {
        iconContainer.innerHTML = "";
        iconContainer.remove();
        removeAttachmentFromCurrentDraft(attachmentId);
    };
}

type AttachableItemFormat = "image" | "audio" | "textHTML" | "textPlain" | "textMarkdown";
interface AttachableItem {
    format?: AttachableItemFormat,
    data?: string,
    variations?: {
        format: AttachableItemFormat,
        data: string
    }[]
}

export function pasteTextToChatInput(text: string) {
    if(!text)
        return;
    if (chatPaneInputTextArea.selectionStart || chatPaneInputTextArea.selectionStart == 0) {
        let startPos = chatPaneInputTextArea.selectionStart;
        let endPos = chatPaneInputTextArea.selectionEnd;
        chatPaneInputTextArea.value = chatPaneInputTextArea.value.substring(0, startPos)
            + text
            + chatPaneInputTextArea.value.substring(endPos, chatPaneInputTextArea.value.length);
        updateInputAreaHeight();
    } else {
        chatPaneInputTextArea.value += text;
        updateInputAreaHeight();
    }
    chatPaneInputTextArea.focus();
}

const base64FromBlob = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

async function processTransferredItems(transferredData: DataTransfer, processClipboard = true, detectOnly = false) {
    const attachableItems: AttachableItem[] = [];

    const files = transferredData.files;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image"));
    const audioFiles = Array.from(files).filter((file) => file.type.startsWith("audio"));

    if (audioFiles.length > 0) {
        if(detectOnly)
            return true;
        // can only attach one audio file
        const file = audioFiles[0];
        attachableItems.push({format: "audio", data: await base64FromBlob(file)});
    }

    const items = processClipboard ? (await navigator.clipboard.read()) : [];

    const textItems = items.filter((item) => item.types.includes("text/plain") || item.types.includes("text/html"));

    if(detectOnly && textItems.length > 0)
        return true;

    for(let item of textItems) {
        const attachableItem: AttachableItem = {
            variations: []
        };
        if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            attachableItem.variations!.push({
                format: "textPlain",
                data: await blob.text()
            });
        }
        if(item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            const text = await blob.text();
            attachableItem.variations!.push({
                format: "textHTML",
                data: text
            });
            attachableItem.variations!.push({
                format: "textMarkdown",
                data: turndownService.turndown(text)
            });
        }

        const imageTypes = item.types.filter(type => type.startsWith("image"));
        if(imageTypes.length > 0) {
            const blob = await item.getType(imageTypes[0]);
            attachableItem.variations!.push({
                format: "image",
                data: await base64FromBlob(blob)
            });
        }
        attachableItems.push(attachableItem);
    }

    const imageItems = items.filter((item) =>
        !item.types.includes("text/plain") && !item.types.includes("text/html") && item.types.filter(type => type.startsWith("image")).length > 0
    );
    if (imageItems.length > 0) {
        if(detectOnly)
            return true;
        for (let item of imageItems) {
            for (let type of item.types) {
                if (type.startsWith('image')) {
                    const blob = await item.getType(type);
                    attachableItems.push({
                        format: "image",
                        data: await base64FromBlob(blob)
                    });
                }
            }
        };
    }
    else {
        if(detectOnly && imageFiles.length > 0)
            return true;
        if(!textItems.find((item) => item.types.filter(type => type.startsWith("image")).length > 0))
            for(let file of imageFiles) {
                attachableItems.push({
                    format: "image",
                    data: await base64FromBlob(file)
                });
            }
    }
    if(detectOnly)
        return false;

    return attachableItems;
}

function chooseAttachmentFormatAndAttach(variations: {data: string, format:AttachableItemFormat}[]) {
    const imageVariation = variations.find((variation) => variation.format === "image");
    const plainTextVariation = variations.find((variation) => variation.format === "textPlain");
    const markdownVariation = variations.find((variation) => variation.format === "textMarkdown");
    const htmlVariation = variations.find((variation) => variation.format === "textHTML");

    pasteFormatChoiceButtonGroup.innerHTML = (
        (markdownVariation ? `<button id="pasteAsMarkdownButton" type="button" class="btn btn-primary" aria-label="Paste as markdown" title="Paste as markdown"><i class="bi bi-markdown"></i></button>`: "")
        +
        (plainTextVariation ? `<button id="pasteAsPlainTextButton" type="button" class="btn btn-primary" aria-label="Paste as plain text" title="Paste as plain text"><i class="bi bi-file-text"></i></button>` : "")
        +
        (htmlVariation ? `<button id="pasteAsHTMLButton" type="button" class="btn btn-primary" aria-label="Paste as HTML" title="Paste as HTML"><i class="bi bi-filetype-html"></i></button>` : "")
        +
        (imageVariation ? `<button id="pasteAsImageButton" type="button" class="btn btn-primary" aria-label="Paste as image" title="Paste as image"><i class="bi bi-file-image"></i></button>` : "")
    );

    if(imageVariation)
        (pasteFormatChoiceButtonGroup.querySelector("#pasteAsImageButton") as HTMLButtonElement).onclick = () => {
            pasteFormatChoiceModal.hide();
            addAttachmentToChatInput(MessageAttachmentTypes.IMAGE, imageVariation!.data);
        }
    if(plainTextVariation)
        (pasteFormatChoiceButtonGroup.querySelector("#pasteAsPlainTextButton") as HTMLButtonElement).onclick = () => {
            pasteFormatChoiceModal.hide();
            pasteTextToChatInput(plainTextVariation!.data);
        }
    if(markdownVariation)
        (pasteFormatChoiceButtonGroup.querySelector("#pasteAsMarkdownButton") as HTMLButtonElement).onclick = () => {
            pasteFormatChoiceModal.hide();
            pasteTextToChatInput(markdownVariation!.data);
        }
    if(htmlVariation)
        (pasteFormatChoiceButtonGroup.querySelector("#pasteAsHTMLButton") as HTMLButtonElement).onclick = () => {
            pasteFormatChoiceModal.hide();
            pasteTextToChatInput(htmlVariation!.data);
        }
    pasteFormatChoiceModal.show();
}


export function setInputAreaAttachmentEventListeners() {
    chatPaneInputTextArea.onpaste = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if(event.clipboardData)
            processTransferredItems(event.clipboardData).then(
                (attachableItems ) => {
                    if(Array.isArray(attachableItems) && attachableItems.length > 0) {
                        for(let item of attachableItems) {
                            if(item.variations?.length === 1) {
                                item = item.variations[0];
                            }
                            if(item.format === "audio" && item.data) {
                                addAttachmentToChatInput(MessageAttachmentTypes.AUDIO, item.data);
                            }
                            else if(item.format === "image" && item.data) {
                                addAttachmentToChatInput(MessageAttachmentTypes.IMAGE, item.data);
                            }
                            else if(!item.variations && ["textPlain", "textHTML"].includes(item.format || "")) {
                                pasteTextToChatInput(item.data || "");
                            }
                            else if(item.variations) {
                                chooseAttachmentFormatAndAttach(item.variations);
                                break;
                            }
                        }
                    }
                }
            ).catch();
    }

    chatPaneInputArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        chatPaneInputArea.classList.add("droppable");
        chatPaneInputArea.setAttribute("style", `
    background-image: 
        radial-gradient(circle at center center, #0b5ed755, #0a58ca55), 
        repeating-radial-gradient(circle at center center, #0a58ca55, #0a58ca55, transparent 20px, transparent 10px);
    background-blend-mode: multiply;
    `);

        if(event.dataTransfer)
            processTransferredItems(event.dataTransfer, false, true).then((isCompatibleData) => {
                if (isCompatibleData) {
                    chatPaneInputArea.classList.add("droppable")
                }
            });

    });

    chatPaneInputArea.addEventListener("dragleave", (event) => {
        event.preventDefault();
        chatPaneInputArea.classList.remove("droppable");
        chatPaneInputArea.setAttribute("style", "");
    });

    chatPaneInputArea.addEventListener("drop", (event) => {
        event.preventDefault();
        chatPaneInputArea.classList.remove("droppable");
        chatPaneInputArea.setAttribute("style", "");
        if (event.dataTransfer)
            processTransferredItems(event.dataTransfer, false).then(
                (attachableItems ) => {
                    if(Array.isArray(attachableItems) && attachableItems.length > 0) {
                        for(let item of attachableItems) {
                            if(item.variations?.length === 1) {
                                item = item.variations[0];
                            }
                            if(item.format === "audio" && item.data) {
                                addAttachmentToChatInput(MessageAttachmentTypes.AUDIO, item.data);
                            }
                            else if(item.format === "image" && item.data) {
                                addAttachmentToChatInput(MessageAttachmentTypes.IMAGE, item.data);
                            }
                            else if(!item.variations && ["textPlain", "textHTML"].includes(item.format || "")) {
                                pasteTextToChatInput(item.data || "");
                            }
                            else if(item.variations) {
                                chooseAttachmentFormatAndAttach(item.variations);
                            }
                        }
                    }
                }
            ).catch();
    });
}
