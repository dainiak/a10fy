export function uniqueString() {
    let s = Array.from(crypto.getRandomValues(new Uint32Array(2))).map(x => x.toString(36)).join("").slice(0, 10);
    return s + "0000000000".slice(0, 10 - s.length);
}

export function uniqueInteger() {
    return Array.from(crypto.getRandomValues(new Uint32Array(1)))[0];
}