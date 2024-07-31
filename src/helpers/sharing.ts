import {inflate, gzip} from 'pako';


type JSONPrimitive = string | number | boolean | null | undefined;

type JSONValue = JSONPrimitive | JSONValue[] | {
    [key: string]: JSONValue;
};


export function getDataFromSharingString(s: string) {
    try {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        const charCodeArray = Array.from(atob(s)).map((char) => char.charCodeAt(0));
        return JSON.parse(inflate(new Uint8Array(charCodeArray), { to: 'string' }));
    }
    catch {
    }
    return null;
}


export function getSharingStringFromData(data: JSONValue) {
    try {
        let hash = btoa(Array.from(gzip(JSON.stringify(data), {level: 9})).map((byte) => String.fromCharCode(byte)).join(''));
        hash = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return hash;
    }
    catch {
    }
    return null;
}

