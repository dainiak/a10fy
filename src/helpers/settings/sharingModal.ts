import Modal from 'bootstrap/js/dist/modal';
import {getDataFromSharingString} from "../sharing";

const sharingModalElement = document.getElementById('sharingModal') as HTMLDivElement;
const sharingModal = Modal.getOrCreateInstance(sharingModalElement);
const modalTitle = sharingModalElement.querySelector('.modal-title') as HTMLHeadingElement;
const button = document.getElementById('sharingButton') as HTMLButtonElement;
const buttonIcon = button.querySelector('i') as HTMLElement;
const buttonLabel = button.querySelector('span') as HTMLElement;
const textArea = document.getElementById('sharingLinkArea') as HTMLTextAreaElement;

export function openSharingModal(taskType: "import" | "export", entityType: "persona" | "player", data: string, callback?: Function) {
    modalTitle.textContent = taskType === "import" ? `Import ${entityType}` : `Share ${entityType}`;
    buttonIcon.className = taskType === "import" ? "bi bi-box-arrow-down" : "bi bi-clipboard";
    buttonLabel.textContent = taskType === "import" ? `Import ${entityType}` : "Copy to clipboard";
    button.ariaLabel = taskType === "import" ? `Import ${entityType}` : "Copy sharing link to clipboard";
    button.title = taskType === "import" ? `Import ${entityType} from sharing link` : "Copy sharing link to clipboard";
    textArea.disabled = taskType === "export";
    if(taskType === "export") {
        textArea.value = data || "";
    } else {
        textArea.value = "";
    }
    button.onclick = (event) => {
        event.stopPropagation();
        event.preventDefault();
        if(taskType === "import") {
            if(callback)
                callback(textArea.value);
            sharingModal.hide();
        }
        else {
            navigator.clipboard.writeText(textArea.value).then(() => {
                buttonIcon.className = "bi bi-clipboard-check";
                buttonLabel.textContent = "Copied!";
                button.disabled = true;

                setTimeout(() => {
                    buttonIcon.className = "bi bi-clipboard";
                    buttonLabel.textContent = "Copy to clipboard";
                    button.disabled = false;
                }, 1500);
            }).catch(() => {
                buttonIcon.className = "bi bi-exclamation-triangle";
                buttonLabel.textContent = "Something went wrong…";
                button.disabled = true;
                setTimeout(() => {
                    buttonIcon.className = "bi bi-clipboard";
                    buttonLabel.textContent = "Copy to clipboard";
                    button.disabled = false;
                }, 1500);
            });
        }
    }

    textArea.onchange = () => {
        const obligatoryPrefix = `https://a10fy.net/share/${entityType}#`;
        if(taskType === "import") {
            button.disabled = !(textArea.value.startsWith(obligatoryPrefix) && getDataFromSharingString(textArea.value.slice(obligatoryPrefix.length)));
        }
    }

    sharingModal.show();
}