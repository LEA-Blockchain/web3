import { HDKey } from './hd.js';
import { mnemonicToSeed } from './bip39.js';
import { LEA_DERIVATION_BASE } from './constants.js';
import { generateKeyset } from '@getlea/keygen';
import { createTransaction } from '@getlea/ltm';
import signTimestampManifest from '../manifests/sign_timestamp.json' with { type: 'json' };
import { toBase64Url, fromBase64Url } from './utils.js';
import { decodeTransaction, verifyTransactionWithKeyset } from '@getlea/ltm';

export class WalletImpl {
    #hdKey;

    constructor(hdKey) {
        if (!(hdKey instanceof HDKey)) {
            console.error("Invalid masterKey:", hdKey);
            throw new Error("Invalid masterKey: must be an instance of HDKey.");
        }
        this.#hdKey = hdKey;
    }

    /** Derives an keyset using a BIP-44 path. */
    async deriveAccount(index) {
        try {
            const derivedKey = await this.#hdKey.derive(`${LEA_DERIVATION_BASE}/${index}'`);
            return await generateKeyset(derivedKey);
        } catch (error) {
            throw new Error(`Failed to derive account for path ${index}: ${error.message}`);
        }
    }

    async getAccount(index) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error("Account index must be a non-negative integer.");
        }

        const { keyset, address } = await this.deriveAccount(index);

        return {
            keyset,
            address,
        };
    }

    async signTimestamp(signTimestamp, accountIndex = 0) {
        const account = await this.getAccount(accountIndex);
        const signers = { publisher: account };

        signTimestampManifest.constants.timestamp = String(signTimestamp);
        const tx = await createTransaction(signTimestampManifest, signers);
        return toBase64Url(tx.tx);
    }
}

/** Factory for creating Wallet instances. */
export const Wallet = {
    /**
     * Creates a wallet from a BIP-39 mnemonic phrase.
     * @param {string} mnemonic - The seed phrase.
     * @param {string} [passphrase] - Optional BIP-39 passphrase.
     */
    fromMnemonic: async (mnemonic, passphrase) => {
        const seed = await mnemonicToSeed(mnemonic, passphrase);
        const masterKey = await HDKey.fromMasterSeed(seed);
        return new WalletImpl(masterKey);
    },
};

export async function validateSignedTimestamp(base64Url, maxDiff = 60) {
    let txBytes;
    let decoded;

    try {
        txBytes = fromBase64Url(base64Url);
        decoded = decodeTransaction(txBytes, signTimestampManifest);
    }
    catch (error) {
        throw new Error(`Failed to decode transaction: ${error.message}`);
    }

    const [invocation] = decoded.invocations;
    if (!invocation) {
        throw new Error('Timestamp transaction is missing the primary invocation.');
    }

    const feePayer = decoded.addresses[invocation.targetAddress];
    if (!feePayer) {
        throw new Error(`Invalid target address index: ${invocation.targetAddress}`);
    }

    const [{ uleb: receivedTimestamp }, inline] = invocation.instructions;
    if (typeof receivedTimestamp !== 'number') {
        throw new Error('Timestamp instruction did not decode to a number.');
    }

    const keyset = inline?.INLINE?.info?.keyset;
    if (!keyset) {
        throw new Error('Inline pubset/keyset not found in transaction.');
    }

    const verification = await verifyTransactionWithKeyset(decoded, keyset);
    if (!verification.ok) {
        throw new Error('Signature verification failed.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(receivedTimestamp - now) > maxDiff) {
        throw new Error(`Timestamp drift too large (received ${receivedTimestamp}, now ${now}, max ±${maxDiff}s).`);
    }

    return feePayer.bech32m ?? feePayer.hex;
}

