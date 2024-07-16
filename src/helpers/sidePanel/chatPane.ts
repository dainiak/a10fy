import {currentChatSettingsCard, makeUserInputAreaAutoexpandable} from './htmlElements';


function populatePersonasList() {
    const personas = ["one", "second", "trois"];
    let currentPersona = "one";
    const optionList = currentChatSettingsCard.querySelector("#llmPersonaSelect") as HTMLSelectElement;

    personas.forEach((persona) => {
        const option = document.createElement("option");
        option.value = persona;
        option.text = persona;
        optionList.appendChild(option);
        if (persona === currentPersona) {
            option.selected = true;
        }
    });
}

export {populatePersonasList};







export {makeUserInputAreaAutoexpandable};