import {Dexie, type EntityTable} from 'dexie';
import {uniqueString} from "../uniqueId";

export interface MessageAttachment {
    id: string,
    data: string,
    type: "image" | "audio"
}

export interface SerializedMessage {
    id: string,
    type: "user" | "assistant",
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

export const chatsDatabase = new Dexie('Chats') as Dexie & {
    chats: EntityTable<SerializedChat, 'id'>;
};

chatsDatabase.version(1).stores({
    chats: 'id',
});


export function getChats() {
    return chatsDatabase.chats.toArray();
}

export async function getChat(id: string) {
    return chatsDatabase.chats.get(id);
}

export function deleteChat(id: string) {
    return chatsDatabase.chats.delete(id);
}

export function saveUpdatedChat(chat: SerializedChat) {
    return chatsDatabase.chats.put(chat);
}

export function getEmptyDraft() : SerializedMessage & {type: "user"} {
    return {
        id: uniqueString(),
        type: "user",
        attachments: [],
        content: "",
    }
}

export function getEmptyAssistantMessage() : SerializedMessage & {type: "assistant"} {
    return {
        id: uniqueString(),
        type: "assistant",
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
    chatsDatabase.chats.add(chat);
    return chat;
}