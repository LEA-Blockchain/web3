const isNode = typeof Buffer !== "undefined" && typeof Buffer.from === "function";

// minimal cross-env atob/btoa shims
function atobSafe(b64) {
    if (isNode) return Buffer.from(b64, "base64").toString("binary");
    return globalThis.atob(b64);
}
function btoaSafe(bin) {
    if (isNode) return Buffer.from(bin, "binary").toString("base64");
    return globalThis.btoa(bin);
}

function bytesToBinary(u8) {
    let out = "";
    const CHUNK = 0x8000; // 32k
    for (let i = 0; i < u8.length; i += CHUNK) {
        out += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return out;
}
function binaryToBytes(bin) {
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i) & 0xff;
    return u8;
}

function normalizeToBase64(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    return b64 + "=".repeat(pad);
}

function base64ToUint8Array(input) {
    const b64 = normalizeToBase64(input);
    if (isNode) return new Uint8Array(Buffer.from(b64, "base64"));
    return binaryToBytes(atobSafe(b64));
}

function uint8ArrayToBase64(u8) {
    if (isNode) return Buffer.from(u8).toString("base64");
    return btoaSafe(bytesToBinary(u8));
}

function toBase64Url(u8) {
    const b64 = uint8ArrayToBase64(u8);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64url) {
    return base64ToUint8Array(b64url); // normalization already handles URL-safe input
}

function areUint8ArraysEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function combineUint8Arrays(...arrs) {
    let total = 0;
    for (const a of arrs) total += a.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrs) {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
}

export {
    base64ToUint8Array,
    uint8ArrayToBase64,
    areUint8ArraysEqual,
    combineUint8Arrays,
    toBase64Url,
    fromBase64Url,
};
