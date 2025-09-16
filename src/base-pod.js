import { SystemProgram } from "./system-program.js";

const BASE_POD_HEX = '1111111111111111111111111111111111111111111111111111111111111111';

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
        // Decoded result is a Map keyed by program/contract id hex; for our
        // implementation, lastTxHash lives under the basePod program id.
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
function normalizeAddress(addr, ctx) {
    if (typeof addr === 'string') return addr;
    if (addr && typeof addr === 'object' && typeof addr.address === 'string') {
        return addr.address;
    }
    throw new Error(`${ctx}: invalid address input (must be string or { address })`);
}

function ensureOk(resp, ctx) {
    if (!resp || typeof resp !== 'object') {
        throw new Error(`${ctx}: missing/invalid response object`);
    }
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

export async function basePodGetBalance(connection, address) {
    if (!connection) throw new Error("basePodGetBalance: 'connection' is required");
    if (typeof BASE_POD_HEX === 'undefined') throw new Error("basePodGetBalance: 'BASE_POD_HEX' is not defined");

    const resolvedAddress = normalizeAddress(address, "basePodGetBalance");

    let getBalanceObject;
    try {
        getBalanceObject = await SystemProgram.getBalance(resolvedAddress);
    } catch (e) {
        throw new Error(`basePodGetBalance: failed to build getBalance tx | cause=${e?.message || e}`);
    }

    let getBalanceResponse;
    try {
        getBalanceResponse = await connection.sendTransaction(getBalanceObject);
    } catch (e) {
        throw new Error(`basePodGetBalance: sendTransaction failed | cause=${e?.message || e}`);
    }

    ensureOk(getBalanceResponse, 'basePodGetBalance');

    const decoded = getBalanceResponse.decoded;
    if (!decoded || typeof decoded.get !== 'function') {
        throw new Error('basePodGetBalance: decoded payload has unexpected shape (expected Map-like with .get)');
    }

    const baseEntry = decoded.get(BASE_POD_HEX);
    if (!baseEntry) {
        throw new Error(`basePodGetBalance: no entry for BASE_POD_HEX=${BASE_POD_HEX}`);
    }

    const balance = baseEntry.balance;
    if (typeof balance === 'bigint') return balance;
    if (typeof balance === 'number') return BigInt(balance);

    throw new Error('basePodGetBalance: balance field missing or invalid');
}

export async function basePodTransfer(connection, fromAcccount, toAddress, amount) {
    if (!connection) throw new Error("basePodTransfer: 'connection' is required");
    if (!fromAcccount) throw new Error("basePodTransfer: 'fromAcccount' is required");
    if (amount === undefined || amount === null) throw new Error("basePodTransfer: 'amount' is required");

    const fromAddress = normalizeAddress(fromAcccount, "basePodTransfer (fromAcccount)");
    const resolvedTo = normalizeAddress(toAddress, "basePodTransfer (toAddress)");

    let prevTxHash;
    try {
        prevTxHash = await fetchPrevTxHashFromNetwork(connection, fromAddress);
    } catch (e) {
        throw new Error(`basePodTransfer: failed to fetch prevTxHash | cause=${e?.message || e}`);
    }

    if (prevTxHash === undefined) {
        try {
            await publishKeyset(connection, fromAcccount);
        } catch (e) {
            throw new Error(`basePodTransfer: failed to publish keyset for first tx | cause=${e?.message || e}`);
        }
    }

    let transferTransactionObject;
    try {
        transferTransactionObject = await SystemProgram.transfer(fromAcccount, resolvedTo, amount, { prevTxHash });
    } catch (e) {
        throw new Error(`basePodTransfer: failed to build transfer tx | cause=${e?.message || e}`);
    }

    let transferTransactionResponse;
    try {
        transferTransactionResponse = await connection.sendTransaction(transferTransactionObject);
    } catch (e) {
        throw new Error(`basePodTransfer: sendTransaction failed | cause=${e?.message || e}`);
    }

    ensureOk(transferTransactionResponse, 'basePodTransfer');

    const txId = transferTransactionResponse.txId;
    if (!txId) {
        throw new Error('basePodTransfer: missing txId in successful response');
    }
    return txId;
}
