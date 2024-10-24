export async function hash(alg: AlgorithmIdentifier, str: string) {
    const bin = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest(alg, bin);
    return bufferToHex(hash);
}

function bufferToHex(buf: ArrayBuffer) {
    let result = '';
    const view = new Uint8Array(buf);
    for (const byte of view) {
        result += byte.toString(16).padStart(2, '0');
    }
    return result;
}
