import { SystemProgram } from "./system-program.js";

const BASE_POD_HEX = '1111111111111111111111111111111111111111111111111111111111111111';

/** ------------------------ generic helpers ------------------------ **/

function normalizeAddress(addr, ctx) {
    if (typeof addr === 'string') return addr;
    if (addr && typeof addr === 'object' && typeof addr.address === 'string') return addr.address;
    throw new Error(`${ctx}: invalid address input (must be string or { address })`);
}

function ensureOk(resp, ctx) {
    if (!resp || typeof resp !== 'object') throw new Error(`${ctx}: missing/invalid response object`);
    if (!resp.ok) {
        const status = resp.status ?? 'unknown';
        const more = resp.decoded ?? resp.raw;
        throw new Error(`${ctx}: RPC returned not ok (status=${status})${more ? ` | details=${JSON.stringify(more)}` : ''}`);
    }
    if (resp.decodeError) {
        throw new Error(`${ctx}: failed to decode response | details=${JSON.stringify(resp.decodeError)}`);
    }
    if (resp.executionStatus !== 0 || resp.abortCode !== 0) {
        throw new Error(`${ctx}: on-chain execution failed (executionStatus=${resp.executionStatus}, abortCode=${resp.abortCode})`);
    }
}

async function sendBuiltTx(connection, txObject, ctx) {
    let resp;
    try {
        resp = await connection.sendTransaction(txObject);
    } catch (e) {
        throw new Error(`${ctx}: sendTransaction failed | cause=${e?.message || e}`);
    }
    ensureOk(resp, ctx);
    const txId = resp.txId;
    if (!txId) throw new Error(`${ctx}: missing txId in successful response`);
    return txId;
}

async function buildAndSend(connection, ctx, builder) {
    let txObject;
    try {
        txObject = await builder();
    } catch (e) {
        throw new Error(`${ctx}: failed to build tx | cause=${e?.message || e}`);
    }
    return sendBuiltTx(connection, txObject, ctx);
}

/** Decoded Map helper for BASE_POD_HEX entry */
function getBaseEntry(decoded, ctx) {
    if (!decoded || typeof decoded.get !== 'function') {
        throw new Error(`${ctx}: decoded payload has unexpected shape (expected Map-like with .get)`);
    }
    const baseEntry = decoded.get(BASE_POD_HEX);
    if (!baseEntry) {
        throw new Error(`${ctx}: no entry for BASE_POD_HEX=${BASE_POD_HEX}`);
    }
    return baseEntry;
}

/** --------------------- prevTxHash bootstrap flow --------------------- **/

async function fetchPrevTxHashFromNetwork(connection, address) {
    try {
        const tx = await SystemProgram.getLastTxHash(address);
        const res = await connection.sendTransaction(tx);
        const exec = res?.executionStatus;
        const abort = res?.abortCode;
        // If there is no previous tx, backends may return non-ok or non-zero exec/abort.
        if (!res?.ok || (typeof exec === 'number' && exec !== 0) || (typeof abort === 'number' && abort !== 0)) {
            return undefined;
        }
        const decoded = res.decoded;
        if (decoded && typeof decoded.get === 'function') {
            const baseEntry = decoded.get(BASE_POD_HEX);
            const last = baseEntry?.lastTxHash;
            if (last instanceof Uint8Array && last.length === 32) return last;
            if (Array.isArray(last) && last.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
                const bytes = new Uint8Array(last);
                if (bytes.length === 32) return bytes;
            }
        }
        return undefined;
    } catch (_) {
        // Network/transport error: treat as missing prev hash to allow first tx to proceed
        return undefined;
    }
}

/**
 * Note: This preserves your current behavior: publishKeyset logs but does not throw.
 * That means we always refetch prevTxHash after calling it, regardless of publish result.
 */
async function publishKeyset(connection, account) {
    const publishKeysetObject = await SystemProgram.publishKeyset(account);
    const publishKeysetResponse = await connection.sendTransaction(publishKeysetObject);
    if (!publishKeysetResponse.ok) {
        console.log(`Transaction Id: ${publishKeysetResponse.txId}`);
        console.error('[error] publishKeyset failed:', publishKeysetResponse.status, publishKeysetResponse.decoded || publishKeysetResponse.raw);
    } else if (publishKeysetResponse.decodeError) {
        console.warn('[warn] Decoding publishKeyset failed:', publishKeysetResponse.decodeError);
    } else {
        console.log('[log] Keyset published successfully:', publishKeysetResponse.decoded);
    }
}

/** Fetch prevTxHash, publishing keyset first if we don't find one. */
async function maybeGetPrevHash(connection, fromAddress, fromAcccount) {
    let prevTxHash;
    try {
        prevTxHash = await fetchPrevTxHashFromNetwork(connection, fromAddress);
    } catch (e) {
        throw new Error(`prevTxHash: failed to fetch | cause=${e?.message || e}`);
    }
    if (prevTxHash === undefined) {
        try {
            await publishKeyset(connection, fromAcccount);
        } catch (e) {
            // publishKeyset currently doesn't throw, but keep the message if it ever does
            throw new Error(`prevTxHash: failed to publish keyset for first tx | cause=${e?.message || e}`);
        }
        try {
            prevTxHash = await fetchPrevTxHashFromNetwork(connection, fromAddress);
        } catch (e) {
            throw new Error(`prevTxHash: failed to refetch after publish | cause=${e?.message || e}`);
        }
    }
    return prevTxHash; // may still be undefined
}

/** One helper to run a base-pod operation that needs prevTxHash */
async function runWithPrevHash({ connection, fromAcccount, opName, build }) {
    if (!connection) throw new Error(`${opName}: 'connection' is required`);
    if (!fromAcccount) throw new Error(`${opName}: 'fromAcccount' is required`);

    const fromAddress = normalizeAddress(fromAcccount, `${opName} (fromAcccount)`);
    const prevTxHash = await maybeGetPrevHash(connection, fromAddress, fromAcccount);

    return buildAndSend(connection, opName, () => build(prevTxHash));
}

/** ------------------------ exported API ------------------------ **/

export async function basePodGetBalance(connection, address) {
    if (!connection) throw new Error("basePodGetBalance: 'connection' is required");
    if (typeof BASE_POD_HEX === 'undefined') throw new Error("basePodGetBalance: 'BASE_POD_HEX' is not defined");

    const resolvedAddress = normalizeAddress(address, "basePodGetBalance");

    const getBalanceObject = await SystemProgram.getBalance(resolvedAddress);
    let getBalanceResponse;
    try {
        getBalanceResponse = await connection.sendTransaction(getBalanceObject);
    } catch (e) {
        throw new Error(`basePodGetBalance: sendTransaction failed | cause=${e?.message || e}`);
    }
    ensureOk(getBalanceResponse, 'basePodGetBalance');

    const baseEntry = getBaseEntry(getBalanceResponse.decoded, 'basePodGetBalance');
    const balance = baseEntry.balance;
    if (typeof balance === 'bigint') return balance;
    if (typeof balance === 'number') return BigInt(balance);
    throw new Error('basePodGetBalance: balance field missing or invalid');
}

export async function basePodTransfer(connection, fromAcccount, toAddress, amount) {
    if (amount === undefined || amount === null) throw new Error("basePodTransfer: 'amount' is required");
    const resolvedTo = normalizeAddress(toAddress, "basePodTransfer (toAddress)");

    return runWithPrevHash({
        connection,
        fromAcccount,
        opName: 'basePodTransfer',
        build: (prevTxHash) => SystemProgram.transfer(fromAcccount, resolvedTo, amount, { prevTxHash }),
    });
}

export async function basePodMint(connection, fromAcccount, toAddress, amount) {
    if (amount === undefined || amount === null) throw new Error("basePodMint: 'amount' is required");
    const resolvedTo = normalizeAddress(toAddress, "basePodMint (toAddress)");

    return runWithPrevHash({
        connection,
        fromAcccount,
        opName: 'basePodMint',
        build: (prevTxHash) => SystemProgram.mint(fromAcccount, resolvedTo, amount, { prevTxHash }),
    });
}

export async function basePodBurn(connection, fromAcccount, amount) {
    if (amount === undefined || amount === null) throw new Error("basePodBurn: 'amount' is required");

    return runWithPrevHash({
        connection,
        fromAcccount,
        opName: 'basePodBurn',
        build: (prevTxHash) => SystemProgram.burn(fromAcccount, amount, { prevTxHash }),
    });
}
