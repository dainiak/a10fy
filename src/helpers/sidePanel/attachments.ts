import * as Bootstrap from "bootstrap";
import {turndownService} from "./markdown";
import {chatPaneInputArea, chatPaneInputTextArea, updateInputAreaHeight} from "./htmlElements";


function addImageIcon(src: any) {
    const iconsContainer = document.querySelector(".a10fy-input-area-icons") as HTMLDivElement;
    const iconContainer = document.createElement("div");
    iconContainer.className = "icon";
    const img = document.createElement("img");
    img.src = src;
    iconContainer.appendChild(img);
    iconsContainer.appendChild(iconContainer);
}

function addAudioIcon() {
    const iconsContainer = document.querySelector(".a10fy-input-area-icons") as HTMLDivElement;
    const iconContainer = document.createElement("div");
    iconContainer.className = "icon";
    const icon = document.createElement("i");
    icon.classList.add("bi", "bi-file-earmark-music");
    iconContainer.appendChild(icon);
    iconsContainer.appendChild(iconContainer);
}

async function processItemsAddedToInputChat(transferredData: DataTransfer, processClipboard=true, detectOnly=false) {
    if(processClipboard) {
        const modalDialog = new Bootstrap.Modal(document.getElementById("pasteFormatChoiceModal") as HTMLDivElement);
        modalDialog.show();
    }

    const files = transferredData.files;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image"));
    const audioFiles = Array.from(files).filter((file) => file.type.startsWith("audio"));
    if (audioFiles.length > 0) {
        if(detectOnly)
            return true;
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            const reader = new FileReader();
            reader.onload = function () {
                if(reader.result)
                    addAudioIcon();
            };
            reader.readAsDataURL(file);
        }
    }

    const items = processClipboard ? (await navigator.clipboard.read()) : [];

    const richTextItems = items.filter((item) => item.types.includes("text/html"));
    let clipboardText = "";

    if (richTextItems.length > 0) {
        if(detectOnly)
            return true;
        const text = await richTextItems[0].getType("text/html");
        clipboardText = turndownService.turndown(await text.text());
    }
    else {
        const plainTextItems = items.filter((item) => item.types.includes("text/plain"));
        if (plainTextItems.length > 0) {
            if(detectOnly)
                return true;
            const text = await plainTextItems[0].getType("text/plain");
            clipboardText = await text.text();
        }
    }
    if(clipboardText) {
        if (chatPaneInputTextArea.selectionStart || chatPaneInputTextArea.selectionStart == 0) {
            let startPos = chatPaneInputTextArea.selectionStart;
            let endPos = chatPaneInputTextArea.selectionEnd;
            chatPaneInputTextArea.value = chatPaneInputTextArea.value.substring(0, startPos)
                + clipboardText
                + chatPaneInputTextArea.value.substring(endPos, chatPaneInputTextArea.value.length);
            updateInputAreaHeight();
        } else {
            chatPaneInputTextArea.value += clipboardText;
            updateInputAreaHeight();
        }
        return;
    }

    const imageItems = items.filter((item) => item.types.filter(type => type.startsWith("image")).length > 0);
    if (imageItems.length > 0) {
        if(detectOnly)
            return true;
        imageItems.forEach((item) => {
            for (let type of item.types) {
                if (type.startsWith('image')) {
                    item.getType(type).then((blob) => {
                        addImageIcon(URL.createObjectURL(blob));
                    })
                }
            }
        });
    }
    else {
        imageFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = function () {
                if(reader.result)
                    addImageIcon(reader.result);
            };
            reader.readAsDataURL(file);
        })
    }
    if(detectOnly)
        return false;
}


function setInputAreaAttachmentEventListeners() {
    chatPaneInputTextArea.onpaste = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if(event.clipboardData)
            processItemsAddedToInputChat(event.clipboardData).catch();
    }


    chatPaneInputArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        chatPaneInputArea.classList.add("droppable");
        chatPaneInputArea.setAttribute("style", `
    background-image: 
        radial-gradient(circle at center center, #444cf755, #e5e5f755), 
        repeating-radial-gradient(circle at center center, #444cf755, #444cf755, transparent 20px, transparent 10px);
    background-blend-mode: multiply;
    `);

        if(event.dataTransfer)
            processItemsAddedToInputChat(event.dataTransfer, false, true).then((isCompatibleData) => {
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
            processItemsAddedToInputChat(event.dataTransfer, false).catch();
    });
}

export {setInputAreaAttachmentEventListeners};