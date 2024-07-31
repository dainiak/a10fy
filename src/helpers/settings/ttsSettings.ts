import {getFromStorage, setToStorage} from "../storage/storageHandling";
import {storageKeys} from "../constants";
import {SerializedVoiceSettings} from "./dataModels";

const newVoicePreferenceButton = document.getElementById('newVoicePreferenceButton') as HTMLButtonElement;

export async function setupNewVoicePreferenceButton() {
    newVoicePreferenceButton.onclick = async () => {
        const voicePreferences = (await getFromStorage(storageKeys.ttsVoicePreferences) || {}) as SerializedVoiceSettings;
        voicePreferences[""] = {voiceName: "", rate: 1};
        await setToStorage(storageKeys.ttsVoicePreferences, voicePreferences);
        await fillTTSVoicePreferencesTable();
    }
}
newVoicePreferenceButton.onclick = async () => {
    const voicePreferences = (await getFromStorage(storageKeys.ttsVoicePreferences) || {}) as SerializedVoiceSettings;
    voicePreferences[""] = {voiceName: "", rate: 1};
    await setToStorage(storageKeys.ttsVoicePreferences, voicePreferences);
    await fillTTSVoicePreferencesTable();
}

export async function fillTTSVoicePreferencesTable() {
    const voicePreferencesTableBody = document.querySelector("#voicePreferencesTable tbody") as HTMLTableSectionElement;

    voicePreferencesTableBody.innerHTML = "";
    const allTTSVoices = await chrome.tts.getVoices();
    const allLanguages = allTTSVoices.map((v: chrome.tts.TtsVoice) => v.lang).filter((voice, idx, arr) => voice && arr.indexOf(voice) === idx).sort();
    const voicePreferences = (await getFromStorage(storageKeys.ttsVoicePreferences) || {}) as SerializedVoiceSettings;
    const voicePreferencesEntries = Object.entries(voicePreferences).sort((v1, v2) => v1[0] < v2[0] ? -1 : v1[0] > v2[0] ? 1 : 0);
    voicePreferencesEntries.forEach((entry) => {
        const [voiceLang, voiceSettings] = entry;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="voice-preference-lang"><select class="form-select form-select-sm"></select></td>
            <td class="voice-preference-name"><select class="form-select form-select-sm"></select></td>
            <td class="voice-preference-rate"><input type="number" value="${voiceSettings.rate}" min="0.1" max="3" step="0.1" class="form-control form-control-sm"></td>
            <td><button class="btn btn-outline-danger btn-sm delete-btn" data-lang-id="${voiceLang}" aria-label="Delete voice preference" title="Delete voice preference"><i class="bi bi-trash"></i></button></td>
`;
        voicePreferencesTableBody.appendChild(row);
        const langSelect = row.querySelector('.voice-preference-lang select') as HTMLSelectElement;
        langSelect.innerHTML = `<option value=""></option>` + allLanguages.map(
            (lang) => `<option value="${lang}" ${lang === voiceLang ? 'selected' : ''}>${lang}</option>`
        ).join('');
        langSelect.onchange = async () => {
            voicePreferences[langSelect.value] = {
                voiceName: allTTSVoices.find((v) => v.lang === langSelect.value)?.voiceName || "",
                rate: 1
            };
            delete voicePreferences[voiceLang];
            await setToStorage(storageKeys.ttsVoicePreferences, voicePreferences);
            await fillTTSVoicePreferencesTable();
        }
        const prefSelect = row.querySelector('.voice-preference-name select') as HTMLSelectElement;
        prefSelect.innerHTML = allTTSVoices.filter((v) => v.lang === voiceLang).map(
            (voice) => `<option value="${voice.voiceName}" ${voice.voiceName === voiceSettings.voiceName ? 'selected' : ''}>${voice.voiceName}</option>`
        ).join('');
        prefSelect.onchange = async () => {
            voicePreferences[voiceLang].voiceName = prefSelect.value;
            await setToStorage(storageKeys.ttsVoicePreferences, voicePreferences);
        }
        (row.querySelector('.voice-preference-rate input') as HTMLInputElement).onchange = async () => {
            voicePreferences[voiceLang].rate = parseFloat((row.querySelector('.voice-preference-rate input') as HTMLInputElement).value);
            await setToStorage(storageKeys.ttsVoicePreferences, voicePreferences);
        }

        (row.querySelector('.delete-btn') as HTMLButtonElement).onclick = async () => {
            delete voicePreferences[voiceLang];
            await setToStorage(storageKeys.ttsVoicePreferences, voicePreferences);
            row.remove();
        }
    });

}