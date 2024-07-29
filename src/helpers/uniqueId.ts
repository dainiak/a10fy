export function uniqueString() {
    let s = Array.from(crypto.getRandomValues(new Uint32Array(2))).map(x => x.toString(36)).join("").slice(0, 10);
    return s + "0000000000".slice(0, 10 - s.length);
}

export function uniqueInteger() {
    return Array.from(crypto.getRandomValues(new Uint32Array(1)))[0];
}

export function stringHash(str: string, seed = 0) {
    // https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0; i < str.length; ++i) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
