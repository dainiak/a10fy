import {Dexie, type EntityTable} from 'dexie';
import {uniqueString} from "../misc";

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
    id: string,
    timestamp: string,
    topic: string,
    vectors?: number[][],
    persona: string,
    model: string,
    messages: SerializedMessage[],
    draft: SerializedMessage,
    storageVersion?: number
}

export const a10fyChatDatabase = new Dexie('Chats') as Dexie & {
    chats: EntityTable<SerializedChat, 'id'>;
};

a10fyChatDatabase.version(1).stores({
    chats: 'id',
});


export function getChats() {
    return a10fyChatDatabase.chats.toArray();
}

export async function getChat(id: string) {
    return a10fyChatDatabase.chats.get(id);
}

export function deleteChat(id: string) {
    return a10fyChatDatabase.chats.delete(id);
}

export function clearAllChats() {
    return a10fyChatDatabase.chats.clear();
}

export function saveUpdatedChat(chat: SerializedChat) {
    if(chat.messages.length)
        return a10fyChatDatabase.chats.put(chat);
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

export function getTimestampStringForChat() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function createSerializedChat() {
    const chat: SerializedChat = {
        id: uniqueString(),
        timestamp: getTimestampStringForChat(),
        topic: "",
        persona: "",
        model: "",
        messages: [],
        draft: getEmptyDraft()
    };
    a10fyChatDatabase.chats.add(chat);
    return chat;
}
