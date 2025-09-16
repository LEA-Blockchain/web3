// systemProgram.js
import { createTransaction, decodeExecutionResult } from '@getlea/ltm';
import transferManifest from '../manifests/transfer.json' with { type: 'json' };
import mintManifest from '../manifests/mint.json' with { type: 'json' };
import burnManifest from '../manifests/burn.json' with { type: 'json' };
import publishKeysetManifest from '../manifests/publish_keyset.json' with { type: 'json' };
import mintWhitelistManifest from '../manifests/mint_whitelist.json' with { type: 'json' };
import getAllowedMintManifest from '../manifests/get_allowed_mint.json' with { type: 'json' };
import getBalanceManifest from '../manifests/get_balance.json' with { type: 'json' };
import getCurrentSupplyManifest from '../manifests/get_current_supply.json' with { type: 'json' };
import getLastTxHashManifest from '../manifests/get_last_tx_hash.json' with { type: 'json' };

// Utility function to deep clone an object
// Uses structuredClone if available, otherwise falls back to JSON methods
const clone = (x) =>
(typeof structuredClone === 'function'
  ? structuredClone(x)
  : JSON.parse(JSON.stringify(x)));

const withConstants = (manifest, constants) => {
  const m = clone(manifest);
  m.constants = { ...(m.constants || {}), ...constants };
  return m;
};

async function buildTxAndDecoder(baseManifest, constants = {}, signers = {}, options = {}) {
  const manifestUsed = Object.keys(constants).length
    ? withConstants(baseManifest, constants)
    : clone(baseManifest);

  // Pass through chaining option (prevTxHash) if provided
  const tx = await createTransaction(manifestUsed, signers, options);

  // decode() is bound to the exact manifest used
  const decode = async (resultBuffer) => {
    return decodeExecutionResult(resultBuffer, manifestUsed);
  };

  return { tx, decode };
}

export const SystemProgram = {
  transfer: async (fromKeyset, toAddress, amount, options = {}) => {
    const signers = { publisher: fromKeyset };
    const constants = { receiver: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(transferManifest, constants, signers, options);
  },

  mint: async (fromKeyset, toAddress, amount, options = {}) => {
    const signers = { minter: fromKeyset };
    const constants = { recipient: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(mintManifest, constants, signers, options);
  },

  burn: async (fromKeyset, amount, options = {}) => {
    const signers = { burner: fromKeyset };
    const constants = { amount: String(amount) };
    return buildTxAndDecoder(burnManifest, constants, signers, options);
  },

  publishKeyset: async (fromKeyset, options = {}) => {
    const signers = { publisher: fromKeyset };
    return buildTxAndDecoder(publishKeysetManifest, {}, signers, options);
  },

  mintWhitelist: async (fromKeyset, toAddress, amount, options = {}) => {
    const signers = { authority: fromKeyset };
    const constants = { whitelistAddress: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(mintWhitelistManifest, constants, signers, options);
  },

  getAllowedMint: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(getAllowedMintManifest, constants, {});
  },

  getBalance: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(getBalanceManifest, constants, {});
  },

  getLastTxHash: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(getLastTxHashManifest, constants, {});
  },

  getCurrentSupply: async () => {
    return buildTxAndDecoder(getCurrentSupplyManifest, {}, {});
  },
};
