import { basePodGetBalance, basePodTransfer, basePodMint, basePodBurn, Wallet, Connection, generateMnemonic } from './src/index.js';
//import { basePodGetBalance, basePodTransfer, Wallet, Connection, generateMnemonic } from './dist/lea-wallet.node.mjs'

import fs from 'fs';

const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;


// --- Generate mnemonic test
//const mnemonic = generateMnemonic();
//console.log("Generated Mnemonic:", mnemonic);
// 1. Setup Wallet and Account
console.log("--- Wallet Setup ---");
const wallet = await Wallet.fromMnemonic(MNEMONIC);

//const wallet = await Wallet.fromMnemonic(mnemonic);
const account = await wallet.getAccount(ACCOUNT_INDEX);
const accountNoCoins = await wallet.getAccount(ACCOUNT_INDEX + 1);

const accountMint = await wallet.getAccount(ACCOUNT_INDEX + 2);
console.log(`Mint Account Address: ${accountMint.address}`);

//lea1sv9d4ayz8lm4mjxnxdu42c23g0jpk7w7r3g2euvug5ltn4wfnffq8pnjnn
console.log(`Account Address (bech32m): ${account.address}`);

console.log("\n\n--- Creating PublishKeyPair Transaction ---");

const connection = Connection("local");

//const lastTxHash = await fetchPrevTxHashFromNetwork(connection, "lea1j4nfphwcx7lay0lys29wfsdy4ruwhr3th080m0gkt785ayga73fss2wdgf");
//console.log("lastTxHash", lastTxHash);

// === Get Balance ===
try {
    console.log("\n=== Get Balance ===");
    const balance = await basePodGetBalance(connection, "lea1sv9d4ayz8lm4mjxnxdu42c23g0jpk7w7r3g2euvug5ltn4wfnffq8pnjnn");
    console.log("Balance:", balance);
} catch (error) {
    console.error("Error during Get Balance:", error);
}

// === Transfer and Get Receiver Balance ===
try {
    console.log("\n=== Transfer and Get Receiver Balance ===");
    const senderBefore = await basePodGetBalance(connection, account);
    const txId = await basePodTransfer(connection, account, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k", 1n);
    console.log("Transfer TxId:", txId);
    const receiverBalance = await basePodGetBalance(connection, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k");
    console.log("Receiver Balance:", receiverBalance);
    const senderAfter = await basePodGetBalance(connection, account);

    if (senderAfter !== senderBefore - 1n) {
        console.warn("⚠️ Sender balance inconsistent after transfer");
    }
} catch (error) {
    console.error("Error during Transfer and Get Receiver Balance:", error);
}

// === Mint Test ===
try {
    console.log("\n=== Mint Test ===");
    const beforeMintBalance = await basePodGetBalance(connection, "lea1l6wknctrcsj9qasvwlj9jv4km44v960gqdzk6cs6vjqg05gc6kasfnhj9f");
    const mintTxid = await basePodMint(connection, accountMint, "lea1l6wknctrcsj9qasvwlj9jv4km44v960gqdzk6cs6vjqg05gc6kasfnhj9f", 23n);
    console.log("Mint TxId:", mintTxid);
    const mintReceiverBalance = await basePodGetBalance(connection, "lea1l6wknctrcsj9qasvwlj9jv4km44v960gqdzk6cs6vjqg05gc6kasfnhj9f");
    console.log("Mint Receiver Balance:", mintReceiverBalance);

    if (mintReceiverBalance !== beforeMintBalance + 23n) {
        console.warn("⚠️ Balance mismatch after minting");
    }
} catch (error) {
    console.error("Error during Mint Test:", error);
}

// === Burn Test ===
try {
    console.log("\n=== Burn Test ===");
    const beforeBurnBalance = await basePodGetBalance(connection, account);
    const burnTxid = await basePodBurn(connection, account, 1n);
    console.log("Burn TxId:", burnTxid);
    const afterBurnBalance = await basePodGetBalance(connection, account);
    console.log("After Burn Balance:", afterBurnBalance);

    if (afterBurnBalance !== beforeBurnBalance - 1n) {
        console.warn("⚠️ Balance mismatch after burn");
    }
} catch (error) {
    console.error("Error during Burn Test:", error);
}

// === This should fail ===
try {
    console.log("\n############### This should fail ################");
    const txId2 = await basePodTransfer(connection, accountNoCoins, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k", 1n);
    console.log("Unexpected Success - Transfer TxId:", txId2);
} catch (error) {
    console.log("Expected failure occurred:", error.message || error);
}

