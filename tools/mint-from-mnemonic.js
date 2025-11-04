#!/usr/bin/env node

import readline from "node:readline/promises";
import { stdin as input, stderr as errStream } from "node:process";
import { Wallet } from "../src/wallet.js";
import { Connection } from "../src/connection.js";
import { basePodMint, basePodGetBalance } from "../src/base-pod.js";

function usage(exitCode = 0) {
  console.error("Usage: node tools/mint-from-mnemonic.js --address <LEA_ADDRESS> --amount <INTEGER> [--cluster <devnet|testnet|mainnet-beta|local>]");
  process.exit(exitCode);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { cluster: "devnet" };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--address") {
      options.address = args[++i];
    } else if (arg === "--amount") {
      options.amount = args[++i];
    } else if (arg === "--cluster") {
      options.cluster = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      usage(1);
    }
  }

  if (!options.address) {
    console.error("Missing required --address <LEA_ADDRESS> option.");
    usage(1);
  }
  if (!options.amount) {
    console.error("Missing required --amount <INTEGER> option.");
    usage(1);
  }
  if (!/^\d+$/.test(options.amount)) {
    console.error("--amount must be a positive integer.");
    usage(1);
  }

  return options;
}

async function readMnemonicFromStdIn() {
  if (input.isTTY) {
    const rl = readline.createInterface({ input, output: errStream, terminal: true });
    const answer = await rl.question("Enter BIP-39 mnemonic:\n> ");
    rl.close();
    const mnemonic = answer.trim();
    if (!mnemonic) {
      throw new Error("No mnemonic provided.");
    }
    return mnemonic;
  }

  input.setEncoding("utf8");
  let data = "";
  for await (const chunk of input) {
    data += chunk;
  }

  const mnemonic = data.trim();
  if (!mnemonic) {
    throw new Error("No mnemonic provided via stdin.");
  }

  const wordCount = mnemonic.split(/\s+/).length;
  if (wordCount < 12) {
    throw new Error("Mnemonic appears to be incomplete (fewer than 12 words).");
  }

  return mnemonic;
}

async function main() {
  const { address, amount, cluster } = parseArgs();
  const mnemonic = await readMnemonicFromStdIn();

  const amountBigInt = BigInt(amount);
  if (amountBigInt <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  console.log(`Connecting to ${cluster}...`);
  const connection = Connection(cluster);

  console.log("Deriving account 0 from mnemonic...");
  const wallet = await Wallet.fromMnemonic(mnemonic);
  const minterAccount = await wallet.getAccount(0);

  console.log(`Minting ${amountBigInt} lea to ${address} from ${minterAccount.address}...`);
  const txId = await basePodMint(connection, minterAccount, address, amountBigInt);
  console.log(`Mint submitted. Transaction Id: ${txId}`);

  try {
    const newBalance = await basePodGetBalance(connection, address);
    console.log(`Recipient balance after mint: ${newBalance} lea`);
  } catch (error) {
    console.warn(`Unable to fetch updated balance: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(`Mint failed: ${error.message}`);
  process.exit(1);
});
