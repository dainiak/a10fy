import {Dexie, type EntityTable} from 'dexie';
import {uniqueString} from "../uniqueId";

export enum ChatMessageTypes {
    USER = "user",
    MODEL = "model"
}

export enum MessageAttachmentTypes {
    IMAGE = "image",
    AUDIO = "audio"
}

export interface MessageAttachment {
    id: string,
    data: string,
    type: MessageAttachmentTypes
}

export interface SerializedMessage {
    id: string,
    type: ChatMessageTypes,
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
    draft: SerializedMessage;
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

export function getEmptyDraft() : SerializedMessage {
    return {
        id: uniqueString(),
        type: ChatMessageTypes.USER,
        attachments: [],
        content: "",
    }
}

export function getEmptyAssistantMessage() : SerializedMessage {
    return {
        id: uniqueString(),
        type: ChatMessageTypes.MODEL,
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