import {UserRequest} from "./constants";
import {Part} from "@google/generative-ai";


export function getInlineDataPart(data?: string) {
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

export function getMainPromptParts(userRequest: UserRequest): Part[] {
    if (userRequest.text) {
        const userRequestText = userRequest.text.trim().replace(/`/g, "'").replace(/\s+/g, " ");
        return [{text: `The user has the following request: \`\`\`${userRequestText}\`\`\`.`}]
    } else if (userRequest.audio) {
        return [
            {text: "The user has dictated a request using voice input below."},
            getInlineDataPart(userRequest.audio)
        ]
    }
    return [];
}