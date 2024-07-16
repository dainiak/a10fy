import {Dexie, type EntityTable} from 'dexie';
import {uniqueString} from "../uniqueId";

interface MessageAttachment {
    id: string,
    data: string,
    type: "image" | "audio"
}

interface SerializedMessage {
    id: string,
    type: "user" | "assistant",
    attachments: MessageAttachment[],
    content: string,
}

interface SerializedChat {
    id: string;
    timestamp: string;
    topic: string;
    persona: string;
    model: string;
    messages: SerializedMessage[];
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

export function addMessageToSerializedChat(chatId: string, message: SerializedMessage) {
    return chatsDatabase.transaction('rw', chatsDatabase.chats, async () => {
        const chat = await chatsDatabase.chats.get(chatId);
        if(chat) {
            chat.messages.push(message);
            await chatsDatabase.chats.put(chat);
        }
    });
}

export function createSerializedChat(topic: string, persona: string, model: string) {
    return chatsDatabase.chats.add({
        id: uniqueString(),
        timestamp: new Date().toISOString(),
        topic,
        persona,
        model,
        messages: [],
    });
}