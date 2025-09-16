function areUint8ArraysEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length || !(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function combineUint8Arrays(arrays) {
    return new Uint8Array(arrays.reduce((acc, val) => (acc.push(...val), acc), []));
}

function uint8ArrayToBase64(uint8Array) {
    let binary = '';
    const len = uint8Array.length;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Export the necessary functions and the class
export { base64ToUint8Array, uint8ArrayToBase64, areUint8ArraysEqual, combineUint8Arrays };
