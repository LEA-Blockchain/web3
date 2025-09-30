#!/usr/bin/env node

// ── Arrow-key picker (Esc quits) ───────────────────────────────────────────────
function selectArrow(choices, start = 0, msg = "Select") {
    return new Promise((resolve) => {
        const out = process.stdout;
        if (!process.stdin.isTTY) return resolve(choices[start]);

        const hide = () => out.write("\x1B[?25l");
        const show = () => out.write("\x1B[?25h");
        const clear = () => out.write("\x1B[2J\x1B[0f");

        let idx = Math.max(0, Math.min(start, choices.length - 1));

        function cleanup() {
            show();
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onData);
        }
        function exit(code = 0) {
            cleanup();
            out.write("\n");
            process.exit(code);
        }
        function render() {
            clear();
            out.write(`${msg} (↑/↓, Enter — Esc to exit)\n\n`);
            choices.forEach((c, i) => {
                const active = i === idx;
                out.write(`${active ? "› \x1B[36m" : "  "}${c}${active ? "\x1B[0m" : ""}\n`);
            });
        }
        function onData(s) {
            if (s === "\u0003") return exit(130); // Ctrl+C
            if (s === "\x1B") return exit(0);   // Esc
            if (s === "\r" || s === "\n") { cleanup(); return resolve(choices[idx]); }
            if (s === "\x1B[A") { idx = (idx - 1 + choices.length) % choices.length; return render(); }
            if (s === "\x1B[B") { idx = (idx + 1) % choices.length; return render(); }
        }

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        hide(); render();
        process.stdin.on("data", onData);
    });
}

// ── 1) Pick SDK source, then dynamically import ───────────────────────────────
const SDK_CHOICES = [
    { label: "src (./src/index.js)", spec: "./src/index.js" },
    { label: "dist (./dist/lea-wallet.node.mjs)", spec: "./dist/lea-wallet.node.mjs" },
];

const pickedSdk = await selectArrow(SDK_CHOICES.map(o => o.label), 0, "Pick SDK source");
const sdkSpec = SDK_CHOICES.find(o => o.label === pickedSdk)?.spec ?? SDK_CHOICES[0].spec;

let mod;
try {
    mod = await import(sdkSpec);
} catch (e) {
    console.error(`Failed to load "${sdkSpec}".\n`, e?.message || e);
    process.exit(1);
}

// Handle either named exports or a default export object
const {
    basePodGetBalance,
    basePodTransfer,
    basePodMint,
    basePodBurn,
    basePodGetCurrentSupply,
    Wallet,
    Connection,
    generateMnemonic
} = mod.default ?? mod;

// ── 2) Pick cluster and proceed ───────────────────────────────────────────────
const cluster = await selectArrow(["devnet", "local"], 0, "Pick RPC cluster");
const connection = Connection(cluster);

// ── Demo below (your original flow) ──────────────────────────────────────────
const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;

console.log("--- Wallet Setup ---");
const wallet = await Wallet.fromMnemonic(MNEMONIC);
const account = await wallet.getAccount(ACCOUNT_INDEX);
const accountNoCoins = await wallet.getAccount(ACCOUNT_INDEX + 1);
const accountMint = await wallet.getAccount(ACCOUNT_INDEX + 2);

console.log(`Mint Account Address: ${accountMint.address}`);
console.log(`Account Address (bech32m): ${account.address}`);
console.log("\n\n--- Creating PublishKeyPair Transaction ---");

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
    if (txId.result) {
        console.log("Transfer Result:", txId.result);
    }
    const receiverBalance = await basePodGetBalance(connection, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k");
    console.log("Receiver Balance:", receiverBalance);
    const senderAfter = await basePodGetBalance(connection, account);
    if (senderAfter !== senderBefore - 1n) console.warn("⚠️ Sender balance inconsistent after transfer");
} catch (error) {
    console.error("Error during Transfer and Get Receiver Balance:", error);
}

// === Mint Test ===
try {
    console.log("\n=== Mint Test ===");
    const beforeMintBalance = await basePodGetBalance(connection, "lea1l6wknctrcsj9qasvwlj9jv4km44v960gqdzk6cs6vjqg05gc6kasfnhj9f");
    const mintTxid = await basePodMint(connection, accountMint, "lea1l6wknctrcsj9qasvwlj9jv4km44v960gqdzk6cs6vjqg05gc6kasfnhj9f", 23n);
    console.log("Mint TxId:", mintTxid);
    if (mintTxid.result) {
        console.log("Transfer Result:", mintTxid.result);
    }
    const mintReceiverBalance = await basePodGetBalance(connection, "lea1l6wknctrcsj9qasvwlj9jv4km44v960gqdzk6cs6vjqg05gc6kasfnhj9f");
    console.log("Mint Receiver Balance:", mintReceiverBalance);
    if (mintReceiverBalance !== beforeMintBalance + 23n) console.warn("⚠️ Balance mismatch after minting");
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
    if (afterBurnBalance !== beforeBurnBalance - 1n) console.warn("⚠️ Balance mismatch after burn");
} catch (error) {
    console.error("Error during Burn Test:", error);
}

// === Total Supply Test ===
try {
    console.log("\n=== Total Supply Test ===");
    const totalSupply = await basePodGetCurrentSupply(connection);
    console.log("Total Supply:", totalSupply);
} catch (error) {
    console.error("Error during Total Supply Test:", error);
}

// === This should fail ===
try {
    console.log("\n############### This should fail ################");
    const txId2 = await basePodTransfer(connection, accountNoCoins, "lea1g7s0uf2jc0l85seas5mvj0gvg2pj895uwtpwemmz40qgk6g6drrqxvnh0k", 1n);
    console.log("Unexpected Success - Transfer TxId:", txId2);
} catch (error) {
    console.log("Expected failure occurred:", error.message || error);
}
