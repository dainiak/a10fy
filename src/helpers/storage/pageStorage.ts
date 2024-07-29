import {Dexie, type EntityTable} from 'dexie';
import {uniqueString} from "../uniqueId";


export interface SerializedPageSnapshot {
    id: string,
    timestamp: string,
    title: string,
    url: string,
    text: string,
    keywords: string[],
    summaries: string[],
    vectors: number[][],
    screenshot: string,
    storageVersion?: number
}

export const a10fyPageDatabase = new Dexie('Pages') as Dexie & {
    pages: EntityTable<SerializedPageSnapshot, 'id'>;
};

a10fyPageDatabase.version(1).stores({
    pages: 'id',
});


export function getPages() {
    return a10fyPageDatabase.pages.toArray();
}

export async function getPage(id: string) {
    return a10fyPageDatabase.pages.get(id);
}

export function deletePage(id: string) {
    return a10fyPageDatabase.pages.delete(id);
}

export function clearAllPages() {
    return a10fyPageDatabase.pages.clear();
}

export function getTimestampStringForPage() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function addSerializedPage(serializedPage?: SerializedPageSnapshot) {
    if(!serializedPage) {
        serializedPage = {
            id: uniqueString(),
            timestamp: getTimestampStringForPage(),
            title: "",
            url: "",
            text: "",
            keywords: [],
            summaries: [],
            vectors: [],
            screenshot: "",
        };
    }
    a10fyPageDatabase.pages.add(serializedPage);
    return serializedPage;
}

export function saveUpdatedPage(page: SerializedPageSnapshot) {
    return a10fyPageDatabase.pages.put(page);
}
