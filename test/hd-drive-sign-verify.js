// derive_test.js (Modified: Performs sign/verify itself)

// 1. Import the modified HDKey class (which only does derivation)
// Adjust the path './hd.js' if your file is named differently or located elsewhere
import { HDKey } from '../src/hd.js';

// 2. Import noble utils and base ed25519 functions for sign/verify
import { hexToBytes, bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import * as ed25519 from '@noble/ed25519'; // Import base library for sign/verify

console.log("--- HD Key Derivation + External Sign/Verify Test ---");

try {
    // 3. Define the Master Seed
    const seedHex = '000102030405060708090a0b0c0d0e0f';
    const seed = hexToBytes(seedHex);
    console.log(`Using Seed: ${seedHex}`);

    // 4. Create the Master Key (m) using the HDKey class
    const masterKey = HDKey.fromMasterSeed(seed);
    console.log("\nMaster Key (m) Created.");

    // 5. Define the Derivation Path
    const derivationPath = "m/44'/2323'/0'"; // purpose'/coin_type'/account'
    console.log(`\nDeriving Path: ${derivationPath}`);

    // 6. Derive the Child Key using the HDKey class
    const derivedKey = masterKey.derive(derivationPath);
    console.log(`\nDerived Key (${derivationPath}) Details:`);
    // Get the keys needed for signing/verifying
    const derivedPrivateKey = derivedKey.privateKey;
    const derivedPublicKeyRaw = derivedKey.publicKeyRaw; // Getter requires sha512Sync setup in hd.js
    console.log(`  Private Key: ${bytesToHex(derivedPrivateKey)}`);
    console.log(`  Public Key : ${bytesToHex(derivedPublicKeyRaw)}`);

    // --- Sign/Verify using derived keys and base noble functions ---
    console.log("\nPerforming external Sign/Verify using @noble/ed25519:");

    // 7. Define a test message
    const messageString = `Test message signed on ${new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })} in Thailand with key ${derivationPath}`; // Added current date and location context
    const messageBytes = utf8ToBytes(messageString);
    console.log(`  Message    : "${messageString}"`);
    // console.log(`  Message Hex: ${bytesToHex(messageBytes)}`); // Optional log

    // 8. Sign the message using the derived private key and ed25519.sign
    console.log("  Signing message...");
    const signature = ed25519.sign(messageBytes, derivedPrivateKey);
    console.log(`  Signature  : ${bytesToHex(signature)}`);

    // 9. Verify the signature using the derived public key and ed25519.verify
    console.log("  Verifying signature...");
    const isVerified = ed25519.verify(signature, messageBytes, derivedPublicKeyRaw);
    console.log(`  Verification Result: ${isVerified}`);

    if (!isVerified) {
        throw new Error("SIGNATURE VERIFICATION FAILED!");
    }
    // --- End Sign/Verify ---

    console.log("\n--- Test Complete ---");

} catch (error) {
    console.error("\n--- Test Failed ---");
    console.error(error);
}