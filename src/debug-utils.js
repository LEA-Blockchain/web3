// @web3/src/debug-utils.js

import { CteDecoder } from '@leachain/cte-core';
import * as CTE from '@leachain/cte-core';

/**
 * Decodes and logs the contents of a CTE transaction buffer for debugging.
 *
 * @param {Uint8Array} cteBuffer - The raw CTE transaction buffer.
 */
export async function decodeAndLogCteTransaction(cteBuffer) {
    console.log("--- Decoding CTE Transaction ---");
    if (!(cteBuffer instanceof Uint8Array) || cteBuffer.length === 0) {
        console.error("Error: Input must be a non-empty Uint8Array.");
        return;
    }
    console.log(`Total Buffer Length: ${cteBuffer.length} bytes`);

    let decoder;
    try {
        decoder = await CteDecoder.create(cteBuffer);
    } catch (err) {
        console.error("Failed to create CTE Decoder:", err);
        return;
    }

    try {
        let fieldIndex = 0;
        while (true) {
            const tag = decoder.peekTag();
            if (tag === null) {
                console.log("--- End of Transaction ---");
                break;
            }

            console.log(`\n[Field ${fieldIndex}]`);
            fieldIndex++;

            switch (tag) {
                case CTE.CTE_TAG_PUBLIC_KEY_LIST: {
                    const info = decoder.peekPublicKeyListInfo();
                    console.log(`  Type: Public Key List`);
                    if (info) {
                        console.log(`    Count: ${info.count}`);
                        console.log(`    Crypto Type: ${info.typeCode}`);
                        const data = decoder.readPublicKeyListData();
                        console.log(`    Data:`, data);
                    } else {
                        console.error("    Error: Could not read public key list info.");
                    }
                    break;
                }
                case CTE.CTE_TAG_SIGNATURE_LIST: {
                    const info = decoder.peekSignatureListInfo();
                    console.log(`  Type: Signature List`);
                    if (info) {
                        console.log(`    Count: ${info.count}`);
                        console.log(`    Crypto Type: ${info.typeCode}`);
                        const data = decoder.readSignatureListData();
                        console.log(`    Data:`, data);
                    } else {
                        console.error("    Error: Could not read signature list info.");
                    }
                    break;
                }
                case CTE.CTE_TAG_COMMAND_DATA: {
                    const len = decoder.peekCommandDataLength();
                    console.log(`  Type: Command Data`);
                    if (len !== null) {
                        console.log(`    Length: ${len}`);
                        const payload = decoder.readCommandDataPayload();
                        console.log(`    Payload:`, payload.data);
                    } else {
                        console.error("    Error: Could not read command data info.");
                    }
                    break;
                }
                case CTE.CTE_TAG_IXDATA_FIELD: {
                    console.log(`  Type: Instruction Data (IxData)`);
                    try {
                        const header = decoder.peekSubtype();
                        if (header === null) {
                            console.error("    Error: Could not peek IxData header.");
                            break;
                        }

                        const subtype = header & CTE.CTE_IXDATA_SUBTYPE_MASK;
                        const typeInfo = header >> 2;

                        switch (subtype) {
                            case CTE.CTE_IXDATA_SUBTYPE_LEGACY_INDEX:
                                console.log("    Subtype: Legacy Index");
                                console.log("    Value: ", decoder.readIxDataIndexReference());
                                break;

                            case CTE.CTE_IXDATA_SUBTYPE_VARINT:
                                console.log("    Subtype: Varint");
                                switch (typeInfo) {
                                    case CTE.CTE_IXDATA_VARINT_ENC_ZERO:
                                        console.log("      Encoding: Zero, Value: 0");
                                        decoder.readIxDataUleb128(); // Consume the field
                                        break;
                                    case CTE.CTE_IXDATA_VARINT_ENC_ULEB128:
                                        console.log("      Encoding: ULEB128");
                                        console.log("      Value: ", decoder.readIxDataUleb128());
                                        break;
                                    case CTE.CTE_IXDATA_VARINT_ENC_SLEB128:
                                        console.log("      Encoding: SLEB128");
                                        console.log("      Value: ", decoder.readIxDataSleb128());
                                        break;
                                    default:
                                        throw new Error(`Unknown Varint Encoding: ${typeInfo}`);
                                }
                                break;

                            case CTE.CTE_IXDATA_SUBTYPE_FIXED:
                                console.log("    Subtype: Fixed Size");
                                switch (typeInfo) {
                                    case CTE.CTE_IXDATA_FIXED_TYPE_INT8:
                                        console.log("      Value: ", decoder.readIxDataInt8());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_UINT8:
                                        console.log("      Value: ", decoder.readIxDataUint8());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_INT16:
                                        console.log("      Value: ", decoder.readIxDataInt16());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_UINT16:
                                        console.log("      Value: ", decoder.readIxDataUint16());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_INT32:
                                        console.log("      Value: ", decoder.readIxDataInt32());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_UINT32:
                                        console.log("      Value: ", decoder.readIxDataUint32());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_FLOAT32:
                                        console.log("      Value: ", decoder.readIxDataFloat32());
                                        break;
                                    case CTE.CTE_IXDATA_FIXED_TYPE_FLOAT64:
                                        console.log("      Value: ", decoder.readIxDataFloat64());
                                        break;
                                    default:
                                        throw new Error(`Unknown Fixed Type: ${typeInfo}`);
                                }
                                break;

                            case CTE.CTE_IXDATA_SUBTYPE_CONSTANT:
                                console.log("    Subtype: Constant");
                                console.log("    Value: ", decoder.readIxDataBoolean());
                                break;

                            default:
                                throw new Error(`Unknown IxData Subtype: ${subtype}`);
                        }
                    } catch (e) {
                        console.error("    Error decoding IxData field:", e.message);
                        throw e; // Re-throw to stop the loop
                    }
                    break;
                }
                default:
                    console.error(`  Unknown Field Tag: ${tag}`);
                    // Attempt to skip the field would be unsafe, so we stop.
                    return;
            }
        }
    } catch (err) {
        console.error("\nAn error occurred during decoding:", err);
    } finally {
        if (decoder) {
            decoder.destroy();
        }
    }
}