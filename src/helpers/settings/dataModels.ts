import {HarmBlockThreshold} from "@google/generative-ai";

export interface SerializedPersona {
    sortingIndex: number,
    id: string,
    name: string,
    description: string,
    defaultModel: string,
    systemInstruction: string,
    isVisibleInChat: boolean
}

export interface SerializedModel {
    sortingIndex: number,
    id: string,
    name: string,
    description: string,
    technicalName: string,
    topK: number | null,
    topP: number | null,
    temperature: number | null,
    apiKey: string,
    isVisibleInChat: boolean,
    safetySettings: {
        dangerousContent: HarmBlockThreshold,
        hateSpeech: HarmBlockThreshold,
        harassment: HarmBlockThreshold,
        sexuallyExplicit: HarmBlockThreshold
    }
}

export interface SerializedCustomCodePlayer {
    id: string,
    name: string,
    description: string,
    languageTags: string[],
    autoplay: boolean,
    hideCode: boolean,
    customCSS: string,
    customJS: string
    customHTML: string,
    testCode: string
}

export enum CustomActionResultsPresentation {
    chatPaneComplete = "chatPaneComplete",
    chatPane = "chatPane",
    actionPane = "actionPane",
    actionOrChatPane = "actionOrChatPane",
    actionOrChatPaneComplete = "actionOrChatPaneComplete",
    chatOrActionPane = "chatOrActionPane",
    chatOrActionPaneComplete = "chatOrActionPaneComplete"
}

export enum CustomActionTargetSelectorBehavior {
    exact = "exact",
    deepest = "deepest",
    closestToRoot = "closestToRoot"
}

export interface SerializedCustomAction {
    id: string,
    name: string,
    description: string,
    handle: string,
    jsonMode: boolean,
    systemInstruction: string,
    modelId: string,
    playerId: string,
    targetsFilter: {
        selector: string,
        selectorBehavior: CustomActionTargetSelectorBehavior,
        imageRequired: boolean
    },
    context: {
        elementSnapshot: boolean,
        pageSnapshot: boolean
    },
    resultsPresentation: CustomActionResultsPresentation
}
