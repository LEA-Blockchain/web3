import { HDKey } from './hd.js';
import { mnemonicToSeed } from './bip39.js';
import { LEA_DERIVATION_BASE } from './constants.js';
import { generateKeyset } from '@getlea/keygen';
import { createTransaction } from '@getlea/ltm';
import signTimestampManifest from '../manifests/sign_timestamp.json' with { type: 'json' };
import { uint8ArrayToBase64 } from './utils.js';

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
        console.log("signTimestamp:", signTimestamp);
        const account = await this.getAccount(accountIndex);
        const signers = { publisher: account };

        signTimestampManifest.constants.timestamp = String(signTimestamp);
        const tx = await createTransaction(signTimestampManifest, signers);
        return uint8ArrayToBase64(tx);
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