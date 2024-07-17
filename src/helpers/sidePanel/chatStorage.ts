import {Dexie, type EntityTable} from 'dexie';
import {uniqueString} from "../uniqueId";

export interface SerializedPersona {
    id: string,
    name: string,
    description: string,
    defaultModel: string,
    systemInstruction: string,
    safetySettings: object
}

export interface SerializedModel {
    id: string,
    name: string,
    description: string,
    apiKey: string,
}

export interface MessageAttachment {
    id: string,
    data: string,
    type: "image" | "audio"
}

export interface SerializedMessage {
    id: string,
    type: "user" | "model",
    attachments: MessageAttachment[],
    content: string,
}

export interface SerializedChat {
    id: string;
    timestamp: string;
    topic: string;
    persona: string;
    model: string;
    messages: SerializedMessage[];
    draft: SerializedMessage & {type: "user"};
}

export const a10fyDatabase = new Dexie('Chats') as Dexie & {
    chats: EntityTable<SerializedChat, 'id'>;
};

a10fyDatabase.version(1).stores({
    chats: 'id',
});


export function getChats() {
    return a10fyDatabase.chats.toArray();
}

export async function getChat(id: string) {
    return a10fyDatabase.chats.get(id);
}

export function deleteChat(id: string) {
    return a10fyDatabase.chats.delete(id);
}

export function saveUpdatedChat(chat: SerializedChat) {
    if(chat.messages.length)
        return a10fyDatabase.chats.put(chat);
}

export function getEmptyDraft() : SerializedMessage & {type: "user"} {
    return {
        id: uniqueString(),
        type: "user",
        attachments: [],
        content: "",
    }
}

export function getEmptyAssistantMessage() : SerializedMessage & {type: "model"} {
    return {
        id: uniqueString(),
        type: "model",
        attachments: [],
        content: "",
    }
}

export function createSerializedChat() {
    const chat: SerializedChat = {
        id: uniqueString(),
        timestamp: new Date().toISOString(),
        topic: "",
        persona: "",
        model: "",
        messages: [],
        draft: getEmptyDraft()
    };
    a10fyDatabase.chats.add(chat);
    return chat;
}