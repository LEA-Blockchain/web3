import { basePodGetBalance, basePodTransfer, Wallet, Connection, generateMnemonic } from './src/index.js';
//import { basePodGetBalance, basePodTransfer, Wallet, Connection, generateMnemonic } from './dist/lea-wallet.node.mjs'

import fs from 'fs';

const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;

(async () => {
    try {
        // --- Generate mnemonic test
        //const mnemonic = generateMnemonic();
        //console.log("Generated Mnemonic:", mnemonic);
        // 1. Setup Wallet and Account
        console.log("--- Wallet Setup ---");
        const wallet = await Wallet.fromMnemonic(MNEMONIC);

        //const wallet = await Wallet.fromMnemonic(mnemonic);
        const account = await wallet.getAccount(ACCOUNT_INDEX);
        const accountNoCoins = await wallet.getAccount(ACCOUNT_INDEX + 1);
        //lea1sv9d4ayz8lm4mjxnxdu42c23g0jpk7w7r3g2euvug5ltn4wfnffq8pnjnn
        console.log(`Account Address (bech32m): ${account.address}`);

        console.log("\n\n--- Creating PublishKeyPair Transaction ---");

        const connection = Connection("local");

        //const lastTxHash = await fetchPrevTxHashFromNetwork(connection, "lea1j4nfphwcx7lay0lys29wfsdy4ruwhr3th080m0gkt785ayga73fss2wdgf");
        //console.log("lastTxHash", lastTxHash);

        //await publishKeyset(connection, account);

        const balance = await basePodGetBalance(connection, "lea1sv9d4ayz8lm4mjxnxdu42c23g0jpk7w7r3g2euvug5ltn4wfnffq8pnjnn");
        console.log("balance", balance);

        const txId = await basePodTransfer(connection, account, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k", 1n);
        console.log("Transfer TxId", txId);


        const receiverBalance = await basePodGetBalance(connection, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k");
        console.log("receiverBalance", receiverBalance);

        console.log("############### This should fail ################");

        const txId2 = await basePodTransfer(connection, accountNoCoins, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k", 1n);
        console.log("Transfer TxId", txId2);

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();