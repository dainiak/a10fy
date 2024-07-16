export function uniqueString() {
    return Array.from(crypto.getRandomValues(new Uint32Array(2))).map(x => x.toString(36)).join('');
}

export function uniqueInteger() {
    return Array.from(crypto.getRandomValues(new Uint32Array(1)))[0];
}