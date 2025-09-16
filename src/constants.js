/**
 * Defines constants used throughout the Lea blockchain library.
 */
/**
 * SLIP-0044 coin type for the Lea blockchain.
 * Used in BIP-44 derivation paths: m/44'/COIN_TYPE'/...
 * Example: 2323 (must match registered or chosen value).
 */
export const LEA_COIN_TYPE = 2323;

/**
 * BIP-44 purpose code for classical HD wallets (e.g., Ed25519).
 */
export const BIP44_PURPOSE = 44;

/**
 * Base derivation paths (SLIP-0010 compatible).
 * Example: m/44'/COIN_TYPE' or m/211'/COIN_TYPE'
 */
//export const SLHDSA_DERIVATION_BASE = `m/${SLHDSA_PQC_PURPOSE}'/${LEA_COIN_TYPE}'`;
export const LEA_DERIVATION_BASE = `m/${BIP44_PURPOSE}'/${LEA_COIN_TYPE}'`;

/**
 * Default Bech32m Human-Readable Part (HRP) for Lea addresses.
 * Example: 'lea'
 */
export const ADDRESS_HRP = 'lea';

// Add other constants as needed:
// export const DEFAULT_RPC_ENDPOINT = 'http://localhost:8899';
// export const NETWORK_ID = 'lea-mainnet';
// export const WS_ENDPOINT = 'ws://localhost:8900';

export const LEA_SYSTEM_PROGRAM = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255
]);
