import { Wallet, generateMnemonic } from './src/index.js';

function formatKeysetJson(keyset, address, addressHex) {
    const result = JSON.stringify(
        {keyset, address, addressHex},
        (key, value) => {
            if (key !== '' && Array.isArray(value) && value.every((v) => typeof v === 'number')) {
                return JSON.stringify(value);
            }
            return value;
        },
        2
    );

    // The above stringifier leaves the arrays as quoted strings, so we unquote them.
    return result.replace(/"\[/g, '[').replace(/]"/g, ']');
}

const mnemonic = generateMnemonic();
const wallet = await Wallet.fromMnemonic(mnemonic);
const account = await wallet.getAccount(0);
console.log("Generated Mnemonic:", mnemonic);
console.log("Derived Account Address:", account.address);
console.log("Account Details:");
console.log(formatKeysetJson(account.keyset, account.address, account.addressHex));