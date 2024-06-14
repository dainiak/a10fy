import {cssPrefix} from "./constants";
import {llmGlobalActions} from "./llmGlobalActions";
import {llmPageActions} from "./domManipulation";

function getActionDescriptions() {
    const allActions = {...llmPageActions, ...llmGlobalActions};

    return Object.keys(allActions).map(actionName => {
        return {
            name: actionName,
            description: allActions[actionName].description
        }
    });
}

function getInlineDataPart(data) {
    if (!data) {
        return {
            text: "(Data not available)."
        }
    }
    return {
        inlineData: {
            mimeType: data.slice(data.indexOf(":") + 1, data.indexOf(";")),
            data: data.slice(data.indexOf("base64,") + 7)
        }
    }
}

function getMainPromptParts(userRequest) {
    const possibleActions = getActionDescriptions().map((action) => `${action.name} - ${action.description}`).join("\n");
    const outputDescription = `Return a JSON object with three keys: "understoodAs", "clarificationNeeded" and "actionList". The value of "understoodAs" is a string describing the user request according to how you understood it. The "clarificationNeeded" is a boolean value set to false if the user's request could be technically fulfilled as is, or true if the user should try to reformulate the request or answer some additional questions for the request to be more concrete. The value of "actionList" is an array of elementary steps of DOM tweaking or user interaction necessary to fulfill the user's request (if clarificationNeeded is true, then employ the "steps" interact with the user to ask for reformulation/clarification of the request). Each item of the "actionList" array is a triple [actionName, elementIndex, actionParams]. The actionName is a string that represents the action to be performed. Some actions are DOM-actions (requiring interaction with DOM of the webpage the user is currently on), while others are global actions. For a DOM-action that the elementIndex is an integer number that stands after ${cssPrefix}-prefix in the element's CSS class. For a global action the elementIndex should be set to null. The actionParams is any additional information required for an action; if an action does not require any additional data, actionParams can be null or can be omitted. The following are the possible values of actionName with their descriptions:
${possibleActions}

All in all, your response should look like \`\`\`{
    "understoodAs": "...",
    "clarificationNeeded": "...",
    "actionList": [[...], ...]
}\`\`\`.`

    if (userRequest.text) {
        userRequest = userRequest.text.trim().replace(/`/g, "'").replace(/\s+/g, " ");
        return [{text: `The user has the following request: \`\`\`${userRequest}\`\`\`. ${outputDescription}`}]
    } else if (userRequest.audio) {
        return [
            {text: "The user has dictated a request using voice input below."},
            getInlineDataPart(userRequest.audio),
            {text: outputDescription}
        ]
    }
}

export {getInlineDataPart, getMainPromptParts};