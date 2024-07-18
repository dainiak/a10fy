import {SerializedCustomCodePlayer} from "./dataModels";
import {getFromStorage, setToStorage} from "../storageHandling";
import {storageKeys} from "../constants";
import {uniqueString} from "../uniqueId";
import * as Bootstrap from "bootstrap";
import {customPlayerFactory} from "../players/custom";

export async function fillPlayersTable() {
    const players: SerializedCustomCodePlayer[] = (await getFromStorage(storageKeys.codePlayers) || []);
    const table = document.getElementById("codePlayersTable") as HTMLTableElement;
    table.innerHTML = "";
    players.forEach((player: SerializedCustomCodePlayer) => {
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = player.name;
        tr.appendChild(nameTd);
        const languageTagsTd = document.createElement("td");
        languageTagsTd.textContent = player.languageTags.join(", ");
        tr.appendChild(languageTagsTd);
        const descriptionTd = document.createElement("td");
        descriptionTd.textContent = player.description;
        tr.appendChild(descriptionTd);

        const editTd = document.createElement("td");
        editTd.innerHTML = `
            <button class="btn btn-outline-secondary btn-sm edit-btn" data-player-id="${player.id}" aria-label="Edit player" title="Edit player"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger btn-sm delete-btn" data-player-id="${player.id}" aria-label="Delete player" title="Delete player"><i class="bi bi-trash"></i></button>
        `;

        tr.appendChild(editTd);
        (editTd.querySelector('edit-btn') as HTMLButtonElement).onclick = () => editPlayer(player.id);
        (editTd.querySelector('delete-btn') as HTMLButtonElement).onclick = () => deletePlayer(player.id, tr);
        table.appendChild(tr);
    });
}

async function editPlayer(playerId: string) {
    const modalElement = document.getElementById("editCodePlayerModal") as HTMLDivElement;
    const modal = Bootstrap.Modal.getOrCreateInstance(modalElement);
    const players: SerializedCustomCodePlayer[] = (await getFromStorage(storageKeys.codePlayers) || []);
    const player = players.find((player: SerializedCustomCodePlayer) => player.id === playerId);
    if (!player)
        return;
    const nameInput = document.getElementById("codePlayerName") as HTMLInputElement;
    nameInput.value = player.name;
    const descriptionInput = document.getElementById("codePlayerDescription") as HTMLInputElement;
    descriptionInput.value = player.description;
    const languageTagsInput = document.getElementById("codePlayerLanguageTags") as HTMLInputElement;
    languageTagsInput.value = player.languageTags.join(", ");
    const autoplayCheckbox = document.getElementById("codePlayerAutoplay") as HTMLInputElement;
    autoplayCheckbox.checked = player.autoplay;
    const hideCodeCheckbox = document.getElementById("codePlayerHideCode") as HTMLInputElement;
    hideCodeCheckbox.checked = player.hideCode;
    const cssInput = document.getElementById("codePlayerCSS") as HTMLTextAreaElement;
    cssInput.value = player.customCSS;
    const jsInput = document.getElementById("codePlayerJS") as HTMLTextAreaElement;
    jsInput.value = player.customJS;
    const htmlInput = document.getElementById("codePlayerHTML") as HTMLTextAreaElement;
    htmlInput.value = player.customHTML;
    const playerDebugCode = document.getElementById("playerDebugCode") as HTMLTextAreaElement;
    playerDebugCode.value = player.testCode;
    const playerDebugLanguage = document.getElementById("playerDebugLanguage") as HTMLInputElement;
    playerDebugLanguage.value = player.languageTags.length ? player.languageTags[0] : "";
    const saveButton = document.getElementById("saveCodePlayer") as HTMLButtonElement;
    saveButton.onclick = async () => {
        player.name = nameInput.value.trim();
        player.description = descriptionInput.value.trim();
        player.languageTags = languageTagsInput.value.split(",").map((tag: string) => tag.trim());
        player.autoplay = autoplayCheckbox.checked;
        player.hideCode = hideCodeCheckbox.checked;
        player.customCSS = cssInput.value.trim();
        player.customJS = jsInput.value.trim();
        player.customHTML = htmlInput.value.trim();
        player.testCode = playerDebugCode.value.trim();
        await setToStorage(storageKeys.codePlayers, players);
        await fillPlayersTable();
        modal.hide();
    }
    const debugButton = document.getElementById("playerDebugButton") as HTMLButtonElement;
    debugButton.onclick = async () => {
        const debugOutputElement = document.getElementById("playerDebugOutput") as HTMLDivElement;
        debugOutputElement.innerHTML = '<div class="card-text align-self-center">Results of the player run will be displayed here.</div>';
        customPlayerFactory(cssInput.value.trim(), jsInput.value.trim(), htmlInput.value.trim())(
            (document.getElementById("playerDebugLanguage") as HTMLInputElement).value.trim(),
            playerDebugCode.value.trim(),
            debugOutputElement
        );
    }
}

async function deletePlayer(playerId: string, tr: HTMLTableRowElement) {
    const players: SerializedCustomCodePlayer[] = (await getFromStorage(storageKeys.codePlayers) || []).filter((player: SerializedCustomCodePlayer) => player.id !== playerId);
    await setToStorage(storageKeys.codePlayers, players);
    tr.remove();
}

export function setupNewPlayerButton() {
    (document.getElementById("newCodePlayer") as HTMLButtonElement).addEventListener("click", async () => {
        const players: SerializedCustomCodePlayer[] = await getFromStorage(storageKeys.codePlayers) || [];
        const newPlayer: SerializedCustomCodePlayer = {
            id: uniqueString(),
            name: "New Player",
            description: "Description",
            languageTags: [],
            autoplay: false,
            hideCode: false,
            customCSS: "",
            customJS: "",
            customHTML: "",
            testCode: ""
        };
        await setToStorage(storageKeys.codePlayers, [...players, newPlayer]);
        await fillPlayersTable();
        await editPlayer(newPlayer.id);
    });
}
