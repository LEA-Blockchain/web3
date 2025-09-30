// node_modules/hash-wasm/dist/index.esm.js
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var Mutex = class {
  constructor() {
    this.mutex = Promise.resolve();
  }
  lock() {
    let begin = () => {
    };
    this.mutex = this.mutex.then(() => new Promise(begin));
    return new Promise((res) => {
      begin = res;
    });
  }
  dispatch(fn) {
    return __awaiter(this, void 0, void 0, function* () {
      const unlock = yield this.lock();
      try {
        return yield Promise.resolve(fn());
      } finally {
        unlock();
      }
    });
  }
};
var _a;
function getGlobal() {
  if (typeof globalThis !== "undefined")
    return globalThis;
  if (typeof self !== "undefined")
    return self;
  if (typeof window !== "undefined")
    return window;
  return global;
}
var globalObject = getGlobal();
var nodeBuffer = (_a = globalObject.Buffer) !== null && _a !== void 0 ? _a : null;
var textEncoder = globalObject.TextEncoder ? new globalObject.TextEncoder() : null;
function hexCharCodesToInt(a, b) {
  return (a & 15) + (a >> 6 | a >> 3 & 8) << 4 | (b & 15) + (b >> 6 | b >> 3 & 8);
}
function writeHexToUInt8(buf, str) {
  const size = str.length >> 1;
  for (let i = 0; i < size; i++) {
    const index = i << 1;
    buf[i] = hexCharCodesToInt(str.charCodeAt(index), str.charCodeAt(index + 1));
  }
}
function hexStringEqualsUInt8(str, buf) {
  if (str.length !== buf.length * 2) {
    return false;
  }
  for (let i = 0; i < buf.length; i++) {
    const strIndex = i << 1;
    if (buf[i] !== hexCharCodesToInt(str.charCodeAt(strIndex), str.charCodeAt(strIndex + 1))) {
      return false;
    }
  }
  return true;
}
var alpha = "a".charCodeAt(0) - 10;
var digit = "0".charCodeAt(0);
function getDigestHex(tmpBuffer, input, hashLength) {
  let p = 0;
  for (let i = 0; i < hashLength; i++) {
    let nibble = input[i] >>> 4;
    tmpBuffer[p++] = nibble > 9 ? nibble + alpha : nibble + digit;
    nibble = input[i] & 15;
    tmpBuffer[p++] = nibble > 9 ? nibble + alpha : nibble + digit;
  }
  return String.fromCharCode.apply(null, tmpBuffer);
}
var getUInt8Buffer = nodeBuffer !== null ? (data) => {
  if (typeof data === "string") {
    const buf = nodeBuffer.from(data, "utf8");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  if (nodeBuffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.length);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("Invalid data type!");
} : (data) => {
  if (typeof data === "string") {
    return textEncoder.encode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("Invalid data type!");
};
var base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64Lookup = new Uint8Array(256);
for (let i = 0; i < base64Chars.length; i++) {
  base64Lookup[base64Chars.charCodeAt(i)] = i;
}
function getDecodeBase64Length(data) {
  let bufferLength = Math.floor(data.length * 0.75);
  const len = data.length;
  if (data[len - 1] === "=") {
    bufferLength -= 1;
    if (data[len - 2] === "=") {
      bufferLength -= 1;
    }
  }
  return bufferLength;
}
function decodeBase64(data) {
  const bufferLength = getDecodeBase64Length(data);
  const len = data.length;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = base64Lookup[data.charCodeAt(i)];
    const encoded2 = base64Lookup[data.charCodeAt(i + 1)];
    const encoded3 = base64Lookup[data.charCodeAt(i + 2)];
    const encoded4 = base64Lookup[data.charCodeAt(i + 3)];
    bytes[p] = encoded1 << 2 | encoded2 >> 4;
    p += 1;
    bytes[p] = (encoded2 & 15) << 4 | encoded3 >> 2;
    p += 1;
    bytes[p] = (encoded3 & 3) << 6 | encoded4 & 63;
    p += 1;
  }
  return bytes;
}
var MAX_HEAP = 16 * 1024;
var WASM_FUNC_HASH_LENGTH = 4;
var wasmMutex = new Mutex();
var wasmModuleCache = /* @__PURE__ */ new Map();
function WASMInterface(binary, hashLength) {
  return __awaiter(this, void 0, void 0, function* () {
    let wasmInstance = null;
    let memoryView = null;
    let initialized = false;
    if (typeof WebAssembly === "undefined") {
      throw new Error("WebAssembly is not supported in this environment!");
    }
    const writeMemory = (data, offset = 0) => {
      memoryView.set(data, offset);
    };
    const getMemory = () => memoryView;
    const getExports = () => wasmInstance.exports;
    const setMemorySize = (totalSize) => {
      wasmInstance.exports.Hash_SetMemorySize(totalSize);
      const arrayOffset = wasmInstance.exports.Hash_GetBuffer();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      memoryView = new Uint8Array(memoryBuffer, arrayOffset, totalSize);
    };
    const getStateSize = () => {
      const view = new DataView(wasmInstance.exports.memory.buffer);
      const stateSize = view.getUint32(wasmInstance.exports.STATE_SIZE, true);
      return stateSize;
    };
    const loadWASMPromise = wasmMutex.dispatch(() => __awaiter(this, void 0, void 0, function* () {
      if (!wasmModuleCache.has(binary.name)) {
        const asm = decodeBase64(binary.data);
        const promise = WebAssembly.compile(asm);
        wasmModuleCache.set(binary.name, promise);
      }
      const module = yield wasmModuleCache.get(binary.name);
      wasmInstance = yield WebAssembly.instantiate(module, {
        // env: {
        //   emscripten_memcpy_big: (dest, src, num) => {
        //     const memoryBuffer = wasmInstance.exports.memory.buffer;
        //     const memView = new Uint8Array(memoryBuffer, 0);
        //     memView.set(memView.subarray(src, src + num), dest);
        //   },
        //   print_memory: (offset, len) => {
        //     const memoryBuffer = wasmInstance.exports.memory.buffer;
        //     const memView = new Uint8Array(memoryBuffer, 0);
        //     console.log('print_int32', memView.subarray(offset, offset + len));
        //   },
        // },
      });
    }));
    const setupInterface = () => __awaiter(this, void 0, void 0, function* () {
      if (!wasmInstance) {
        yield loadWASMPromise;
      }
      const arrayOffset = wasmInstance.exports.Hash_GetBuffer();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      memoryView = new Uint8Array(memoryBuffer, arrayOffset, MAX_HEAP);
    });
    const init = (bits = null) => {
      initialized = true;
      wasmInstance.exports.Hash_Init(bits);
    };
    const updateUInt8Array = (data) => {
      let read = 0;
      while (read < data.length) {
        const chunk = data.subarray(read, read + MAX_HEAP);
        read += chunk.length;
        memoryView.set(chunk);
        wasmInstance.exports.Hash_Update(chunk.length);
      }
    };
    const update = (data) => {
      if (!initialized) {
        throw new Error("update() called before init()");
      }
      const Uint8Buffer = getUInt8Buffer(data);
      updateUInt8Array(Uint8Buffer);
    };
    const digestChars = new Uint8Array(hashLength * 2);
    const digest = (outputType, padding = null) => {
      if (!initialized) {
        throw new Error("digest() called before init()");
      }
      initialized = false;
      wasmInstance.exports.Hash_Final(padding);
      if (outputType === "binary") {
        return memoryView.slice(0, hashLength);
      }
      return getDigestHex(digestChars, memoryView, hashLength);
    };
    const save = () => {
      if (!initialized) {
        throw new Error("save() can only be called after init() and before digest()");
      }
      const stateOffset = wasmInstance.exports.Hash_GetState();
      const stateLength = getStateSize();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      const internalState = new Uint8Array(memoryBuffer, stateOffset, stateLength);
      const prefixedState = new Uint8Array(WASM_FUNC_HASH_LENGTH + stateLength);
      writeHexToUInt8(prefixedState, binary.hash);
      prefixedState.set(internalState, WASM_FUNC_HASH_LENGTH);
      return prefixedState;
    };
    const load = (state) => {
      if (!(state instanceof Uint8Array)) {
        throw new Error("load() expects an Uint8Array generated by save()");
      }
      const stateOffset = wasmInstance.exports.Hash_GetState();
      const stateLength = getStateSize();
      const overallLength = WASM_FUNC_HASH_LENGTH + stateLength;
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      if (state.length !== overallLength) {
        throw new Error(`Bad state length (expected ${overallLength} bytes, got ${state.length})`);
      }
      if (!hexStringEqualsUInt8(binary.hash, state.subarray(0, WASM_FUNC_HASH_LENGTH))) {
        throw new Error("This state was written by an incompatible hash implementation");
      }
      const internalState = state.subarray(WASM_FUNC_HASH_LENGTH);
      new Uint8Array(memoryBuffer, stateOffset, stateLength).set(internalState);
      initialized = true;
    };
    const isDataShort = (data) => {
      if (typeof data === "string") {
        return data.length < MAX_HEAP / 4;
      }
      return data.byteLength < MAX_HEAP;
    };
    let canSimplify = isDataShort;
    switch (binary.name) {
      case "argon2":
      case "scrypt":
        canSimplify = () => true;
        break;
      case "blake2b":
      case "blake2s":
        canSimplify = (data, initParam) => initParam <= 512 && isDataShort(data);
        break;
      case "blake3":
        canSimplify = (data, initParam) => initParam === 0 && isDataShort(data);
        break;
      case "xxhash64":
      // cannot simplify
      case "xxhash3":
      case "xxhash128":
      case "crc64":
        canSimplify = () => false;
        break;
    }
    const calculate = (data, initParam = null, digestParam = null) => {
      if (!canSimplify(data, initParam)) {
        init(initParam);
        update(data);
        return digest("hex", digestParam);
      }
      const buffer = getUInt8Buffer(data);
      memoryView.set(buffer);
      wasmInstance.exports.Hash_Calculate(buffer.length, initParam, digestParam);
      return getDigestHex(digestChars, memoryView, hashLength);
    };
    yield setupInterface();
    return {
      getMemory,
      writeMemory,
      getExports,
      setMemorySize,
      init,
      update,
      digest,
      save,
      load,
      calculate,
      hashLength
    };
  });
}
var mutex$l = new Mutex();
var mutex$k = new Mutex();
var uint32View = new DataView(new ArrayBuffer(4));
var mutex$j = new Mutex();
var name$h = "blake3";
var data$h = "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IQEgAkFAaiICQcAASw0ACwsCQEHAACAHQf8BcSIGayIFIAIgBSACSRsiCUUNACAJQQNxIQtBACEFAkAgCUEESQ0AIAAgBmohByAJQfwAcSEIQQAhBQNAIAcgBWoiAkEoaiABIAVqIgotAAA6AAAgAkEpaiAKQQFqLQAAOgAAIAJBKmogCkECai0AADoAACACQStqIApBA2otAAA6AAAgCCAFQQRqIgVHDQALCwJAIAtFDQAgASAFaiEBIAUgBmogAGpBKGohBQNAIAUgAS0AADoAACABQQFqIQEgBUEBaiEFIAtBf2oiCw0ACwsgAC0AaCEHCyAAIAcgCWo6AGggA0HAAGokAAveAwQFfwN+BX8GfiMAQdABayIBJAACQCAAe6ciAkEALQCQigEiA08NAEEALQCKigFBBHIhBCABQShqIQVBACkDmIkBIQBBACkDkIkBIQZBACkDiIkBIQdBACkDgIkBIQggAyEJA0AgASAANwMYIAEgBjcDECABIAc3AwggASAINwMAIAEgA0EFdCIDQdGJAWoiCikDADcDKCABIANB2YkBaiILKQMANwMwIAEgA0HhiQFqIgwpAwA3AzggASADQemJAWoiDSkDADcDQCABIANB8YkBaikDADcDSCABIANB+YkBaikDADcDUCABIANBgYoBaikDADcDWCADQYmKAWopAwAhDiABQcAAOgBoIAEgDjcDYCABQgA3AyAgASAEOgBpIAEgADcDiAEgASAGNwOAASABIAc3A3ggASAINwNwIAFBkAFqIAFB8ABqIAVBwABCACAEQf8BcRACIAEpA7ABIQ4gASkDkAEhDyABKQO4ASEQIAEpA5gBIREgASkDwAEhEiABKQOgASETIA0gASkDyAEgASkDqAGFNwMAIAwgEiAThTcDACALIBAgEYU3AwAgCiAOIA+FNwMAIAlBf2oiCUH/AXEiAyACSw0AC0EAIAk6AJCKAQsgAUHQAWokAAvHCQIKfwV+IwBB4AJrIgUkAAJAAkAgAUGACEsNACAFIAA2AvwBIAVB/AFqIAFBgAhGIgZBECACQQEgA0EBQQIgBBABIAZBCnQiByABTw0BIAVB4ABqIgZCADcDACAFQdgAaiIIQgA3AwAgBUHQAGoiCUIANwMAIAVByABqIgpCADcDACAFQcAAaiILQgA3AwAgBUE4aiIMQgA3AwAgBUEwaiINQgA3AwAgBSADOgBqIAVCADcDKCAFQQA7AWggBUEAKQOAiQE3AwAgBUEAKQOIiQE3AwggBUEAKQOQiQE3AxAgBUEAKQOYiQE3AxggBSABQYAIRiIOrSACfDcDICAFIAAgB2pBACABIA4bEAQgBUGIAWpBMGogDSkDADcDACAFQYgBakE4aiAMKQMANwMAIAUgBSkDACIPNwOIASAFIAUpAwgiEDcDkAEgBSAFKQMQIhE3A5gBIAUgBSkDGCISNwOgASAFIAUpAyg3A7ABIAUtAGohACAFLQBpIQcgBSkDICECIAUtAGghASAFQYgBakHAAGogCykDADcDACAFQYgBakHIAGogCikDADcDACAFQYgBakHQAGogCSkDADcDACAFQYgBakHYAGogCCkDADcDACAFQYgBakHgAGogBikDADcDACAFIAE6APABIAUgAjcDqAEgBSAAIAdFckECciIAOgDxASAFIBI3A5gCIAUgETcDkAIgBSAQNwOIAiAFIA83A4ACIAVBoAJqIAVBgAJqIAVBsAFqIAEgAiAAQf8BcRACIAUpA8ACIQIgBSkDoAIhDyAFKQPIAiEQIAUpA6gCIREgBSkD0AIhEiAFKQOwAiETIAQgDkEFdGoiASAFKQPYAiAFKQO4AoU3AxggASASIBOFNwMQIAEgECARhTcDCCABIAIgD4U3AwBBAkEBIA4bIQYMAQsgAEIBIAFBf2pBCnZBAXKteUI/hYYiD6dBCnQiDiACIAMgBRAGIQcgACAOaiABIA5rIA9C////AYMgAnwgAyAFQcAAQSAgDkGACEsbahAGIQECQCAHQQFHDQAgBCAFKQMANwMAIAQgBSkDCDcDCCAEIAUpAxA3AxAgBCAFKQMYNwMYIAQgBSkDIDcDICAEIAUpAyg3AyggBCAFKQMwNwMwIAQgBSkDODcDOEECIQYMAQtBACEGQQAhAAJAIAEgB2oiCUECSQ0AIAlBfmoiCkEBdkEBaiIGQQNxIQ5BACEHAkAgCkEGSQ0AIAZB/P///wdxIQhBACEHIAVBiAFqIQEgBSEAA0AgASAANgIAIAFBDGogAEHAAWo2AgAgAUEIaiAAQYABajYCACABQQRqIABBwABqNgIAIABBgAJqIQAgAUEQaiEBIAggB0EEaiIHRw0ACwsgCkF+cSEIAkAgDkUNACAFIAdBBnRqIQEgBUGIAWogB0ECdGohAANAIAAgATYCACABQcAAaiEBIABBBGohACAOQX9qIg4NAAsLIAhBAmohAAsgBUGIAWogBkEBQgBBACADQQRyQQBBACAEEAEgACAJTw0AIAQgBkEFdGoiASAFIAZBBnRqIgApAwA3AwAgASAAKQMINwMIIAEgACkDEDcDECABIAApAxg3AxggBkEBaiEGCyAFQeACaiQAIAYLrRAIAn8EfgF/AX4EfwR+BH8EfiMAQfABayIBJAACQCAARQ0AAkBBAC0AkIoBIgINACABQTBqQQApA9CJATcDACABQThqQQApA9iJATcDACABQQApA6CJASIDNwMAIAFBACkDqIkBIgQ3AwggAUEAKQOwiQEiBTcDECABQQApA7iJASIGNwMYIAFBACkDyIkBNwMoQQAtAIqKASECQQAtAImKASEHQQApA8CJASEIQQAtAIiKASEJIAFBwABqQQApA+CJATcDACABQcgAakEAKQPoiQE3AwAgAUHQAGpBACkD8IkBNwMAIAFB2ABqQQApA/iJATcDACABQeAAakEAKQOAigE3AwAgASAJOgBoIAEgCDcDICABIAIgB0VyIgJBAnI6AGkgAUEoaiEKQgAhCEGACSELIAJBCnJB/wFxIQwDQCABQbABaiABIAogCUH/AXEgCCAMEAIgASABKQPQASINIAEpA7ABhTcDcCABIAEpA9gBIg4gASkDuAGFNwN4IAEgASkD4AEiDyABKQPAAYU3A4ABIAEgASkD6AEiECAGhTcDqAEgASAPIAWFNwOgASABIA4gBIU3A5gBIAEgDSADhTcDkAEgASAQIAEpA8gBhTcDiAEgAEHAACAAQcAASRsiEUF/aiESAkACQCARQQdxIhMNACABQfAAaiECIAshByARIRQMAQsgEUH4AHEhFCABQfAAaiECIAshBwNAIAcgAi0AADoAACAHQQFqIQcgAkEBaiECIBNBf2oiEw0ACwsCQCASQQdJDQADQCAHIAIpAAA3AAAgB0EIaiEHIAJBCGohAiAUQXhqIhQNAAsLIAhCAXwhCCALIBFqIQsgACARayIADQAMAgsLAkACQAJAQQAtAImKASIHQQZ0QQBBAC0AiIoBIhFrRg0AIAEgEToAaCABQQApA4CKATcDYCABQQApA/iJATcDWCABQQApA/CJATcDUCABQQApA+iJATcDSCABQQApA+CJATcDQCABQQApA9iJATcDOCABQQApA9CJATcDMCABQQApA8iJATcDKCABQQApA8CJASIINwMgIAFBACkDuIkBIgM3AxggAUEAKQOwiQEiBDcDECABQQApA6iJASIFNwMIIAFBACkDoIkBIgY3AwAgAUEALQCKigEiEyAHRXJBAnIiCzoAaSATQQRyIRNBACkDmIkBIQ1BACkDkIkBIQ5BACkDiIkBIQ9BACkDgIkBIRAMAQtBwAAhESABQcAAOgBoQgAhCCABQgA3AyAgAUEAKQOYiQEiDTcDGCABQQApA5CJASIONwMQIAFBACkDiIkBIg83AwggAUEAKQOAiQEiEDcDACABQQAtAIqKAUEEciITOgBpIAEgAkF+aiICQQV0IgdByYoBaikDADcDYCABIAdBwYoBaikDADcDWCABIAdBuYoBaikDADcDUCABIAdBsYoBaikDADcDSCABIAdBqYoBaikDADcDQCABIAdBoYoBaikDADcDOCABIAdBmYoBaikDADcDMCABIAdBkYoBaikDADcDKCATIQsgECEGIA8hBSAOIQQgDSEDIAJFDQELIAJBf2oiB0EFdCIUQZGKAWopAwAhFSAUQZmKAWopAwAhFiAUQaGKAWopAwAhFyAUQamKAWopAwAhGCABIAM3A4gBIAEgBDcDgAEgASAFNwN4IAEgBjcDcCABQbABaiABQfAAaiABQShqIhQgESAIIAtB/wFxEAIgASATOgBpIAFBwAA6AGggASAYNwNAIAEgFzcDOCABIBY3AzAgASAVNwMoIAFCADcDICABIA03AxggASAONwMQIAEgDzcDCCABIBA3AwAgASABKQPoASABKQPIAYU3A2AgASABKQPgASABKQPAAYU3A1ggASABKQPYASABKQO4AYU3A1AgASABKQPQASABKQOwAYU3A0ggB0UNACACQQV0QemJAWohAiATQf8BcSERA0AgAkFoaikDACEIIAJBcGopAwAhAyACQXhqKQMAIQQgAikDACEFIAEgDTcDiAEgASAONwOAASABIA83A3ggASAQNwNwIAFBsAFqIAFB8ABqIBRBwABCACAREAIgASATOgBpIAFBwAA6AGggASAFNwNAIAEgBDcDOCABIAM3AzAgASAINwMoIAFCADcDICABIA03AxggASAONwMQIAEgDzcDCCABIBA3AwAgASABKQPoASABKQPIAYU3A2AgASABKQPgASABKQPAAYU3A1ggASABKQPYASABKQO4AYU3A1AgASABKQPQASABKQOwAYU3A0ggAkFgaiECIAdBf2oiBw0ACwsgAUEoaiEJQgAhCEGACSELIBNBCHJB/wFxIQoDQCABQbABaiABIAlBwAAgCCAKEAIgASABKQPQASIDIAEpA7ABhTcDcCABIAEpA9gBIgQgASkDuAGFNwN4IAEgASkD4AEiBSABKQPAAYU3A4ABIAEgDSABKQPoASIGhTcDqAEgASAOIAWFNwOgASABIA8gBIU3A5gBIAEgECADhTcDkAEgASAGIAEpA8gBhTcDiAEgAEHAACAAQcAASRsiEUF/aiESAkACQCARQQdxIhMNACABQfAAaiECIAshByARIRQMAQsgEUH4AHEhFCABQfAAaiECIAshBwNAIAcgAi0AADoAACAHQQFqIQcgAkEBaiECIBNBf2oiEw0ACwsCQCASQQdJDQADQCAHIAIpAAA3AAAgB0EIaiEHIAJBCGohAiAUQXhqIhQNAAsLIAhCAXwhCCALIBFqIQsgACARayIADQALCyABQfABaiQAC6MCAQR+AkACQCAAQSBGDQBCq7OP/JGjs/DbACEBQv+kuYjFkdqCm38hAkLy5rvjo6f9p6V/IQNC58yn0NbQ67O7fyEEQQAhAAwBC0EAKQOYCSEBQQApA5AJIQJBACkDiAkhA0EAKQOACSEEQRAhAAtBACAAOgCKigFBAEIANwOAigFBAEIANwP4iQFBAEIANwPwiQFBAEIANwPoiQFBAEIANwPgiQFBAEIANwPYiQFBAEIANwPQiQFBAEIANwPIiQFBAEIANwPAiQFBACABNwO4iQFBACACNwOwiQFBACADNwOoiQFBACAENwOgiQFBACABNwOYiQFBACACNwOQiQFBACADNwOIiQFBACAENwOAiQFBAEEAOgCQigFBAEEAOwGIigELBgAgABADCwYAIAAQBwsGAEGAiQELqwIBBH4CQAJAIAFBIEYNAEKrs4/8kaOz8NsAIQNC/6S5iMWR2oKbfyEEQvLmu+Ojp/2npX8hBULnzKfQ1tDrs7t/IQZBACEBDAELQQApA5gJIQNBACkDkAkhBEEAKQOICSEFQQApA4AJIQZBECEBC0EAIAE6AIqKAUEAQgA3A4CKAUEAQgA3A/iJAUEAQgA3A/CJAUEAQgA3A+iJAUEAQgA3A+CJAUEAQgA3A9iJAUEAQgA3A9CJAUEAQgA3A8iJAUEAQgA3A8CJAUEAIAM3A7iJAUEAIAQ3A7CJAUEAIAU3A6iJAUEAIAY3A6CJAUEAIAM3A5iJAUEAIAQ3A5CJAUEAIAU3A4iJAUEAIAY3A4CJAUEAQQA6AJCKAUEAQQA7AYiKASAAEAMgAhAHCwsLAQBBgAgLBHgHAAA=";
var hash$h = "215d875f";
var wasmJson$h = {
  name: name$h,
  data: data$h,
  hash: hash$h
};
var mutex$i = new Mutex();
function validateBits$2(bits) {
  if (!Number.isInteger(bits) || bits < 8 || bits % 8 !== 0) {
    return new Error("Invalid variant! Valid values: 8, 16, ...");
  }
  return null;
}
function createBLAKE3(bits = 256, key = null) {
  if (validateBits$2(bits)) {
    return Promise.reject(validateBits$2(bits));
  }
  let keyBuffer = null;
  let initParam = 0;
  if (key !== null) {
    keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length !== 32) {
      return Promise.reject(new Error("Key length must be exactly 32 bytes"));
    }
    initParam = 32;
  }
  const outputSize = bits / 8;
  const digestParam = outputSize;
  return WASMInterface(wasmJson$h, outputSize).then((wasm) => {
    if (initParam === 32) {
      wasm.writeMemory(keyBuffer);
    }
    wasm.init(initParam);
    const obj = {
      init: initParam === 32 ? () => {
        wasm.writeMemory(keyBuffer);
        wasm.init(initParam);
        return obj;
      } : () => {
        wasm.init(initParam);
        return obj;
      },
      update: (data) => {
        wasm.update(data);
        return obj;
      },
      // biome-ignore lint/suspicious/noExplicitAny: Conflict with IHasher type
      digest: (outputType) => wasm.digest(outputType, digestParam),
      save: () => wasm.save(),
      load: (data) => {
        wasm.load(data);
        return obj;
      },
      blockSize: 64,
      digestSize: outputSize
    };
    return obj;
  });
}
var mutex$h = new Mutex();
var mutex$g = new Mutex();
var polyBuffer = new Uint8Array(8);
var mutex$f = new Mutex();
var mutex$e = new Mutex();
var mutex$d = new Mutex();
var mutex$c = new Mutex();
var mutex$b = new Mutex();
var mutex$a = new Mutex();
var mutex$9 = new Mutex();
var mutex$8 = new Mutex();
var mutex$7 = new Mutex();
var mutex$6 = new Mutex();
var mutex$5 = new Mutex();
var seedBuffer$2 = new Uint8Array(8);
var mutex$4 = new Mutex();
var seedBuffer$1 = new Uint8Array(8);
var mutex$3 = new Mutex();
var seedBuffer = new Uint8Array(8);
var mutex$2 = new Mutex();
var mutex$1 = new Mutex();
var mutex = new Mutex();

// src/hd.js
function utf8ToBytes(str) {
  return new TextEncoder().encode(str);
}
function hexToBytes(hex) {
  if (typeof hex !== "string") {
    throw new TypeError("hexToBytes: expected string, got " + typeof hex);
  }
  if (hex.length % 2 !== 0) {
    throw new Error("hexToBytes: received invalid unpadded hex");
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const j = i * 2;
    const hexByte = hex.slice(j, j + 2);
    const byte = Number.parseInt(hexByte, 16);
    if (Number.isNaN(byte) || byte < 0) {
      throw new Error("Invalid byte sequence");
    }
    array[i] = byte;
  }
  return array;
}
function concatBytes(...arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
var HARDENED_OFFSET = 2147483648;
var ZERO = new Uint8Array([0]);
var masterSecretKey = null;
async function getMasterSecretKey() {
  if (!masterSecretKey) {
    const hasher = await createBLAKE3();
    hasher.update(utf8ToBytes("lea-chain-hd-key-master-secret"));
    masterSecretKey = hasher.digest("binary");
  }
  return masterSecretKey;
}
function ensureBytes(input, ...expectedLengths) {
  let bytes;
  if (typeof input === "string") {
    try {
      bytes = hexToBytes(input);
    } catch (e) {
      throw new TypeError(`Invalid hex string: ${e instanceof Error ? e.message : e}`);
    }
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    throw new TypeError(`Input must be a Uint8Array or a hex string, got ${typeof input}`);
  }
  if (expectedLengths.length > 0 && !expectedLengths.includes(bytes.length)) {
    throw new Error(`Invalid input length: ${bytes.length}. Expected one of: ${expectedLengths.join(", ")}`);
  }
  return bytes;
}
var numberToBytesBE = (num) => {
  if (!Number.isSafeInteger(num) || num < 0 || num >= 2 ** 32) {
    throw new Error(`Invalid number: ${num}. Must be >= 0 and < 2^32`);
  }
  const buffer = new Uint8Array(4);
  new DataView(buffer.buffer).setUint32(0, num, false);
  return buffer;
};
var HDKey = class {
  /** @type {Uint8Array} The 32-byte key */
  key;
  /** @type {Uint8Array} The 32-byte chain code */
  chainCode;
  /**
   * Private constructor. Use HDKey.fromMasterSeed() to create instances.
   * @param {object} options Internal options.
   * @private
   */
  constructor(options) {
    if (!(options.key instanceof Uint8Array) || options.key.length !== 32) {
      throw new TypeError("key must be a 32-byte Uint8Array");
    }
    if (!(options.chainCode instanceof Uint8Array) || options.chainCode.length !== 32) {
      throw new TypeError("chainCode must be a 32-byte Uint8Array");
    }
    this.key = options.key;
    this.chainCode = options.chainCode;
  }
  /**
   * Creates an HDKey from a master seed.
   * @param {Uint8Array | string} seed - The master seed (bytes or hex string). Recommended: 32 bytes. Min: 16 bytes, Max: 64 bytes.
   * @returns {Promise<HDKey>} A new HDKey instance representing the master node (m).
   */
  static async fromMasterSeed(seed) {
    const seedBytes = ensureBytes(seed);
    const seedLengthBits = seedBytes.length * 8;
    if (seedLengthBits < 128 || seedLengthBits > 512) {
      throw new Error(`Invalid seed length: ${seedBytes.length} bytes (${seedLengthBits} bits). Must be between 128 and 512 bits.`);
    }
    const masterKey = await getMasterSecretKey();
    const hasher = await createBLAKE3(512, masterKey);
    hasher.update(seedBytes);
    const I = hasher.digest("binary");
    const key = I.slice(0, 32);
    const chainCode = I.slice(32, 64);
    return new this({ key, chainCode });
  }
  /**
   * Derives a child key based on a BIP32 path string (e.g., "m/44'/501'/0'") and returns its key.
   * NOTE: Only hardened derivation (using ") is supported.
   * @param {string} path - The derivation path string. Must start with 'm'.
   * @returns {Promise<Uint8Array>} The derived 32-byte key (seed).
   */
  async derive(path) {
    if (!/^[mM](?:\/[0-9]+'?)*$/.test(path)) {
      throw new Error(`Invalid derivation path format. Expected "m/..." with hardened indices (e.g., "m/44'/0'")`);
    }
    if (path === "m" || path === "M") {
      return this.key;
    }
    const segments = path.replace(/^[mM]\/?/, "").split("/");
    let currentKey = this;
    for (const segment of segments) {
      const match = /^([0-9]+)('?)$/.exec(segment);
      if (!match) {
        throw new Error(`Invalid path segment: ${segment}`);
      }
      let index = parseInt(match[1], 10);
      const isHardened = match[2] === "'";
      if (!Number.isSafeInteger(index) || index >= HARDENED_OFFSET) {
        throw new Error(`Invalid index number: ${index}. Must be < 2^31.`);
      }
      if (!isHardened) {
        throw new Error(`Non-hardened derivation (index ${index}) is not supported. Use hardened index (e.g., ${index}'').`);
      }
      index += HARDENED_OFFSET;
      currentKey = await currentKey.deriveChild(index);
    }
    return currentKey.key;
  }
  /**
   * Derives a child key using a specific index.
   * NOTE: Only hardened indices (index >= HARDENED_OFFSET) are supported.
   * @param {number} index - The child index number. Must be >= HARDENED_OFFSET.
   * @returns {Promise<HDKey>} The derived HDKey instance.
   */
  async deriveChild(index) {
    if (!Number.isSafeInteger(index) || index < HARDENED_OFFSET || index >= 2 ** 32) {
      throw new Error(`Invalid index ${index}. Hardened index must be >= ${HARDENED_OFFSET} and < 2^32.`);
    }
    const indexBytes = numberToBytesBE(index);
    const data = concatBytes(ZERO, this.key, indexBytes);
    const hasher = await createBLAKE3(512, this.chainCode);
    hasher.update(data);
    const I = hasher.digest("binary");
    const childKey = I.slice(0, 32);
    const childChainCode = I.slice(32, 64);
    return new this.constructor({
      key: childKey,
      chainCode: childChainCode
    });
  }
};

// node_modules/@noble/hashes/esm/crypto.js
var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

// node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function utf8ToBytes2(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes2(data);
  abytes(data);
  return data;
}
function kdfInputToBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes2(data);
  abytes(data);
  return data;
}
function checkOpts(defaults, opts) {
  if (opts !== void 0 && {}.toString.call(opts) !== "[object Object]")
    throw new Error("options should be object or undefined");
  const merged = Object.assign(defaults, opts);
  return merged;
}
var Hash = class {
};
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto && typeof crypto.randomBytes === "function") {
    return Uint8Array.from(crypto.randomBytes(bytesLength));
  }
  throw new Error("crypto.getRandomValues must be defined");
}

// node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value, isLE) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE ? 4 : 0;
  const l = isLE ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE);
  view.setUint32(byteOffset + l, wl, isLE);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE) {
    super();
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/esm/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
  constructor(outputLen = 32) {
    super(64, outputLen, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA512 = class extends HashMD {
  constructor(outputLen = 64) {
    super(128, outputLen, 16, false);
    this.Ah = SHA512_IV[0] | 0;
    this.Al = SHA512_IV[1] | 0;
    this.Bh = SHA512_IV[2] | 0;
    this.Bl = SHA512_IV[3] | 0;
    this.Ch = SHA512_IV[4] | 0;
    this.Cl = SHA512_IV[5] | 0;
    this.Dh = SHA512_IV[6] | 0;
    this.Dl = SHA512_IV[7] | 0;
    this.Eh = SHA512_IV[8] | 0;
    this.El = SHA512_IV[9] | 0;
    this.Fh = SHA512_IV[10] | 0;
    this.Fl = SHA512_IV[11] | 0;
    this.Gh = SHA512_IV[12] | 0;
    this.Gl = SHA512_IV[13] | 0;
    this.Hh = SHA512_IV[14] | 0;
    this.Hl = SHA512_IV[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
var sha512 = /* @__PURE__ */ createHasher(() => new SHA512());

// node_modules/@noble/hashes/esm/sha256.js
var sha2562 = sha256;

// node_modules/@noble/hashes/esm/hmac.js
var HMAC = class extends Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    ahash(hash);
    const key = toBytes(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    abytes(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

// node_modules/@noble/hashes/esm/pbkdf2.js
function pbkdf2Init(hash, _password, _salt, _opts) {
  ahash(hash);
  const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  anumber(c);
  anumber(dkLen);
  anumber(asyncTick);
  if (c < 1)
    throw new Error("iterations (c) should be >= 1");
  const password = kdfInputToBytes(_password);
  const salt = kdfInputToBytes(_salt);
  const DK = new Uint8Array(dkLen);
  const PRF = hmac.create(hash, password);
  const PRFSalt = PRF._cloneInto().update(salt);
  return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}
function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
  PRF.destroy();
  PRFSalt.destroy();
  if (prfW)
    prfW.destroy();
  clean(u);
  return DK;
}
function pbkdf2(hash, password, salt, opts) {
  const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
  let prfW;
  const arr = new Uint8Array(4);
  const view = createView(arr);
  const u = new Uint8Array(PRF.outputLen);
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    const Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false);
    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
    Ti.set(u.subarray(0, Ti.length));
    for (let ui = 1; ui < c; ui++) {
      PRF._cloneInto(prfW).update(u).digestInto(u);
      for (let i = 0; i < Ti.length; i++)
        Ti[i] ^= u[i];
    }
  }
  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}

// node_modules/@noble/hashes/esm/sha512.js
var sha5122 = sha512;

// src/bip39.js
var englishWordlist = ["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase", "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit", "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father", "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file", "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand", "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic", "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"];
var wordlistMap = new Map(
  englishWordlist.map((word, index) => {
    const normalizedWord = word.normalize("NFKD");
    return [normalizedWord, index];
  })
);
var BITS_PER_WORD = 11;
var PBKDF2_ROUNDS = 2048;
var PBKDF2_KEY_LENGTH = 64;
var SALT_PREFIX = "mnemonic";
var WORD_COUNT_TO_ENTROPY_BITS = { 12: 128, 15: 160, 18: 192, 21: 224, 24: 256 };
var ENTROPY_BITS_TO_WORD_COUNT = { 128: 12, 160: 15, 192: 18, 224: 21, 256: 24 };
function bytesToBinaryString(bytes) {
  return Array.from(bytes, (byte) => byte.toString(2).padStart(8, "0")).join("");
}
function binaryStringToBytes(bits) {
  const bitsLength = bits.length;
  if (bitsLength % 8 !== 0) {
    throw new Error("Invalid binary string length: Must be a multiple of 8.");
  }
  const byteLength = bitsLength / 8;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    const byteSlice = bits.slice(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteSlice, 2);
  }
  return bytes;
}
function generateEntropy(strength) {
  if (!ENTROPY_BITS_TO_WORD_COUNT[strength]) {
    throw new Error(`Invalid entropy strength: ${strength} bits. Must correspond to 12, 15, 18, 21, or 24 words.`);
  }
  const bytesToGenerate = strength / 8;
  try {
    return randomBytes(bytesToGenerate);
  } catch (error) {
    throw new Error(`Failed to generate entropy. Secure random source unavailable or error occurred: ${error.message}`);
  }
}
function entropyToMnemonic(entropy) {
  const entropyBitsLength = entropy.length * 8;
  if (!ENTROPY_BITS_TO_WORD_COUNT[entropyBitsLength]) {
    throw new Error(`Invalid entropy length: ${entropy.length} bytes (${entropyBitsLength} bits). Must correspond to 12, 15, 18, 21, or 24 words.`);
  }
  const entropyBinaryString = bytesToBinaryString(entropy);
  const hash = sha2562(entropy);
  const hashBinaryString = bytesToBinaryString(hash);
  const checksumBitsLength = entropyBitsLength / 32;
  const checksumBits = hashBinaryString.slice(0, checksumBitsLength);
  const totalBinaryString = entropyBinaryString + checksumBits;
  const totalBitsLength = totalBinaryString.length;
  if (totalBitsLength % BITS_PER_WORD !== 0) {
    throw new Error(`Internal error: Total bits length (${totalBitsLength}) not divisible by ${BITS_PER_WORD}.`);
  }
  const wordCount = totalBitsLength / BITS_PER_WORD;
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const chunk = totalBinaryString.slice(i * BITS_PER_WORD, (i + 1) * BITS_PER_WORD);
    const index = parseInt(chunk, 2);
    words.push(englishWordlist[index]);
  }
  return words.join(" ");
}
function mnemonicToEntropy(mnemonic) {
  if (typeof mnemonic !== "string" || mnemonic.length === 0) {
    throw new Error("Invalid mnemonic: Input must be a non-empty string.");
  }
  const words = mnemonic.normalize("NFKD").trim().split(/\s+/);
  const wordCount = words.length;
  const entropyBitsLength = WORD_COUNT_TO_ENTROPY_BITS[wordCount];
  if (entropyBitsLength === void 0) {
    throw new Error(`Invalid mnemonic word count: ${wordCount}. Must be 12, 15, 18, 21, or 24.`);
  }
  const indices = words.map((word, i) => {
    const normalizedWordForLookup = word.normalize("NFKD");
    const indexFromMap = wordlistMap.get(normalizedWordForLookup);
    if (indexFromMap === void 0) {
      throw new Error(`Invalid mnemonic: Word at index ${i} not found in wordlist.`);
    }
    return indexFromMap;
  });
  const totalBinaryString = indices.map((index) => index.toString(2).padStart(BITS_PER_WORD, "0")).join("");
  const totalBitsLength = wordCount * BITS_PER_WORD;
  const checksumBitsLength = totalBitsLength / 33;
  const entropyBinaryString = totalBinaryString.slice(0, entropyBitsLength);
  const checksumBitsFromMnemonic = totalBinaryString.slice(entropyBitsLength);
  const derivedEntropyBytes = binaryStringToBytes(entropyBinaryString);
  if (derivedEntropyBytes.length * 8 !== entropyBitsLength) {
    throw new Error("Internal error: Derived entropy byte length mismatch during conversion.");
  }
  const hash = sha2562(derivedEntropyBytes);
  const hashBinaryString = bytesToBinaryString(hash);
  const expectedChecksumBits = hashBinaryString.slice(0, checksumBitsLength);
  if (checksumBitsFromMnemonic !== expectedChecksumBits) {
    throw new Error("Invalid mnemonic: Checksum mismatch.");
  }
  return derivedEntropyBytes;
}
function generateMnemonic(strength = 128) {
  const entropy = generateEntropy(strength);
  return entropyToMnemonic(entropy);
}
async function mnemonicToSeed(mnemonic, passphrase = "") {
  mnemonicToEntropy(mnemonic);
  const normalizedMnemonic = mnemonic.normalize("NFKD");
  const normalizedPassphrase = passphrase.normalize("NFKD");
  const passwordBytes = new TextEncoder().encode(normalizedMnemonic);
  const saltPrefixBytes = new TextEncoder().encode(SALT_PREFIX);
  const passphraseBytes = new TextEncoder().encode(normalizedPassphrase);
  const saltBytes = new Uint8Array(saltPrefixBytes.length + passphraseBytes.length);
  saltBytes.set(saltPrefixBytes, 0);
  saltBytes.set(passphraseBytes, saltPrefixBytes.length);
  const seed = await pbkdf2(sha5122, passwordBytes, saltBytes, {
    c: PBKDF2_ROUNDS,
    // Iteration count
    dkLen: PBKDF2_KEY_LENGTH
    // Derived key length in bytes (64 bytes / 512 bits)
  });
  return seed;
}

// src/constants.js
var LEA_COIN_TYPE = 2323;
var BIP44_PURPOSE = 44;
var LEA_DERIVATION_BASE = `m/${BIP44_PURPOSE}'/${LEA_COIN_TYPE}'`;
var ADDRESS_HRP = "lea";
var LEA_SYSTEM_PROGRAM = new Uint8Array([
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255
]);

// node_modules/@getlea/keygen/dist/keygen.web.mjs
var __toBinary = /* @__PURE__ */ (() => {
  var table = new Uint8Array(128);
  for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
  return (base64) => {
    var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == "=") - (base64[n - 2] == "=")) * 3 / 4 | 0);
    for (var i2 = 0, j = 0; i2 < n; ) {
      var c0 = table[base64.charCodeAt(i2++)], c1 = table[base64.charCodeAt(i2++)];
      var c2 = table[base64.charCodeAt(i2++)], c3 = table[base64.charCodeAt(i2++)];
      bytes[j++] = c0 << 2 | c1 >> 4;
      bytes[j++] = c1 << 4 | c2 >> 2;
      bytes[j++] = c2 << 6 | c3;
    }
    return bytes;
  };
})();
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var GENERATOR = [996825010, 642813549, 513874426, 1027748829, 705979059];
var BECH32M_CONST = 734539939;
var DATA_VERSION_BYTE = null;
var MIN_DATA_LENGTH_BYTES = 16;
var MAX_DATA_LENGTH_BYTES = 64;
var MAX_BECH32_LENGTH = 200;
var MIN_HRP_LENGTH = 1;
var MAX_HRP_LENGTH = 83;
var CHECKSUM_LENGTH = 6;
var MIN_BECH32_LENGTH = MIN_HRP_LENGTH + 1 + (DATA_VERSION_BYTE !== null ? 1 : 0) + Math.ceil(MIN_DATA_LENGTH_BYTES * 8 / 5) + CHECKSUM_LENGTH;
var CHAR_MAP = {};
for (let i = 0; i < CHARSET.length; i++) {
  const char = CHARSET[i];
  if (char === void 0) continue;
  CHAR_MAP[char] = i;
}
function polymod(values) {
  let checksumState = 1;
  for (let index = 0; index < values.length; ++index) {
    const value = values[index];
    if (value === void 0) continue;
    const top = checksumState >> 25;
    checksumState = (checksumState & 33554431) << 5 ^ value;
    for (let i = 0; i < 5; ++i) {
      const genValue = GENERATOR[i];
      if (top >> i & 1 && genValue !== void 0) {
        checksumState ^= genValue;
      }
    }
  }
  return checksumState;
}
function hrpExpand(hrp) {
  const expanded = new Array(hrp.length * 2 + 1);
  let i = 0;
  for (let index = 0; index < hrp.length; ++index) expanded[i++] = hrp.charCodeAt(index) >> 5;
  expanded[i++] = 0;
  for (let index = 0; index < hrp.length; ++index) expanded[i++] = hrp.charCodeAt(index) & 31;
  return expanded;
}
function createChecksum(hrp, data5bitWithVersion) {
  const expandedHrp = hrpExpand(hrp);
  const values = new Array(expandedHrp.length + data5bitWithVersion.length + CHECKSUM_LENGTH);
  let k = 0;
  for (let i = 0; i < expandedHrp.length; i++) values[k++] = expandedHrp[i];
  for (let i = 0; i < data5bitWithVersion.length; i++) values[k++] = data5bitWithVersion[i];
  for (let i = 0; i < CHECKSUM_LENGTH; i++) values[k++] = 0;
  const mod = polymod(values) ^ BECH32M_CONST;
  const checksum = new Array(CHECKSUM_LENGTH);
  for (let i = 0; i < CHECKSUM_LENGTH; ++i) {
    checksum[i] = mod >> 5 * (CHECKSUM_LENGTH - 1 - i) & 31;
  }
  return checksum;
}
function convertbits(inputData, frombits, tobits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << tobits) - 1;
  const max_acc = (1 << frombits + tobits - 1) - 1;
  for (let index = 0; index < inputData.length; ++index) {
    const value = inputData[index];
    if (value === void 0 || value < 0 || value >> frombits !== 0) {
      throw new Error(`Invalid value in convertbits: ${value}`);
    }
    acc = (acc << frombits | value) & max_acc;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push(acc << tobits - bits & maxv);
    }
  } else if (bits >= frombits || acc << tobits - bits & maxv) {
    throw new Error("Invalid padding/conversion in convertbits");
  }
  return ret;
}
function _encodeBech32mData(hrp, data5bit) {
  const data5bitWithVersion = DATA_VERSION_BYTE !== null ? [DATA_VERSION_BYTE, ...data5bit] : [...data5bit];
  const checksum = createChecksum(hrp, data5bitWithVersion);
  const combined = new Array(data5bitWithVersion.length + checksum.length);
  let k = 0;
  for (let i = 0; i < data5bitWithVersion.length; i++) combined[k++] = data5bitWithVersion[i];
  for (let i = 0; i < checksum.length; i++) combined[k++] = checksum[i];
  let ret = hrp + "1";
  for (let index = 0; index < combined.length; ++index) {
    const charIndex = combined[index];
    if (charIndex === void 0) throw new Error("Undefined index in combined data");
    ret += CHARSET.charAt(charIndex);
  }
  return ret;
}
function encode(hrp, dataBytes) {
  if (typeof hrp !== "string" || hrp.length < MIN_HRP_LENGTH || hrp.length > MAX_HRP_LENGTH) {
    throw new Error(`Invalid HRP length: ${hrp?.length}`);
  }
  for (let i = 0; i < hrp.length; ++i) {
    const charCode = hrp.charCodeAt(i);
    if (charCode < 33 || charCode > 126) throw new Error(`Invalid HRP character code: ${charCode}`);
    if (charCode >= 65 && charCode <= 90) throw new Error(`Invalid HRP character case: ${hrp[i]}`);
  }
  if (!dataBytes || typeof dataBytes.length !== "number") throw new Error("Invalid dataBytes type.");
  if (dataBytes.length < MIN_DATA_LENGTH_BYTES || dataBytes.length > MAX_DATA_LENGTH_BYTES) {
    throw new Error(`Invalid dataBytes length: ${dataBytes.length} (must be between ${MIN_DATA_LENGTH_BYTES} and ${MAX_DATA_LENGTH_BYTES})`);
  }
  const dataBytesArray = dataBytes instanceof Uint8Array ? dataBytes : Uint8Array.from(dataBytes);
  for (let i = 0; i < dataBytesArray.length; ++i) {
    const byte = dataBytesArray[i];
    if (byte === void 0 || typeof byte !== "number" || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error(`Invalid data byte at index ${i}: ${byte}`);
    }
  }
  const data5bit = convertbits(dataBytesArray, 8, 5, true);
  const encodedString = _encodeBech32mData(hrp, data5bit);
  if (encodedString.length > MAX_BECH32_LENGTH) {
    throw new Error(`Internal error: Generated string exceeds max length (${encodedString.length})`);
  }
  return encodedString;
}
var textEncoder2 = new TextEncoder();
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function stringToUint8Array(str) {
  return textEncoder2.encode(str);
}
async function deriveSeed(masterSeed, domain, length) {
  const blake3 = await createBLAKE3();
  const domainBytes = stringToUint8Array(domain);
  let derivedSeed = new Uint8Array(0);
  let counter = 0;
  while (derivedSeed.length < length) {
    blake3.init();
    blake3.update(masterSeed);
    blake3.update(domainBytes);
    blake3.update(new Uint8Array([counter]));
    const hash = blake3.digest("binary");
    const newDerivedSeed = new Uint8Array(derivedSeed.length + hash.length);
    newDerivedSeed.set(derivedSeed);
    newDerivedSeed.set(hash, derivedSeed.length);
    derivedSeed = newDerivedSeed;
    counter++;
  }
  return derivedSeed.slice(0, length);
}
var print = (() => {
  const colors = {
    red: { ansi: 196, css: "red" },
    orange: { ansi: 208, css: "orange" },
    green: { ansi: 46, css: "green" },
    blue: { ansi: 33, css: "blue" }
  };
  const printMessage = (msg, { ansi, css }) => {
    if (typeof process !== "undefined" && process.stdout?.write) {
      process.stdout.write(`\x1B[38;5;${ansi}m${msg}\x1B[0m`);
    } else if (typeof console !== "undefined") {
      console.log(`%c${msg}`, `color: ${css}`);
    }
  };
  const api = {};
  for (const [name, cfg] of Object.entries(colors)) {
    api[name] = (msg) => printMessage(msg, cfg);
  }
  return api;
})();
var cstring = (memory, ptr) => {
  if (!memory) return "";
  const mem = new Uint8Array(memory.buffer, ptr);
  let len = 0;
  while (mem[len] !== 0) {
    len++;
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(memory.buffer, ptr, len));
};
function createShimBase(config = {}) {
  let wasmExports = null;
  let memory = null;
  const onAbort = config.onAbort || ((message) => {
    print.red(message);
    if (typeof process !== "undefined" && process.exit) {
      process.exit(1);
    } else {
      throw new Error(message);
    }
  });
  const { randomBytesImpl: randomBytesImpl22 } = config;
  if (typeof randomBytesImpl22 !== "function") {
    throw new Error("A `randomBytesImpl` function must be provided in the shim configuration.");
  }
  const importObject = {
    env: {
      __lea_abort: (_line) => {
        const line = Number(_line);
        onAbort(`[ABORT] at line ${line}
`);
      },
      __lea_log: (ptr, len) => {
        if (!memory) return;
        const _len = Number(len);
        const mem = new Uint8Array(memory.buffer, ptr, _len);
        const m = new TextDecoder("utf-8").decode(mem);
        print.orange(m);
      },
      __lea_ubsen: (_name, _filename, _line, _column) => {
        if (!memory) {
          onAbort(`[UBSEN] at unknown location (memory not bound)
`);
          return;
        }
        const name = cstring(memory, _name);
        const filename = cstring(memory, _filename);
        const line = Number(_line);
        const column = Number(_column);
        onAbort(`[UBSEN] ${name} at ${filename}:${line}:${column}
`);
      },
      __lea_randombytes: (ptr, len) => {
        const _len = Number(len);
        print.blue(`[VM] __lea_randombytes requested ${_len} bytes
`);
        if (!memory) return;
        const randomBytes2 = randomBytesImpl22(_len);
        const mem = new Uint8Array(memory.buffer, ptr, _len);
        mem.set(randomBytes2);
      },
      __execution_limit: (gas_price, gas_limit) => {
        print.blue(`[VM] __execution_limit called with gas_price=${gas_price}, gas_limit=${gas_limit}
`);
      },
      __address_add: (address_data, address_size) => {
        print.blue(`[VM] __address_add called with address_data=${address_data}, address_size=${address_size}
`);
      },
      __execution_stack_add: (target_index, instruction_data, instruction_size) => {
        print.blue(`[VM] __execution_stack_add called with target_index=${target_index}, instruction_data=${instruction_data}, instruction_size=${instruction_size}
`);
      },
      // Allow user-defined functions to be merged
      ...config.customEnv || {}
    }
  };
  const bindInstance = (instance) => {
    wasmExports = instance.exports;
    memory = wasmExports.memory;
    if (!memory) {
      console.warn("Warning: WebAssembly instance has no exported memory.");
    }
  };
  const copyToWasm = (data) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { memory: memory2, __lea_malloc } = wasmExports;
    const ptr = __lea_malloc(data.length);
    new Uint8Array(memory2.buffer, ptr, data.length).set(data);
    return ptr;
  };
  const readFromWasm = (ptr, length) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { memory: memory2 } = wasmExports;
    return new Uint8Array(memory2.buffer.slice(ptr, ptr + length));
  };
  const malloc = (length) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { __lea_malloc } = wasmExports;
    return __lea_malloc(length);
  };
  const reset = (length) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { __lea_allocator_reset } = wasmExports;
    __lea_allocator_reset();
  };
  return {
    importObject,
    bindInstance,
    print,
    utils: {
      copyToWasm,
      readFromWasm,
      malloc,
      reset
    }
  };
}
var randomBytesImpl = (len) => {
  const bytes = new Uint8Array(len);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error("No secure random bytes implementation found for this environment.");
};
function createShim(config = {}) {
  return createShimBase({
    ...config,
    randomBytesImpl
  });
}
var WasmCrypto = class {
  constructor(wasmBytes) {
    this.wasmBytes = wasmBytes;
    this.memory = null;
    this.instance = null;
    this.exports = {};
  }
  async init() {
    const { importObject, bindInstance } = createShim();
    const { instance } = await WebAssembly.instantiate(this.wasmBytes, importObject);
    bindInstance(instance);
    this.instance = instance;
    this.memory = instance.exports.memory;
    const {
      keygen,
      keygen_from_seed,
      seed_bytes,
      sign,
      verify,
      pk_bytes,
      sk_bytes,
      signature_bytes,
      __lea_malloc,
      __lea_allocator_reset
    } = instance.exports;
    this.exports = {
      keygen,
      keygen_from_seed,
      seed_bytes,
      sign,
      verify,
      pk_bytes,
      sk_bytes,
      signature_bytes,
      __lea_malloc,
      __lea_allocator_reset
    };
  }
  malloc(size) {
    return this.exports.__lea_malloc(Number(size));
  }
  getMemoryBuffer(ptr, len) {
    return new Uint8Array(this.memory.buffer, ptr, len);
  }
  async generateKeypair() {
    const pkLen = this.exports.pk_bytes();
    const skLen = this.exports.sk_bytes();
    const pkPtr = this.malloc(pkLen);
    const skPtr = this.malloc(skLen);
    const result = await this.exports.keygen(pkPtr, skPtr);
    if (result !== 0) throw new Error("Keygen failed");
    const pk = this.getMemoryBuffer(pkPtr, pkLen).slice();
    const sk = this.getMemoryBuffer(skPtr, skLen).slice();
    return { pk, sk };
  }
  async generateKeypairFromSeed(seed) {
    const seedLen = this.exports.seed_bytes();
    if (seed.length !== seedLen) {
      throw new Error(`Invalid seed length: expected ${seedLen}, got ${seed.length}`);
    }
    const pkLen = this.exports.pk_bytes();
    const skLen = this.exports.sk_bytes();
    const pkPtr = this.malloc(pkLen);
    const skPtr = this.malloc(skLen);
    const seedPtr = this.malloc(seedLen);
    this.getMemoryBuffer(seedPtr, seedLen).set(seed);
    const result = await this.exports.keygen_from_seed(pkPtr, skPtr, seedPtr);
    if (result !== 0) throw new Error("Keygen from seed failed");
    const pk = this.getMemoryBuffer(pkPtr, pkLen).slice();
    const sk = this.getMemoryBuffer(skPtr, skLen).slice();
    return { pk, sk };
  }
};
var ed25519_default = __toBinary("AGFzbQEAAAABWA5gAX8AYAJ/fgBgAAF/YAAAYAF/AX9gAn9/AX9gA39/fwBgA39/fwF/YAR/f39/AX9gAn9/AGAEf39/fwBgBX9/f39/AX9gBX9/f39/AGAHf39/f39/fwACKwIDZW52C19fbGVhX2Fib3J0AAADZW52EV9fbGVhX3JhbmRvbWJ5dGVzAAEDIyICAgMEBQYHAgIIBgkJCQoCAgsFBgkGCAwJCQkGBQkFDQYABAUBcAEBAQUDAQASBgkBfwFB0KXEAAsHvQENBm1lbW9yeQIADF9fbGVhX21hbGxvYwAFFV9fbGVhX2FsbG9jYXRvcl9yZXNldAAEE19fbGVhX2dldF9oZWFwX2Jhc2UAAhJfX2xlYV9nZXRfaGVhcF90b3AAAwZrZXlnZW4ABhBrZXlnZW5fZnJvbV9zZWVkAAgEc2lnbgALBnZlcmlmeQATCnNlZWRfYnl0ZXMACghwa19ieXRlcwAJCHNrX2J5dGVzABIPc2lnbmF0dXJlX2J5dGVzABEK/qYCIggAQdClgIAACwsAQQAoAsClgIAACzMBAX9BACEAA0AgAEHQpYCAAGpCADcDACAAQQhqIgBBgIDAAEcNAAtBAEEANgLApYCAAAs+AQF/AkBBgIDAAEEAKALApYCAACIBayAATw0AQRUQgICAgAAAAAtBACABIABqNgLApYCAACABQdClgIAAags4AQF/I4CAgIAAQSBrIgIkgICAgAAgAkIgEIGAgIAAIAEgACACEIeAgIAAIAJBIGokgICAgABBAAvPDwEafyOAgICAAEGgAmsiAySAgICAACADIAItAAA6AAAgAyACLwABOwABIAMgAigAAzYAAyADIAItAAciBDoAByADIAItAAgiBToACCADIAItAAkiBjoACSADIAItAAoiBzoACiADIAItAAsiCDoACyADIAItAAwiCToADCADIAItAA0iCjoADSADIAItAA4iCzoADiADIAItAA8iDDoADyADIAItABAiDToAECADIAItABEiDjoAESADIAItABIiDzoAEiADIAItABMiEDoAEyADIAItABQiEToAFCADIAItABUiEjoAFSADIAItABYiEzoAFiADIAItABciFDoAFyADIAItABgiFToAGCADIAItABkiFjoAGSADIAItABoiFzoAGiADIAItABsiGDoAGyADIAItABwiGToAHCADIAItAB0iGjoAHSADIAItAB4iGzoAHiADIAItAB8iHDoAHyACQQA6AAAgAkEAOgABIAJBADoAAiACQQA6AAMgAkEAOgAEIAJBADoABSACQQA6AAYgAkEAOgAHIAJBADoACCACQQA6AAkgAkEAOgAKIAJBADoACyACQQA6AAwgAkEAOgANIAJBADoADiACQQA6AA8gAkEAOgAQIAJBADoAESACQQA6ABIgAkEAOgATIAJBADoAFCACQQA6ABUgAkEAOgAWIAJBADoAFyACQQA6ABggAkEAOgAZIAJBADoAGiACQQA6ABsgAkEAOgAcIAJBADoAHSACQQA6AB4gAkEAOgAfIAAgAy0AADoAACAAIAMtAAE6AAEgACADLQACOgACIAAgAy0AAzoAAyAAIAMtAAQ6AAQgACADLQAFOgAFIAAgHDoAHyAAIBs6AB4gACAaOgAdIAAgGToAHCAAIBg6ABsgACAXOgAaIAAgFjoAGSAAIBU6ABggACAUOgAXIAAgEzoAFiAAIBI6ABUgACAROgAUIAAgEDoAEyAAIA86ABIgACAOOgARIAAgDToAECAAIAw6AA8gACALOgAOIAAgCjoADSAAIAk6AAwgACAIOgALIAAgBzoACiAAIAY6AAkgACAFOgAIIAAgBDoAByAAIAMtAAY6AAYgA0GQAmpCADcDACADQYACakIANwMAIANB+AFqQgA3AwAgA0HwAWpCADcDACADQegBakIANwMAIANB4AFqQgA3AwAgA0HYAWpCADcDACADQdABakIANwMAIANByAFqQgA3AwAgA0HAAWpCADcDACADQbgBakIANwMAIANBsAFqQgA3AwAgA0GoAWpCADcDACADQaABakIANwMAIANBmAFqQgA3AwAgA0GQAWpCADcDACADQQA2ApgCIANCADcDiAIgA0L5wvibkaOz8NsANwOAASADQuv6htq/tfbBHzcDeCADQp/Y+dnCkdqCm383A3AgA0LRhZrv+s+Uh9EANwNoIANC8e30+KWn/aelfzcDYCADQqvw0/Sv7ry3PDcDWCADQrvOqqbY0Ouzu383A1AgA0KIkvOd/8z5hOoANwNIIANCADcDiAEgA0HIAGogA0EgEIyAgIAAIANByABqIAMQjYCAgAAgAyADLQAAQfgBcToAACADIAMtAB9BP3FBwAByOgAfIAEgAxCPgICAACAAIAEtAAA6ACAgACABLQABOgAhIAAgAS0AAjoAIiAAIAEtAAM6ACMgACABLQAEOgAkIAAgAS0ABToAJSAAIAEtAAY6ACYgACABLQAHOgAnIAAgAS0ACDoAKCAAIAEtAAk6ACkgACABLQAKOgAqIAAgAS0ACzoAKyAAIAEtAAw6ACwgACABLQANOgAtIAAgAS0ADjoALiAAIAEtAA86AC8gACABLQAQOgAwIAAgAS0AEToAMSAAIAEtABI6ADIgACABLQATOgAzIAAgAS0AFDoANCAAIAEtABU6ADUgACABLQAWOgA2IAAgAS0AFzoANyAAIAEtABg6ADggACABLQAZOgA5IAAgAS0AGjoAOiAAIAEtABs6ADsgACABLQAcOgA8IAAgAS0AHToAPSAAIAEtAB46AD4gACABLQAfOgA/IANBADoAACADQQA6AAEgA0EAOgACIANBADoAAyADQQA6AAQgA0EAOgAFIANBADoABiADQQA6AAcgA0EAOgAIIANBADoACSADQQA6AAogA0EAOgALIANBADoADCADQQA6AA0gA0EAOgAOIANBADoADyADQQA6ABAgA0EAOgARIANBADoAEiADQQA6ABMgA0EAOgAUIANBADoAFSADQQA6ABYgA0EAOgAXIANBADoAGCADQQA6ABkgA0EAOgAaIANBADoAGyADQQA6ABwgA0EAOgAdIANBADoAHiADQQA6AB8gA0EAOgAgIANBADoAISADQQA6ACIgA0EAOgAjIANBADoAJCADQQA6ACUgA0EAOgAmIANBADoAJyADQQA6ACggA0EAOgApIANBADoAKiADQQA6ACsgA0EAOgAsIANBADoALSADQQA6AC4gA0EAOgAvIANBADoAMCADQQA6ADEgA0EAOgAyIANBADoAMyADQQA6ADQgA0EAOgA1IANBADoANiADQQA6ADcgA0EAOgA4IANBADoAOSADQQA6ADogA0EAOgA7IANBADoAPCADQQA6AD0gA0EAOgA+IANBADoAPyADQaACaiSAgICAAAt0AQF/I4CAgIAAQSBrIgMkgICAgAAgAyACLQAAOgAAIAMgAigAATYAASADIAIpAAU3AAUgAyACKQANNwANIAMgAikAFTcAFSADIAIvAB07AB0gAyACLQAfOgAfIAEgACADEIeAgIAAIANBIGokgICAgABBAAsEAEEgCwQAQSALwQ8BEX8jgICAgABBwANrIgQkgICAgAAgBEHwAmoiBUIANwMAIARB4AJqIgZCADcDACAEQdgCaiIHQgA3AwAgBEHQAmoiCEIANwMAIARByAJqIglCADcDACAEQcACaiIKQgA3AwAgBEG4AmoiC0IANwMAIARBsAJqIgxCADcDACAEQagCaiINQgA3AwAgBEGgAmoiDkIANwMAIARBmAJqIg9CADcDACAEQZACaiIQQgA3AwAgBEGIAmoiEUIANwMAIARBgAJqIhJCADcDACAEQfgBaiITQgA3AwAgBEHwAWoiFEIANwMAIARBADYC+AIgBEIANwPoAiAEQvnC+JuRo7Pw2wA3A+ABIARC6/qG2r+19sEfNwPYASAEQp/Y+dnCkdqCm383A9ABIARC0YWa7/rPlIfRADcDyAEgBELx7fT4paf9p6V/NwPAASAEQqvw0/Sv7ry3PDcDuAEgBEK7zqqm2NDrs7t/NwOwASAEQoiS853/zPmE6gA3A6gBIARCADcD6AEgBEGoAWogA0EgEIyAgIAAIARBqAFqIARB4ABqEI2AgIAAIAQgBC0AYEH4AXE6AGAgBCAELQB/QT9xQcAAcjoAfyAFQgA3AwAgBkIANwMAIAdCADcDACAIQgA3AwAgCUIANwMAIApCADcDACALQgA3AwAgDEIANwMAIA1CADcDACAOQgA3AwAgD0IANwMAIBBCADcDACARQgA3AwAgEkIANwMAIBNCADcDACAUQgA3AwAgBEEANgL4AiAEQgA3A+gCIARC+cL4m5Gjs/DbADcD4AEgBELr+obav7X2wR83A9gBIARCn9j52cKR2oKbfzcD0AEgBELRhZrv+s+Uh9EANwPIASAEQvHt9Pilp/2npX83A8ABIARCq/DT9K/uvLc8NwO4ASAEQrvOqqbY0Ouzu383A7ABIARCiJLznf/M+YTqADcDqAEgBEIANwPoASAEQagBaiAEQeAAakEgakEgEIyAgIAAIARBqAFqIAEgAhCMgICAACAEQagBaiAEQYADahCNgICAACAEQcAAaiAEQYADahCOgICAACAEIARBwABqEI+AgIAAIAVCADcDACAGQgA3AwAgB0IANwMAIAhCADcDACAJQgA3AwAgCkIANwMAIAtCADcDACAMQgA3AwAgDUIANwMAIA5CADcDACAPQgA3AwAgEEIANwMAIBFCADcDACASQgA3AwAgE0IANwMAIBRCADcDACAEQQA2AvgCIARCADcD6AIgBEL5wvibkaOz8NsANwPgASAEQuv6htq/tfbBHzcD2AEgBEKf2PnZwpHagpt/NwPQASAEQtGFmu/6z5SH0QA3A8gBIARC8e30+KWn/aelfzcDwAEgBEKr8NP0r+68tzw3A7gBIARCu86qptjQ67O7fzcDsAEgBEKIkvOd/8z5hOoANwOoASAEQgA3A+gBIARBqAFqIARBIBCMgICAACAEQagBaiADQSBqQSAQjICAgAAgBEGoAWogASACEIyAgIAAIARBqAFqIARBgANqEI2AgIAAIARBIGogBEGAA2oQjoCAgAAgACAELQAAOgAAIAAgBCkAATcAASAAIAQpAAk3AAkgACAEKQARNwARIAAgBCgAGTYAGSAAIAQvAB07AB0gACAELQAfOgAfIABBIGogBEEgaiAEQeAAaiAEQcAAahCQgICAACAEQQA6AGAgBEEAOgBhIARBADoAYiAEQQA6AGMgBEEAOgBkIARBADoAZSAEQQA6AGYgBEEAOgBnIARBADoAaCAEQQA6AGkgBEEAOgBqIARBADoAayAEQQA6AGwgBEEAOgBtIARBADoAbiAEQQA6AG8gBEEAOgBwIARBADoAcSAEQQA6AHIgBEEAOgBzIARBADoAdCAEQQA6AHUgBEEAOgB2IARBADoAdyAEQQA6AHggBEEAOgB5IARBADoAeiAEQQA6AHsgBEEAOgB8IARBADoAfSAEQQA6AH4gBEEAOgB/IARBADoAgAEgBEEAOgCBASAEQQA6AIIBIARBADoAgwEgBEEAOgCEASAEQQA6AIUBIARBADoAhgEgBEEAOgCHASAEQQA6AIgBIARBADoAiQEgBEEAOgCKASAEQQA6AIsBIARBADoAjAEgBEEAOgCNASAEQQA6AI4BIARBADoAjwEgBEEAOgCQASAEQQA6AJEBIARBADoAkgEgBEEAOgCTASAEQQA6AJQBIARBADoAlQEgBEEAOgCWASAEQQA6AJcBIARBADoAmAEgBEEAOgCZASAEQQA6AJoBIARBADoAmwEgBEEAOgCcASAEQQA6AJ0BIARBADoAngEgBEEAOgCfASAEQQA6AEAgBEEAOgBBIARBADoAQiAEQQA6AEMgBEEA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IAJByAJqIAJB8ANqIAJBwANqQcCRgIAAIAJBoARqIAMiARChgICAACACQQhqIAJByAJqIAJB8ANqIAJBwANqQYCZgIAAIAJBoARqIAFBgAFqEKGAgIAAIAFBf2ohAyABDQALIAJBADoA8AMgAkEAOgDxAyACQQA6APIDIAJBADoA8wMgAkEAOgD0AyACQQA6APUDIAJBADoA9gMgAkEAOgD3AyACQQA6APgDIAJBADoA+QMgAkEAOgD6AyACQQA6APsDIAJBADoA/AMgAkEAOgD9AyACQQA6AP4DIAJBADoA/wMgAkEAOgCABCACQQA6AIEEIAJBADoAggQgAkEAOgCDBCACQQA6AIQEIAJBADoAhQQgAkEAOgCGBCACQQA6AIcEIAJBADoAiAQgAkEAOgCJBCACQQA6AIoEIAJBADoAiwQgAkEAOgCMBCACQQA6AI0EIAJBADoAjgQgAkEAOgCPBCACQQA6AJAEIAJBADoAkQQgAkEAOgCSBCACQQA6AJMEIAJBADoAlAQgAkEAOgCVBCACQQA6AJYEIAJBADoAlwRBACEDA0AgAkGoAWogA2oiAUEAOgAAIAFBAWpBADoAACABQQJqQQA6AAAgAUEDakEAOgAAIAFBBGpBADoAACABQQVqQQA6AAAgAUEGakEAOgAAIAFBB2pBADoAACADQQhqIgNBoAFHDQALIAJBADoAwAMgAkEAOgDBAyACQQA6AMIDIAJBADoAwwMgAkEAOgDEAyACQQA6AMUDIAJBADoAxgMgAkEAOgDHAyACQQA6AMgDIAJBADoAyQMgAkEAOgDKAyACQQA6AMsDIAJBADoAzAMgAkEAOgDNAyACQQA6AM4DIAJBADoAzwMgAkEAOgDQAyACQQA6ANEDIAJBADoA0gMgAkEAOgDTAyACQQA6ANQDIAJBADoA1QMgAkEAOgDWAyACQQA6ANcDIAJBADoA2AMgAkEAOgDZAyACQQA6ANoDIAJBADoA2wMgAkEAOgDcAyACQQA6AN0DIAJBADoA3gMgAkEAOgDfAyACQQA6AOADIAJBADoA4QMgAkEAOgDiAyACQQA6AOMDIAJBADoA5AMgAkEAOgDlAyACQQA6AOYDIAJBADoA5wNBACEDA0AgAkHIAmogA2oiAUEAOgAAIAFBAWpBADoAACABQQJqQQA6AAAgAUEDakEAOgAAIAFB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OgAcIARBADoAHSAEQQA6AB4gBEEAOgAfIARBADoAICAEQQA6ACEgBEEAOgAiIARBADoAIyAEQQA6ACQgBEEAOgAlIARBADoAJiAEQQA6ACcgBEEAOgAoIARBADoAKSAEQQA6ACogBEEAOgArIARBADoALCAEQQA6AC0gBEEAOgAuIARBADoALyAEQQA6ADAgBEEAOgAxIARBADoAMiAEQQA6ADMgBEEAOgA0IARBADoANSAEQQA6ADYgBEEAOgA3IARBADoAOCAEQQA6ADkgBEEAOgA6IARBADoAOyAEQQA6ADwgBEEAOgA9IARBADoAPiAEQQA6AD8gBEEAOgBwIARBADoAcSAEQQA6AHIgBEEAOgBzIARBADoAdCAEQQA6AHUgBEEAOgB2IARBADoAdyAEQQA6AHggBEEAOgB5IARBADoAeiAEQQA6AHsgBEEAOgB8IARBADoAfSAEQQA6AH4gBEEAOgB/IARBADoAgAEgBEEAOgCBASAEQQA6AIIBIARBADoAgwEgBEEAOgCEASAEQQA6AIUBIARBADoAhgEgBEEAOgCHASAEQQA6AIgBIARBADoAiQEgBEEAOgCKASAEQQA6AIsBIARBADoAjAEgBEEAOgCNASAEQQA6AI4BIARBADoAjwEgBEEAOgBgIARBADoAXyAEQQA6AF4gBEEAOgBdIARBADoAXCAEQQA6AFsgBEEAOgBaIARBADoAWSAEQQA6AFggBEEAOgBXIARBADoAViAEQQA6AFUgBEEAOgBUIARBADoAUyAEQQA6AFIgBEEAOgBRIARBADoAUCAEQQA6AE8gBEEAOgBOIARBADoATSAEQQA6AEwgBEEAOgBLIARBADoASiAEQQA6AEkgBEEAOgBIIARBADoARyAEQQA6AEYgBEEAOgBFIARBADoARCAEQQA6AEMgBEEAOgBCIARBADoAQSAEQZABaiSAgICAAAsFAEHAAAsFAEHAAAukFgIBfwh+I4CAgIAAQdAIayIFJICAgIAAAkAgAUHAAEcNACAFQfgDakIANwMAIAVB6ANqQgA3AwAgBUHgA2pCADcDACAFQdgDakIANwMAIAVB0ANqQgA3AwAgBUHIA2pCADcDACAFQcADakIANwMAIAVBuANqQgA3AwAgBUGwA2pCADcDACAFQagDakIANwMAIAVBoANqQgA3AwAgBUGYA2pC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AgAiM2oiNDYCACAyIDMgG2siGzYCACAvIDAgGmsiGjYCACAsIC0gGWsiGTYCACApICogGGsiGDYCACAmICcgJWsiHDYCACACICMgImsiIjYCKCACQcgAaiIjICMoAgAiIyACKAIgIiVrIiY2AgAgAkHEAGoiJyAnKAIAIicgAigCHCIpayIqNgIAIB0gAigCGCIsIAJBwABqIi0oAgAiL2oiMDYCACAeICkgJ2oiHTYCACAfICUgI2oiHjYCACAgIAIoAiQiHyACQcwAaiIjKAIAIiVqIic2AgAgIyAlIB9rIh82AgAgLSAvICxrIiA2AgAgAiAAKAJ4ICRrNgIAIAIgAEH8AGooAgAgKGs2AgQgAiAAQYABaigCACArazYCCCACIABBhAFqKAIAIC5rNgIMIAIgAEGIAWooAgAgMWs2AhAgAiAAQYwBaigCACA0azYCFCACIABBkAFqKAIAIDBrNgIYIAIgAEGUAWooAgAgHWs2AhwgAiAAQZgBaigCACAeazYCICACIABBnAFqKAIAICdrNgIkIAIgAigCUCAiazYCUCAQIBAoAgAgHGs2AgAgDSANKAIAIBhrNgIAIBUgFSgCACAZazYCACAGIAYoAgAgGms2AgAgCSAJKAIAIBtrNgIAIAUgBSgCACAgazYCACAUIBQoAgAgKms2AgAgFiAWKAIAICZrNgIAIBcgFygCACAfazYCACAAIAIgBBCdgICAACAAQShqIAEgAxCdgICAACAAQdAAaiADIAQQnYCAgAAgISACIAEQnYCAgAAL2AQBCX8gACABKAIAIAEoAihqNgIAIAAgASgCBCABQSxqIgIoAgBqNgIEIAAgASgCCCABQTBqIgMoAgBqNgIIIAAgASgCDCABQTRqIgQoAgBqNgIMIAAgASgCECABQThqIgUoAgBqNgIQIAAgASgCFCABQTxqIgYoAgBqNgIUIAAgASgCGCABQcAAaiIHKAIAajYCGCAAIAEoAhwgAUHEAGoiCCgCAGo2AhwgACABKAIgIAFByABqIgkoAgBqNgIgIAAgASgCJCABQcwAaiIKKAIAajYCJCAAIAEoAiggASgCAGs2AiggAEEsaiACKAIAIAEoAgRrNgIAIABBMGogAygCACABKAIIazYCACAAQTRqIAQoAgAgASgCDGs2AgAgAEE4aiAFKAIAIAEoAhBrNgIAIABBPGogBigCACABKAIUazYCACAAQcAAaiAHKAIAIAEoAhhrNgIAIABBxABqIAgoAgAgASgCHGs2AgAgAEHIAGogCSgCACABKAIgazYCACAAQcwAaiAKKAIAIAEoAiRrNgIAIAAgASgCUDYCUCAAQdQAaiABQdQAaigCADYCACAAQdgAaiABQdgAaigCADYCACAAQdwAaiABQdwAaigCADYCACAAQeAAaiABQeAAaigCADYCACAAQeQAaiABQeQAaigCADYCACAAQegAaiABQegAaigCADYCACAAQewAaiABQewAaigCADYCACAAQfAAaiABQfAAaigCADYCACAAQfQAaiABQfQAaigCADYCACAAQfgAaiABQfgAakHwj4CAABCdgICAAAvwCgETfyOAgICAAEHgAGsiAySAgICAACADIAEoAgAiBCABKAIoIgVqNgIwIAMgASgCBCIGIAFBLGooAgAiB2o2AjQgAyABKAIIIgggAUEwaigCACIJajYCOCADIAEoAgwiCiABQTRqKAIAIgtqNgI8IAMgASgCECIMIAFBOGooAgAiDWo2AkAgAyABKAIUIg4gAUE8aigCACIPajYCRCADIA8gDms2AhQgAyANIAxrNgIQIAMgCyAKazYCDCADIAkgCGs2AgggAyAHIAZrNgIEIAMgBSAEazYCACADIAEoAhgiBCABQcAAaigCACIFajYCSCADIAEoAhwiBiABQcQAaigCACIHajYCTCADIAEoAiAiCCABQcgAaigCACIJajYCUCADIAEoAiQiCiABQcwAaigCACILajYCVCADIAsgCms2AiQgAyAJIAhrNgIgIAMgByAGazYCHCADIAUgBGs2AhggA0EwaiADQTBqIAIQnYCAgAAgAyADIAJBKGoQnYCAgAAgACADKAIAIgQgAygCMCIFajYCKCAAQSxqIAMoAgQiBiADKAI0IgdqNgIAIABBMGogAygCCCIIIAMoAjgiCWo2AgAgAEE0aiADKAIMIgogAygCPCILajYCACAAQThqIAMoAhAiDCADKAJAIg1qNgIAIABBPGogAygCFCIOIAMoAkQiD2o2AgAgAEHAAGogAygCGCIQIAMoAkgiEWo2AgAgAEHEAGogAygCHCISIAMoAkwiE2o2AgAgAEHIAGogAygCICIUIAMoAlAiFWo2AgAgACAPIA5rNgIU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ARCdgICAACAAIAAgBBCdgICAACABIAEgAxCdgICAACAAQdAAaiADIAQQnYCAgAALtwwBAn8jgICAgABBsAFrIgIkgICAgAAgAkHgAGogAUHQAGoiAxCcgICAACACQeAAaiACQeAAahCegICAABogAkHgAGogAkHgAGoQnICAgAAgAkEwaiACQeAAaiADEJ2AgIAAIAJBADoAYCACQQA6AGEgAkEAOgBiIAJBADoAYyACQQA6AGQgAkEAOgBlIAJBADoAZiACQQA6AGcgAkEAOgBoIAJBADoAaSACQQA6AGogAkEAOgBrIAJBADoAbCACQQA6AG0gAkEAOgBuIAJBADoAbyACQQA6AHAgAkEAOgBxIAJBADoAciACQQA6AHMgAkEAOgB0IAJBADoAdSACQQA6AHYgAkEAOgB3IAJBADoAeCACQQA6AHkgAkEAOgB6IAJBADoAeyACQQA6AHwgAkEAOgB9IAJBADoAfiACQQA6AH8gAkEAOgCAASACQQA6AIEBIAJBADoAggEgAkEAOgCDASACQQA6AIQBIAJBADoAhQEgAkEAOgCGASACQQA6AIcBIAJB4ABqIAEgAkEwahCdgICAACACIAFBKGogAkEwahCdgICAACAAIAIQn4CAgAAgAkGQAWogAkHgAGoQn4CAgAAgAi0AkAEhASACQQA6AJABIAJBADoAkQEgAkEAOgCSASACQQA6AJMBIAJBADoAlAEgAkEAOgCVASACQQA6AJYBIAJBADoAlwEgAkEAOgCYASACQQA6AJkBIAJBADoAmgEgAkEAOgCbASACQQA6AJwBIAJBADoAnQEgAkEAOgCeASACQQA6AJ8BIAJBADoAoAEgAkEAOgChASACQQA6AKIBIAJBADoAowEgAkEAOgCkASACQQA6AKUBIAJBADoApgEgAkEAOgCnASACQQA6AKgBIAJBADoAqQEgAkEAOgCqASACQQA6AKsBIAJBADoArAEgAkEAOgCtASACQQA6AK4BIAJBADoArwEgACAALQAfIAFBB3RzOgAfIAJBADoAMCACQQA6ADEgAkEAOgAyIAJBADoAMyACQQA6ADQgAkEAOgA1IAJBADoANiACQQA6ADcgAkEAOgA4IAJBADoAOSACQQA6ADogAkEAOgA7IAJBADoAPCACQQA6AD0gAkEAOgA+IAJBADoAPyACQQA6AEAgAkEAOgBBIAJBADoAQiACQQA6AEMgAkEAOgBEIAJBADoARSACQQA6AEYgAkEAOgBHIAJBADoASCACQQA6AEkgAkEAOgBKIAJBADoASyACQQA6AEwgAkEAOgBNIAJBADoATiACQQA6AE8gAkEAOgBQIAJBADoAUSACQQA6AFIgAkEAOgBTIAJBADoAVCACQQA6AFUgAkEAOgBWIAJBADoAVyACQQA6AGAgAkEAOgBhIAJBADoAYiACQQA6AGMgAkEAOgBkIAJBADoAZSACQQA6AGYgAkEAOgBnIAJBADoAaCACQQA6AGkgAkEAOgBqIAJBADoAayACQQA6AGwgAkEAOgBtIAJBADoAbiACQQA6AG8gAkEAOgBwIAJBADoAcSACQQA6AHIgAkEAOgBzIAJBADoAdCACQQA6AHUgAkEAOgB2IAJBADoAdyACQQA6AHggAkEAOgB5IAJBADoAeiACQQA6AHsgAkEAOgB8IAJBADoAfSACQQA6AH4gAkEAOgB/IAJBADoAgAEgAkEAOgCBASACQQA6AIIBIAJBADoAgwEgAkEAOgCEASACQQA6AIUBIAJBADoAhgEgAkEAOgCHASACQQA6AAAgAkEAOgABIAJBADoAAiACQQA6AAMgAkEAOgAEIAJBADoABSACQQA6AAYgAkEAOgAHIAJBADoACCACQQA6AAkgAkEAOgAKIAJBADoACyACQQA6AAwgAkEAOgANIAJBADoADiACQQA6AA8gAkEAOgAQIAJBADoAESACQQA6ABIgAkEAOgATIAJBADoAFCACQQA6ABUgAkEAOgAWIAJBADoAFyACQQA6ABggAkEAOgAZIAJBADoAGiACQQA6ABsgAkEAOgAcIAJBADoAHSACQQA6AB4gAkEAOgAfIAJBADoAICACQQA6ACEgAkEAOgAiIAJBADoAIyACQQA6ACQgAkEAOgAlIAJBADoAJiACQQA6ACcgAkGwAWokgICAgAAL6xAFAn8VfgZ/An4Bf0EAIQIjgICAgABB8ABrIgNBAEHkAPwLACABNQI8IQQgATUCOCEFIAE1AjQhBiABNQIwIQcgATUCLCEIIAE1AighCSABNQIkIQogATUCICELIAE1AhwhDCABNQIYIQ0gATUCFCEOIAE1AhAhDyABNQIMIRAgATUCCCERIAE1AgQhEiABNQIAIRNCACEUQgAhFUIAIRZCACEXQgAhGEEAIRlBACEaQQAhG0EAIRxBACEdAkADQCADIAJqIh4gEyACQaCQgIAAajUCACIffiAdrXwiID4CACAeQQRqIh0gIEIgiCAcrXwgEiAffnwiID4CACAeQQhqIhwgIEIgiCAbrXwgESAffnwiID4CACAeQQxqIhsgIEIgiCAarXwgECAffnwiID4CACAeQRBqIhogIEIgiCAZrXwgDyAffnwiID4CACAeQRRqIiEgIEIgiCAYQv////8Pg3wgDiAffnwiGD4CACAeQRhqIBhCIIggF0L/////D4N8IA0gH358Ihg+AgAgHkEcaiAYQiCIIBZC/////w+DfCAMIB9+fCIXPgIAIB5BIGogF0IgiCAVQv////8Pg3wgCyAffnwiFj4CACAeQSRqIBZCIIggFEL/////D4N8IAogH358IhU+AgAgHkEoaiIZIBVCIIggGTUCAHwgCSAffnwiFD4CACAeQSxqIhkgFEIgiCAZNQIAfCAIIB9+fCIgPgIAIB5BMGoiGSAgQiCIIBk1AgB8IAcgH358IiA+AgAgHkE0aiIZICBCIIggGTUCAHwgBiAffnwiID4CACAeQThqIhkgIEIgiCAZNQIAfCAFIB9+fCIgPgIAIB5BPGoiHiAgQiCIIB41AgB8IAQgH358NwIAIAJBIEYNASACQQRqIQIgISgCACEZIBooAgAhGiAbKAIAIRsgHCgCACEcIB0oAgAhHQwACwsgACABKAIcIAE1AgAgAygCQCIerSIfQu2n1+cFfiIVQoCAgIBwhH0iF0IgiCABNQIEfCADNQJEIhRC7afX5wV+IBVCIIggH0KaxsnABX58IhZC/////w+DfCIYQn+FQv////8Pg3wiIEIgiCABNQIIfCADNQJIIhVC7afX5wV+IBhCIIggFkIgiCAfQta53pcKfnwiGEL/////D4N8IBRCmsbJwAV+fCIEQv////8Pg3wiBUJ/hUL/////D4N8IgZCIIggATUCDHwgAzUCTCIWQu2n1+cFfiAFQiCIIARCIIggGEIgiCAfQt7z+6YBfnwiGEL/////D4N8IBRC1rnelwp+fCIEQv////8Pg3wgFUKaxsnABX58IgVC/////w+DfCIHQn+FQv////8Pg3wiCEIgiCABNQIQfCADNQJQIh9C7afX5wV+IAdCIIggBUIgiCAEQiCIIBhCIIh8IBRC3vP7pgF+fCIYQv////8Pg3wgFULWud6XCn58IgRC/////w+DfCAWQprGycAFfnwiBUL/////D4N8IgdCf4VC/////w+DfCIJQiCIIAE1AhR8IAM1AlQiFELtp9fnBX4gB0IgiCAFQiCIIARCIIggGEIgiHwgFULe8/umAX58IhVC/////w+DfCAWQta53pcKfnwiGEL/////D4N8IB9CmsbJwAV+fCIEQv////8Pg3wiBUJ/hUL/////D4N8IgdCIIggATUCGHwgAzUCWCIKQu2n1+cFfiAFQiCIIARCIIggGEIgiCAVQiCIfCAWQt7z+6YBfnwiFUL/////D4N8IB9C1rnelwp+fCIWQv////8Pg3wgFEKaxsnABX58IhhC/////w+DfCIEQn+FQv////8Pg3wiBUIgiKdqIAMoAlxB7afX5wVsIARCIIggGEIgiCAWQiCIIB5BHHQgFUIgiKdqrXwgH0Le8/umAX58fCAUQta53pcKfnx8IApCmsbJwAV+fKdqQX9zaiICrSAFQv////8PgyIEIAdC/////w+DIhggCUL/////D4MiBSAIQv////8PgyIWIAZC/////w+DIhUgIEL/////D4MiFCAXQv////8PgyIfQpPYqJgKfEIgiHxC5bm2vwp8QiCIfEKpxqHoBXxCIIh8QqGMhNkOfEIgiHxC/////w98QiCIfEL/////D3xCIIh8Qv////8PfEIgiHxC/////w58QiCIIhcgH3xBACAXp2siHkGS2KiYenGtfCIfPAAAIAAgH0IYiDwAAyAAIB9CEIg8AAIgACAfQgiIPAABIAAgFCAeQeW5tr96ca18IB9CIIh8IhQ8AAQgACAUQhiIPAAHIAAgFEIQiDwABiAAIBRCCIg8AAUgACAVIB5Bqcah6AVxrXwgFEIgiHwiFTwACCAAIBVCGIg8AAsgACAVQhCIPAAKIAAgFUIIiDwACSAAIBYgHkGhjITZfnGtfCAVQiCIfCIWPAAMIAAgFkIYiDwADyAAIBZCEIg8AA4gACAWQgiIPAANIAAgBSAerSIgfCAWQiCIfCIXPAAQIAAgF0IYiDwAEyAAIBdCEIg8ABIgACAXQgiIPAARIAAgGCAgfCAXQiCIfCIYPAAUIAAgGEIYiDwAFyAAIBhCEIg8ABYgACAYQgiIPAAVIAAgBCAg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IAcgKH58IAogI358IA0gC358IBEgJH58IBQgEn58IBggJX58IBkgGqwiMH58IB8gJ358ICEgIH58IC9CGod8Ii8gL0KAgIAIfCIvQoCAgPAPg30+AhwgACAEIBJ+IAcgJH58IAogJX58IA0gGX58IC4gJ358ICkgIH58ICYgKH58IBsgCH58IB8gI358ICEgC358IDVCGod8Ih8gH0KAgIAIfCIfQoCAgPAPg30+AgwgACAEICJ+IAcgIH58IAogCH58IA0gBn58IBEgC358IBQgD358IBggEn58IDAgFn58IBkgHqwiG358ICEgHX58IC9CGYd8IiEgIUKAgIAQfCIhQoCAgOAPg30+AiAgACAsIC1CgICA8A+DfSAfQhmHICogK0KAgIBgg318Ih9CgICAEHwiJkIaiHw+AhQgACAfICZCgICA4A+DfT4CECAAIAQgIH4gByAnfnwgCiAofnwgDSAIfnwgESAjfnwgFCALfnwgGCAkfnwgMCASfnwgGyAlfnwgGSACrH58ICFCGod8IgcgB0KAgIAIfCIHQoCAgPAPg30+AiQgACAzIDRCgICA8A+DfSAHQhmHQhN+IDEgMkKAgIBgg318IgdCgICAEHwiCEIaiHw+AgQgACAHIAhCgICA4A+DfT4CAAuHIAEFfyOAgICAAEGQAWsiAiSAgICAACACQeAAaiABEJyAgIAAIAJBMGogAkHgAGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogASACQTBqEJ2AgIAAIAJB4ABqIAJB4ABqIAJBMGoQnYCAgAAgAkHgAGogAkHgAGoQnICAgAAgAkHgAGogAkEwaiACQeAAahCdgICAACACQTBqIAJB4ABqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQeAAaiACQTBqIAJB4ABqEJ2AgIAAIAJBMGogAkHgAGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqIAJB4ABqEJ2AgIAAIAIgAkEwahCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAkEwaiACIAJBMGoQnYCAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJB4ABqIAJBMGogAkHgAGoQnYCAgAAgAkEwaiACQeAAahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqIAJB4ABqEJ2AgIAAIAIgAkEwahCcgICAAEHjACEDA0AgAiACEJyAgIAAIANBf2oiAw0ACyACQTBqIAIgAkEwahCdgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJB4ABqIAJBMGogAkHgAGoQnYCAgAAgAkHgAGogAkHgAGoQnICAgAAgAkHgAGogAkHgAGoQnICAgAAgAkHgAGogAkHgAGogARCdgICAACACQTBqIAJB4ABqEJyAgIAAIAJBMGogAkEwaiABEJ2AgIAAIAJCADcDICACQgA3AxggAkIANwMQIAJCADcDCCACQgA3AwAgASACEKCAgIAAIQQgAkIANwMgIAJCADcDGCACQgA3AxAgAkIANwMIIAJCATcDACACQTBqIAIQoICAgAAhBSACQQAgAigCAGs2AgAgAkEAIAIoAgRrNgIEIAJBACACKAIIazYCCCACQQAgAigCDGs2AgwgAkEAIAIoAhBrNgIQIAJBACACKAIUazYCFCACQQAgAigCGGs2AhggAkEAIAIoAhxrNgIcIAJBACACKAIgazYCICACQQAgAigCJGs2AiQgAkEwaiACEKCAgIAAIQEgAkLih+z/7+38qH83AyAgAkLh5v6L4NKmDzcDGCACQqDni/qfi4oCNwMQIAJC4s7D+5/QpWU3AwggAkLQvsWP0MXNPDcDACACQTBqIAIQoICAgAAhAyAAIAJB4ABqQcCPgIAAEJ2AgIAAIAAgAigCYCAAKAIAIgZzIAMgAXJBf2oiA3EgBnM2AgAgACACKAJkIAAoAgQiBnMgA3EgBnM2AgQgACACKAJoIAAoAggiBnMgA3EgBnM2AgggACACKAJsIAAoAgwiBnMgA3EgBnM2AgwgACACKAJwIAAoAhAiBnMgA3EgBnM2AhAgACACKAJ0IAAoAhQiBnMgA3EgBnM2AhQgACACKAJ4IAAoAhgiBnMgA3EgBnM2AhggACACKAJ8IAAoAhwiBnMgA3EgBnM2AhwgACACKAKAASAAKAIgIgZzIANxIAZzNgIgIAAgAigChAEgACgCJCIGcyADcSAGczYCJCACQQA6AGAgAkEAOgBhIAJBADoAYiACQQA6AGMgAkEAOgBkIAJBADoAZSACQQA6AGYgAkEAOgBnIAJBADoAaCACQQA6AGkgAkEAOgBqIAJBADoAayACQQA6AGwgAkEAOgBtIAJBADoAbiACQQA6AG8gAkEAOgBwIAJBADoAcSACQQA6AHIgAkEAOgBzIAJBADoAdCACQQA6AHUgAkEAOgB2IAJBADoAdyACQQA6AHggAkEAOgB5IAJBADoAeiACQQA6AHsgAkEAOgB8IAJBADoAfSACQQA6AH4gAkEAOgB/IAJBADoAgAEgAkEAOgCBASACQQA6AIIBIAJBADoAgwEgAkEAOgCEASACQQA6AIUBIAJBADoAhgEgAkEAOgCHASACQQA6ADAgAkEAOgAxIAJBADoAMiACQQA6ADMgAkEAOgA0IAJBADoANSACQQA6ADYgAkEAOgA3IAJBADoAOCACQQA6ADkgAkEAOgA6IAJBADoAOyACQQA6ADwgAkEAOgA9IAJBADoAPiACQQA6AD8gAkEAOgBAIAJBADoAQSACQQA6AEIgAkEAOgBDIAJBADoARCACQQA6AEUgAkEAOgBGIAJBADoARyACQQA6AEggAkEAOgBJIAJBADoASiACQQA6AEsgAkEAOgBMIAJBADoATSACQQA6AE4gAkEAOgBPIAJBADoAUCACQQA6AFEgAkEAOgBSIAJBADoAUyACQQA6AFQgAkEAOgBVIAJBADoAViACQQA6AFcgAkEAOgAAIAJBADoAASACQQA6AAIgAkEAOgADIAJBADoABCACQQA6AAUgAkEAOgAGIAJBADoAByACQQA6AAggAkEAOgAJIAJBADoACiACQQA6AAsgAkEAOgAMIAJBADoADSACQQA6AA4gAkEAOgAPIAJBADoAECACQQA6ABEgAkEAOgASIAJBADoAEyACQQA6ABQgAkEAOgAVIAJBADoAFiACQQA6ABcgAkEAOgAYIAJBADoAGSACQQA6ABogAkEAOgAbIAJBADoAHCACQQA6AB0gAkEAOgAeIAJBADoAHyACQQA6ACAgAkEAOgAhIAJBADoAIiACQQA6ACMgAkEAOgAkIAJBADoAJSACQQA6ACYgAkEAOgAnIAJBkAFqJICAgIAAIAEgBSAEcnILnhUBC38jgICAgAAhAiABLQADIQMgAS0AAiEEIAEtAAEhBSACQcAAayICIAEtAAA6ADAgAiAFOgAvIAIgBDoALiACIAM6AC0gAS0AByEDIAEtAAYhBCABLQAFIQUgAiABLQAEOgAsIAIgBToAKyACIAQ6ACogAiADOgApIAEtAAshAyABLQAKIQQgAS0ACSEFIAIgAS0ACDoAKCACIAU6ACcgAiAEOgAmIAIgAzoAJSABLQAPIQMgAS0ADiEEIAEtAA0hBSACIAEtAAw6ACQgAiAFOgAjIAIgBDoAIiACIAM6ACEgAS0AEyEDIAEtABIhBCABLQARIQUgAiABLQAQOgAgIAIgBToAHyACIAQ6AB4gAiADOgAdIAEtABchAyABLQAWIQQgAS0AFSEFIAIgAS0AFDoAHCACIAU6ABsgAiAEOgAaIAIgAzoAGSABLQAbIQMgAS0AGiEEIAEtABkhBSACIAEtABg6ABggAiAFOgAXIAIgBDoAFiACIAM6ABUgAS0AHyEDIAEtAB4hBCABLQAdIQUgAiABLQAcOgAUIAIgBToAEyACIAQ6ABIgAiADOgARIAEtACMhBSABLQAiIQYgAS0AISEHIAIgAS0AICIIOgAQIAIgBzoADyACIAY6AA4gAiAFOgANIAEtACchCSABLQAmIQogAS0AJSELIAIgAS0AJCIBOgAMIAIgCzoACyACIAo6AAogAiAJOgAJIAIgAi0ALUEYdCACLQAuQRB0ciACLQAvQQh0ciACLQAwciIMIAggBUEYdCAGQRB0ciAHQQh0cnIgAi0AFUEYdCACLQAWQRB0ciACLQAXQQh0ciACLQAYciACLQAdQRh0IAItAB5BEHRyIAItAB9BCHRyIAItACByIAItACVBGHQgAi0AJkEQdHIgAi0AJ0EIdHIgAi0AKHIgDCABIAlBGHQgCkEQdHIgC0EIdHJyIgFBE2xBgICACGpBGXVqQRp1IAItAClBGHQgAi0AKkEQdHIgAi0AK0EIdHIgAi0ALHJqQRl1akEadSACLQAhQRh0IAItACJBEHRyIAItACNBCHRyIAItACRyakEZdWpBGnUgAi0AGUEYdCACLQAaQRB0ciACLQAbQQh0ciACLQAccmpBGXVqQRp1IANBGHQgBEEQdHIgAi0AE0EIdHIgAi0AFHJqQRl1akEadSABakEZdUETbGoiAToAMCACIAFBCHY6AC8gAiABQRB2OgAuIAIgAUEYdkEDcToALSACIAItAClBGHQgAi0AKkEQdHIgAi0AK0EIdHIgAi0ALHIgAUEadWoiAToALCACIAFBEHY6ACogAiABQQh2OgArIAIgAUEYdkEBcToAKSACIAItACVBGHQgAi0AJkEQdHIgAi0AJ0EIdHIgAi0AKHIgAUEZdWoiAToAKCACIAFBEHY6ACYgAiABQQh2OgAnIAIgAUEYdkEDcToAJSACIAItACFBGHQgAi0AIkEQdHIgAi0AI0EIdHIgAi0AJHIgAUEadWoiAToAJCACIAFBCHY6ACMgAiABQRB2OgAiIAIgAUEYdkEBcToAISACIAItAB1BGHQgAi0AHkEQdHIgAi0AH0EIdHIgAi0AIHIgAUEZdWoiAToAICACIAFBCHY6AB8gAiABQRB2OgAeIAIgAUEYdkEDcToAHSACIAItABlBGHQgAi0AGkEQdHIgAi0AG0EIdHIgAi0AHHIgAUEadWoiAToAHCACIAFBCHY6ABsgAiABQRB2OgAaIAIgAUEYdkEBcToAGSACIAItABVBGHQgAi0AFkEQdHIgAi0AF0EIdHIgAi0AGHIgAUEZdWoiAToAGCACIAFBCHY6ABcgAiABQRB2OgAWIAIgAUEYdkEDcToAFSACIAItABFBGHQgAi0AEkEQdHIgAi0AE0EIdHIgAi0AFHIgAUEadWoiAToAFCACIAFBCHY6ABMgAiABQRB2OgASIAIgAUEYdkEBcToAESACIAItAA1BGHQgAi0ADkEQdHIgAi0AD0EIdHIgAi0AEHIgAUEZdWoiAToAECACIAFBCHY6AA8gAiABQRB2OgAOIAIgAUEYdkEDcToADSACIAItAAlBGHQgAi0ACkEQdHIgAi0AC0EIdHIgAi0ADHIgAUEadWoiAToADCACIAFBCHY6AAsgAiABQRB2OgAKIAIgAUEYdkEBcToACSACLQArIQMgAi0AKSEEIAItACohBSACLQAsIQEgAi0ALSEGIAItADAhByACLQAvIQkgACACLQAuOgACIAAgCToAASAAIAc6AAAgACABQRp0IAZBGHRyQRh2OgADIAItACUhBiACLQAmIQcgAi0AKCEJIAItACchCiAAIARBGHQgBUEQdHIgA0EIdHIiA0EOdjoABSAAIAMgAXJBBnYiAToABCAAIAkgCkEIdCIDckETdCABciIBQRh2OgAHIAAgAUEQdjoABiACLQAhIQEgAi0AJCEEIAItACIhBSACLQAjIQkgACAGQRh0IAdBEHRyIANyQQ12IgM6AAggACAFQRB0IgUgCUEIdHIiBkELdjoACyAAIAYgBHJBDXQgA3IiA0EQdjoACiAAIANBCHY6AAkgAi0AICEDIAItAB8hBCAAIAItAB1BGHQgAi0AHkEQdHIiBkESdjoADyAAIAYgBEEIdHIiBEEKdjoADiAAIAQgA3JBBnQgAUEYdCAFckETdnIiAToADCAAIAFBCHY6AA0gAi0AFyEDIAItABUhBCACLQAWIQUgAi0AGCEBIAItABkhBiACLQAcIQcgAi0AGyEJIAAgAi0AGjoAEiAAIAk6ABEgACAHOgAQIAAgAUEZdCAGQRh0ckEYdjoAEyACLQARIQYgAi0AEiEHIAItABQhCSACLQATIQogACAEQRh0IAVBEHRyIANBCHRyIgNBD3Y6ABUgACADIAFyQQd2IgE6ABQgACAJIApBCHQiA3JBE3QgAXIiAUEYdjoAFyAAIAFBEHY6ABYgAi0ADSEBIAItABAhBCACLQAOIQUgAi0ADyEJIAAgBkEYdCAHQRB0ciADckENdiIDOgAYIAAgBUEQdCIFIAlBCHRyIgZBDHY6ABsgACAGIARyQQx0IANyIgNBEHY6ABogACADQQh2OgAZIAItAAwhAyACLQALIQQgACACLQAJQRh0IAItAApBEHRyIgZBEnY6AB8gACAGIARBCHRyIgRBCnY6AB4gACAEIANyQQZ0IAFBGHQgBXJBFHZyIgE6ABwgACABQQh2OgAdIAJBADoAMCACQQA6AC8gAkEAOgAuIAJBADoALSACQQA6ACwgAkEAOgArIAJBADoAKiACQQA6ACkgAkEAOgAoIAJBADoAJyACQQA6ACYgAkEAOgAlIAJBADoAJCACQQA6ACMgAkEAOgAiIAJBADoAISACQQA6ACAgAkEAOgAfIAJBADoAHiACQQA6AB0gAkEAOgAcIAJBADoAGyACQQA6ABogAkEAOgAZIAJBADoAGCACQQA6ABcgAkEAOgAWIAJBADoAFSACQQA6ABQgAkEAOgATIAJBADoAEiACQQA6ABEgAkEAOgAQIAJBADoADyACQQA6AA4gAkEAOgANIAJBADoADCACQQA6AAsgAkEAOgAKIAJBADoACQvjBAIBfwh+I4CAgIAAQcAAayICJICAgIAAIAJBIGogABCfgICAACACIAEQn4CAgAAgAikDICEDIAJBADoAICACQQA6ACEgAkEAOgAiIAJBADoAIyACQQA6ACQgAkEAOgAlIAJBADoAJiACQQA6ACcgAikDKCEEIAJBADoAKCACQQA6ACkgAkEAOgAqIAJBADoAKyACQQA6ACwgAkEAOgAtIAJBADoALiACQQA6AC8gAikDMCEFIAJBADoAMCACQQA6ADEgAkEAOgAyIAJBADoAMyACQQA6ADQgAkEAOgA1IAJBADoANiACQQA6ADcgAikDOCEGIAJBADoAOCACQQA6ADkgAkEAOgA6IAJBADoAOyACQQA6ADwgAkEAOgA9IAJBADoAPiACQQA6AD8gAikDACEHIAJBADoAACACQQA6AAEgAkEAOgACIAJBADoAAyACQQA6AAQgAkEAOgAFIAJBADoABiACQQA6AAcgAikDCCEIIAJBADoACCACQQA6AAkgAkEAOgAKIAJBADoACyACQQA6AAwgAkEAOgANIAJBADoADiACQQA6AA8gAikDECEJIAJBADoAECACQQA6ABEgAkEAOgASIAJBADoAEyACQQA6ABQgAkEAOgAVIAJBADoAFiACQQA6ABcgAikDGCEKIAJBADoAGCACQQA6ABkgAkEAOgAaIAJBADoAGyACQQA6ABwgAkEAOgAdIAJBADoAHiACQQA6AB8gAkHAAGokgICAgAAgCCAEhSAHIAOFhCAJIAWFhCAKIAaFhCIDQiCIIANC/////w+DhEJ/fEIgiKdBAXELggoBCH8CQAJAAkACQAJAAkACQCAGQQBIDQAgBSAGQQN2ai0AACAGQQdxIgd2QQFxIQgMAQsgBkFgSQ0BIAZBB3EhB0EAIQgLIAUgBkEgakEDdmotAAAgB3ZBAXRBAnEgCHIhCAwBCyAGQUBJDQEgBkEHcSEHQQAhCAsgCCAFIAZBwABqQQN2ai0AACAHdkECdEEEcXIhCAwBC0EAIQhBACEJIAZBoH9JDQEgBkEHcSEHQQAhCAsgBSAGQeAAakEDdmotAAAgB3ZBAXEhCQsgAUHQAGohCiABQShqIQsgCUF/akEHcSAIcyEMQQAhB0EAIQgDQCABIAQgB2oiBigCACABKAIAIg1zQQAgDCAIc0F/akEIdkEBcWsiBXEgDXM2AgAgASAGQQRqKAIAIAEoAgQiDXMgBXEgDXM2AgQgASAGQQhqKAIAIAEoAggiDXMgBXEgDXM2AgggASAGQQxqKAIAIAEoAgwiDXMgBXEgDXM2AgwgASAGQRBqKAIAIAEoAhAiDXMgBXEgDXM2AhAgASAGQRRqKAIAIAEoAhQiDXMgBXEgDXM2AhQgASAGQRhqKAIAIAEoAhgiDXMgBXEgDXM2AhggASAGQRxqKAIAIAEoAhwiDXMgBXEgDXM2AhwgASAGQSBqKAIAIAEoAiAiDXMgBXEgDXM2AiAgASAGQSRqKAIAIAEoAiQiDXMgBXEgDXM2AiQgASAGQShqKAIAIAEoAigiDXMgBXEgDXM2AiggASAGQSxqKAIAIAEoAiwiDXMgBXEgDXM2AiwgASAGQTBqKAIAIAEoAjAiDXMgBXEgDXM2AjAgASAGQTRqKAIAIAEoAjQiDXMgBXEgDXM2AjQgASAGQThqKAIAIAEoAjgiDXMgBXEgDXM2AjggASAGQTxqKAIAIAEoAjwiDXMgBXEgDXM2AjwgASAGQcAAaigCACABKAJAIg1zIAVxIA1zNgJAIAEgBkHEAGooAgAgASgCRCINcyAFcSANczYCRCABIAZByABqKAIAIAEoAkgiDXMgBXEgDXM2AkggASAGQcwAaigCACABKAJMIg1zIAVxIA1zNgJMIAEgBkHQAGooAgAgASgCUCINcyAFcSANcyIONgJQIAEgBkHUAGooAgAgASgCVCINcyAFcSANczYCVCABIAZB2ABqKAIAIAEoAlgiDXMgBXEgDXM2AlggASAGQdwAaigCACABKAJcIg1zIAVxIA1zNgJcIAEgBkHgAGooAgAgASgCYCINcyAFcSANczYCYCABIAZB5ABqKAIAIAEoAmQiDXMgBXEgDXM2AmQgASAGQegAaigCACABKAJoIg1zIAVxIA1zNgJoIAEgBkHsAGooAgAgASgCbCINcyAFcSANczYCbCABIAZB8ABqKAIAIAEoAnAiDXMgBXEgDXM2AnAgASAGQfQAaigCACABKAJ0IgZzIAVxIAZzNgJ0IAhBAWohCCAHQfgAaiIHQcAHRw0ACyACQQAgDms2AgAgAkEAIAEoAlRrNgIEIAJBACABKAJYazYCCCACQQAgASgCXGs2AgwgAkEAIAEoAmBrNgIQIAJBACABKAJkazYCFCACQQAgASgCaGs2AhggAkEAIAEoAmxrNgIcIAJBACABKAJwazYCICACQQAgASgCdGs2AiQgCiACIAlBAXMiBhCigICAACABIAsgBhCigICAACAAIAAgASACIAMQmYCAgAALjwMBAn8gACABKAIAIAAoAgAiA3NBACACayICcSIEIANzNgIAIAEgASgCACAEczYCACAAIAEoAgQgACgCBCIDcyACcSIEIANzNgIEIAEgASgCBCAEczYCBCAAIAEoAgggACgCCCIDcyACcSIEIANzNgIIIAEgASgCCCAEczYCCCAAIAEoAgwgACgCDCIDcyACcSIEIANzNgIMIAEgASgCDCAEczYCDCAAIAEoAhAgACgCECIDcyACcSIEIANzNgIQIAEgASgCECAEczYCECAAIAEoAhQgACgCFCIDcyACcSIEIANzNgIUIAEgASgCFCAEczYCFCAAIAEoAhggACgCGCIDcyACcSIEIANzNgIYIAEgASgCGCAEczYCGCAAIAEoAhwgACgCHCIDcyACcSIEIANzNgIcIAEgASgCHCAEczYCHCAAIAEoAiAgACgCICIDcyACcSIEIANzNgIgIAEgASgCICAEczYCICAAIAEoAiQgACgCJCIDcyACcSICIANzNgIkIAEgASgCJCACczYCJAv+BAQCfxJ+BH8BfiAAQcAAaiEBQQAhAiAAKQMAIgMhBCAAKQMIIgUhBiAAKQMQIgchCCAAKQMYIgkhCiAAKQMgIgshDCAAKQMoIg0hDiAAKQM4Ig8hECAAKQMwIhEhEgNAIBIhEyAIIRQgBiEIIAQiBkIkiSAGQh6JhSAGQhmJhSAIIBSFIAaDIAggFIOFfCAOIhIgDCIOgyAQfCATIA5Cf4WDfCAOQjKJIA5CLomFIA5CF4mFfCACQcCggIAAaikDAHwgASACaikDAHwiEHwhBCAQIAp8IQwgFCEKIBMhECACQQhqIgJBgAFHDQALIABBwABqIRVBwKGAgAAhFkEBIRcDQEEOIQEgFSECIBYhGANAIBIhECAIIQog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");
var falcon512_default = __toBinary("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IgENAAtBgGAhAQNAIAFBsL7CgABqIgIgAisDAEQAAAAAgADIQKI5AwAgAUG4vsKAAGoiAiACKwMARAAAAACAAMhAojkDACABQcC+woAAaiICIAIrAwBEAAAAAIAAyECiOQMAIAFByL7CgABqIgIgAisDAEQAAAAAgADIQKI5AwAgAUEgaiIBDQALQQAhAQNAIAFBsP7BgABqIgIgAisDACABQbC+woAAaisDACIOojkDACABQbCOwoAAaiICIA4gAisDAKI5AwAgAUG4/sGAAGoiAiACKwMAIAFBuL7CgABqKwMAIg6iOQMAIAFBuI7CgABqIgIgDiACKwMAojkDACABQRBqIgFBgBBHDQALQQAhAQNAIAFBsJ7CgABqIgIgAisDACABQbC+woAAaisDACIOojkDACABQbCuwoAAaiICIA4gAisDAKI5AwAgAUG4nsKAAGoiAiACKwMAIAFBuL7CgABqKwMAIg6iOQMAIAFBuK7CgABqIgIgDiACKwMAojkDACABQRBqIgFBgBBHDQALQbD+wYAAQQkQjICAgABBsJ7CgABBCRCMgICAAEQAAAAAAAAAACEOQYAMIQEDQCAOIAFBsPLBgABqKwMAIg8gD6KgIAFBsJLCgABqKwMAIg4gDqKgIAFBuPLBgABqKwMAIg4gDqKgIAFBuJLCgABqKwMAIg4gDqKgIQ4gAUEQaiIBQYAsRw0ACyAORKyt2F+abdBAY0UNAEGw/sGAAEGwhsKAABCKgICAAEUNAEEAIQFBgIXCgABBCUEAEI+AgIAAQYCFwoAAQeoAQeoAQQJBAEHQi8KAABCQgICAAEECQQJBAkECQQAoAqiIwoAAIgJrIgMgAmxrIANsIgMgAmxrIANsIgMgAmxrIANsIgMgAmxBfmogA2whA0ECQQJBAkECQQAoAoCFwoAAIgJrIgQgAmxrIARsIgQgAmxrIARsIgQgAmxrIARsIgQgAmxBfmogBGwhBAJAA0AgAUGgksKAAGogAjoAACABQaGSwoAAaiABQYGFwoAAai0AADoAACABQaKSwoAAaiABQYKFwoAAai0AADoAACABQaOSwoAAaiABQYOFwoAAai0AADoAACABQaQDRg0BIAFBhIXCgABqLQAAIQIgAUEEaiEBDAALCyAEQf////8HcSELQQAhAQNAIAFByJXCgABqIAFBqIjCgABqLQAAOgAAIAFByZXCgABqIAFBqYjCgABqLQAAOgAAIAFBypXCgABqIAFBqojCgABqLQAAOgAAIAFBy5XCgABqIAFBq4jCgABqLQAAOgAAIAFBBGoiAUGoA0cNAAtBACEBQQBBATYC2IHCgAADQCABQdyBwoAAakIANwIAIAFBCGoiAUGgA0cNAAtBzBIhAQNAIAFBsPLBgABqQQA6AAAgAUEBaiIBQdASRw0AC0EAIQEDQCABQbD+wYAAakIANwMAIAFBCGoiAUGoA0cNAAtBACEBA0AgAUHQi8KAAGogAUGoiMKAAGotAAA6AAAgAUHRi8KAAGogAUGpiMKAAGotAAA6AAAgAUHSi8KAAGogAUGqiMKAAGotAAA6AAAgAUHTi8KAAGogAUGriMKAAGotAAA6AAAgAUEEaiIBQagDRw0AC0EAIQEDQCABQfiOwoAAaiABQYCFwoAAai0AADoAACABQfmOwoAAaiABQYGFwoAAai0AADoAACABQfqOwoAAaiABQYKFwoAAai0AADoAACABQfuOwoAAaiABQYOFwoAAai0AADoAACABQQRqIgFBqANHDQALQQBBACgC+I7CgABBf2o2AviOwoAAIANB/////wdxIRVByjMhCgNAQX8hCUEAIQJBfyEFQQAhCEEAIQNBACENQQAhBANAIAJB7JjCgABqKAIAIgYgAkHElcKAAGooAgAiB3JB/////wdqQR92QX9qIAkiAXEhCSAGIARzIAVxIARzIQQgASAGIA0iDHNxIAxzIQ0gByADcyAFcSADcyEDIAEgByAIIgZzcSAGcyEIIAEhBSACQXxqIgJB2HxHDQALIAwgAUF/cyICca1CH4YgDSABcSAEcq18IRYgBiACca1CH4YgCCABcSADcq18IRdBACEBQgAhGEIBIRlCACEaQgEhG0EAKALIlcKAACIIIQJBACgCoJLCgAAiDSEDA0AgAiADIAJBACADIAF2QQFxIgUgAiABdnEiBiAWIBd9IhwgF4UgFyAWhYMgHIVCP4inIgdxIgRrcWsiA0EAIAYgB0F/c3EiBmtxayICQQAgBCAFQQFzciIFa3EgAmohAiAZIBogGUIAIAStfSIcg30iGkIAIAatfSIdg30iGUIAIAWtIh59Ih+DIBl8IRkgGCAbIBggHIN9IhsgHYN9IhggH4MgGHwhGCAWIBcgFiAcg30iFyAdg30iFkIBiCAWhSAeQn98IhyDIBaFIRYgAyAFQX9qcSADaiEDIBogHIMgGnwhGiAbIByDIBt8IRsgF0IBiCAXhSAfgyAXhSEXIAFBAWoiAUEfRw0ACyAZIAitIhd+IBggDa0iHH58Qh+HIRYgGiAXfiAbIBx+fEIfhyEXQdx8IQEDQCABQeyYwoAAaiAYIAFByJXCgABqNQIAIh1+IBZ8IBkgAUHwmMKAAGo1AgAiFn58IhynQf////8HcTYCACABQcSVwoAAaiAbIB1+IBd8IBogFn58Ih2nQf////8HcTYCACAcQh+HIRYgHUIfhyEXIAFBBGoiAQ0AC0EAIBY+AuyYwoAAQQAgFz4CxJXCgABBACAXQj+IpyICa0EBdiEDQdh8IQEDQCABQciVwoAAaiIEIAQoAgAgA3MgAmoiAkH/////B3E2AgAgAUHMlcKAAGoiBCAEKAIAIANzIAJBH3ZqIgJB/////wdxNgIAIAJBH3YhAiABQQhqIgENAAtBACAWQj+IpyICa0EBdiEDQdh8IQEDQCABQfCYwoAAaiIEIAQoAgAgA3MgAmoiAkH/////B3E2AgAgAUH0mMKAAGoiBCAEKAIAIANzIAJBH3ZqIgJB/////wdxNgIAIAJBH3YhAiABQQhqIgENAAtB2IHCgABB0IvCgABBqIjCgAAgFSAbIB1CP4ciFiAbQgGGg30iFyAaIBYgGkIBhoN9IhYgGCAcQj+HIhogGEIBhoN9IhggGSAaIBlCAYaDfSIZEJGAgIAAQbD+wYAAQfiOwoAAQYCFwoAAIAsgFyAWIBggGRCRgICAACAKQWJqIgpBHUsNAAtBACgCoJLCgABBAXMhAkHgfCEBA0AgAUHQlcKAAGooAgAgAUHMlcKAAGooAgAgAUHIlcKAAGooAgAgAUHElcKAAGooAgAgAnJycnIhAiABQRBqIgENAAtBACgCgIXCgABBACgCxJXCgAAgAnJFcUEAKAKoiMKAAHFFDQBCACEWQdh8IQEDQCABQdiBwoAAaiICIAI1AgBCgeAAfiAWfCIWp0H/////B3E2AgAgAUHcgcKAAGoiAiACNQIAQoHgAH4gFkIfiHwiF6dB/////wdxNgIAIBdCH4ghFiABQQhqIgENAAsgF0L/////B1YNAEIAIRZB2HwhAQNAIAFBgIXCgABqIgIgAjUCAEKB4AB+IBZ8IhanQf////8HcTYCACABQYSFwoAAaiICIAI1AgBCgeAAfiAWQh+IfCIXp0H/////B3E2AgAgF0IfiCEWIAFBCGoiAQ0ACyAXQv////8HVg0AQQkhIANAAkAgIEECSw0AQQAhDUEAIQIDQCACQQxsQYCLgYAAaigCACIBQQBBACABQQF0ayABQX1sIgMgA0EASButIhYgFn4iGCABQQIgAUECIAFBAiABQQIgAWsiA2xrIANsIgNsayADbCIDbGsgA2wiA2xBfmogA2xB/////wdxrSIWfkL/////B4MgAa0iF34gGHxCH4inIgMgAyABayIDIANBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyIDIAMgAWsiAyADQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAyADIAFrIgMgA0EASButIhggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgMgAyABayIDIANBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyIDIAMgAWsiAyADQQBIGyIDQQFxa3EgA2pBAXatIhhBgICAgHggAWutfiIZIBZ+Qv////8HgyAXfiAZfEIfiKciAyADIAFrIgMgA0EASBshBEEAIAFrIgNBACADQQBKGyEFIAJBAnRBsPLBgABqIQhBACECA0AgCCACaiIGQYAcaiACQbT+wYAAaigCACIDIAMgAWsiByAHQQBIGyAFaiIHIAcgAWsiByAHQQBIG60gGH4iGSAWfkL/////B4MgF34gGXxCH4inIgcgByABayIHIAdBAEgbIAJBsP7BgABqKAIAIgcgByABayIHIAdBAEgbaiIHIAcgAWsiByAHQQBIGyAEQQAgA0EedmtxayIDQR91IAFxIANqNgIAIAZBgCxqIAJBtIbCgABqKAIAIgMgAyABayIGIAZBAEgbIAVqIgYgBiABayIGIAZBAEgbrSAYfiIZIBZ+Qv////8HgyAXfiAZfEIfiKciBiAGIAFrIgYgBkEASBsgAkGwhsKAAGooAgAiBiAGIAFrIgYgBkEASBtqIgYgBiABayIGIAZBAEgbIARBACADQR52a3FrIgNBH3UgAXEgA2o2AgAgAkEIaiICQYAIRw0AC0EBIQIgDUEBcSEBQQEhDSABRQ0AC0EAIQEDQCABQbD+wYAAaiABQbCOwoAAai0AADoAACABQbH+wYAAaiABQbGOwoAAai0AADoAACABQbL+wYAAaiABQbKOwoAAai0AADoAACABQbP+wYAAaiABQbOOwoAAai0AADoAACABQQRqIgFBgBBHDQALQQAhAQNAIAFBsI7CgABqIAFBsJ7CgABqLQAAOgAAIAFBsY7CgABqIAFBsZ7CgABqLQAAOgAAIAFBso7CgABqIAFBsp7CgABqLQAAOgAAIAFBs47CgABqIAFBs57CgABqLQAAOgAAIAFBBGoiAUGAEEcNAAtBACEVQQEhIQNAIBUhIkGwrsKAAEGwvsKAAEEJIBVBDGwiAUGEi4GAAGooAgAgAUGAi4GAAGooAgAiASABQQIgAUECIAFBAiABQQIgAWsiAmxrIAJsIgJsayACbCICbGsgAmwiAmxBfmogAmxB/////wdxIiMQkoCAgABBACABQQF0ayABQX1sIgIgAkEASButIhYgFn4iGCAjrSIWfkL/////B4MgAa0iF34gGHxCH4inIgIgAiABayICIAJBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyICIAIgAWsiAiACQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAiACIAFrIgIgAkEASButIhggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgIgAiABayICIAJBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyICIAIgAWsiAiACQQBIGyIGQQFxIQdBgHwhAkGw1sKAACEDA0AgA0GAcGogAkGw9sGAAGosAAAiBEEfdSABcSAEajYCACADIAJBsPrBgABqLAAAIgRBH3UgAXEgBGo2AgAgA0EEaiEDIAJBAWoiBCACTyEFIAQhAiAFDQALIAFBACAHa3EgBmohJEEBIQxBgAQhAgNAIAJBAXYhCwJAIAxFDQAgAkECdCEKIAtBAnQhCEEAIQlBsMbCgAAhBwNAIAcgCGohDSAJIAxqQQJ0QbCuwoAAajUCACEZQQAhAgNAIAcgAmoiAyANIAJqIgQ1AgAgGX4iGCAWfkL/////B4MgF34gGHxCH4inIgUgBSABayIFIAVBAEgbIgUgAygCACIDaiIGIAYgAWsiBiAGQQBIGzYCACAEIAMgBWsiA0EfdSABcSADajYCACAIIAJBBGoiAkcNAAsgByAKaiEHIAlBAWoiCSAMRw0ACwsgCyECIAxBAXQiDEGABEkNAAtBASEMQYAEIQIDQCACQQF2IQsCQCAMRQ0AIAJBAnQhCiALQQJ0IQhBACEJQbDWwoAAIQcDQCAHIAhqIQ0gCSAMakECdEGwrsKAAGo1AgAhGUEAIQIDQCAHIAJqIgMgDSACaiIENQIAIBl+IhggFn5C/////weDIBd+IBh8Qh+IpyIFIAUgAWsiBSAFQQBIGyIFIAMoAgAiA2oiBiAGIAFrIgYgBkEASBs2AgAgBCADIAVrIgNBH3UgAXEgA2o2AgAgCCACQQRqIgJHDQALIAcgCmohByAJQQFqIgkgDEcNAAsLIAshAiAMQQF0IgxBgARJDQALICRBAXatIRpBgNQAIQNBtMbCgAAhAgNAIANBsPLBgABqIAI1AgAgAkF8ajUCAH4iGCAWfkL/////B4MgF34gGHxCH4inIgQgBCABayIEIARBAEgbrSAafiIYIBZ+Qv////8HgyAXfiAYfEIfiKciBCAEIAFrIgQgBEEASBs2AgAgAkEIaiECIANBBGoiA0GA3ABHDQALQYDkACEDQbTWwoAAIQIDQCADQbDywYAAaiACNQIAIAJBfGo1AgB+IhggFn5C/////weDIBd+IBh8Qh+IpyIEIAQgAWsiBCAEQQBIG60gGn4iGCAWfkL/////B4MgF34gGHxCH4inIgQgBCABayIEIARBAEgbNgIAIAJBCGohAiADQQRqIgNBgOwARw0AC0EAIQIDQCACQbC2woAAaiACQbC+woAAai0AADoAACACQbG2woAAaiACQbG+woAAai0AADoAACACQbK2woAAaiACQbK+woAAai0AADoAACACQbO2woAAaiACQbO+woAAai0AADoAACACQQRqIgJBgAhHDQALQQAhAgNAIAJBsL7CgABqIAJBsMbCgABqLQAAOgAAIAJBsb7CgABqIAJBscbCgABqLQAAOgAAIAJBsr7CgABqIAJBssbCgABqLQAAOgAAIAJBs77CgABqIAJBs8bCgABqLQAAOgAAIAJBBGoiAkGACEcNAAtBACECA0AgAkGwxsKAAGogAkGw1sKAAGotAAA6AAAgAkGxxsKAAGogAkGx1sKAAGotAAA6AAAgAkGyxsKAAGogAkGy1sKAAGotAAA6AAAgAkGzxsKAAGogAkGz1sKAAGotAAA6AAAgAkEEaiICQYAIRw0ACyAVQQJ0IgtBsI7CgABqISRBACECIAtBsP7BgABqIiUhAwNAIAJBsM7CgABqIAMoAgA2AgAgAkGw0sKAAGogA0GAEGooAgA2AgAgAkG0zsKAAGogA0EIaigCADYCACACQbTSwoAAaiADQYgQaigCADYCACACQbjOwoAAaiADQRBqKAIANgIAIAJBuNLCgABqIANBkBBqKAIANgIAIAJBvM7CgABqIANBGGooAgA2AgAgAkG80sKAAGogA0GYEGooAgA2AgAgA0EgaiEDIAJBEGoiAkGABEcNAAtBASEMQYABIQIDQCACQQF2IRUCQCAMRQ0AIAJBAnQhCiAVQQJ0IQhBACEJQbDOwoAAIQcDQCAHIAhqIQ0gCSAMakECdEGwrsKAAGo1AgAhGUEAIQIDQCAHIAJqIgMgDSACaiIENQIAIBl+IhggFn5C/////weDIBd+IBh8Qh+IpyIFIAUgAWsiBSAFQQBIGyIFIAMoAgAiA2oiBiAGIAFrIgYgBkEASBs2AgAgBCADIAVrIgNBH3UgAXEgA2o2AgAgCCACQQRqIgJHDQALIAcgCmohByAJQQFqIgkgDEcNAAsLIBUhAiAMQQF0IgxBgAFJDQALQQEhDEGAASECA0AgAkEBdiEVAkAgDEUNACACQQJ0IQogFUECdCEIQQAhCUGw0sKAACEHA0AgByAIaiENIAkgDGpBAnRBsK7CgABqNQIAIRlBACECA0AgByACaiIDIA0gAmoiBDUCACAZfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciBSAFIAFrIgUgBUEASBsiBSADKAIAIgNqIgYgBiABayIGIAZBAEgbNgIAIAQgAyAFayIDQR91IAFxIANqNgIAIAggAkEEaiICRw0ACyAHIApqIQcgCUEBaiIJIAxHDQALCyAVIQIgDEEBdCIMQYABSQ0AC0EAIQNBACECA0AgAkG0xsKAAGo1AgAhGCACQbDGwoAAajUCACEZIANBsM7CgABqNQIAIRsgAkG0vsKAAGo1AgAhHCALQbiOwoAAaiADQbDSwoAAajUCACAafiIdIBZ+Qv////8HgyAXfiAdfEIfiKciBCAEIAFrIgQgBEEASButIh0gAkGwvsKAAGo1AgB+Ih8gFn5C/////weDIBd+IB98Qh+IpyIEIAQgAWsiBCAEQQBIGzYCACALQbCOwoAAaiAdIBx+IhwgFn5C/////weDIBd+IBx8Qh+IpyIEIAQgAWsiBCAEQQBIGzYCACALQbj+wYAAaiAZIBsgGn4iGyAWfkL/////B4MgF34gG3xCH4inIgQgBCABayIEIARBAEgbrSIbfiIZIBZ+Qv////8HgyAXfiAZfEIfiKciBCAEIAFrIgQgBEEASBs2AgAgC0Gw/sGAAGogGyAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciBCAEIAFrIgQgBEEASBs2AgAgC0EQaiELIANBBGohAyACQQhqIgJBgAhHDQALICVBAkGwtsKAAEEIIAEgIxCTgICAACAkQQJBsLbCgABBCCABICMQk4CAgAACQCAhQQFxRQ0AQbC+woAAQQFBsLbCgABBCCABICMQk4CAgABBsMbCgABBAUGwtsKAAEEIIAEgIxCTgICAAEEAIQEDQCABQbCewoAAaiABQbC+woAAaigCADYCACABQbCmwoAAaiABQbDGwoAAaigCADYCACABQbSewoAAaiABQbS+woAAaigCADYCACABQbSmwoAAaiABQbTGwoAAaigCADYCACABQbiewoAAaiABQbi+woAAaigCADYCACABQbimwoAAaiABQbjGwoAAaigCADYCACABQbyewoAAaiABQby+woAAaigCADYCACABQbymwoAAaiABQbzGwoAAaigCADYCACABQRBqIgFBgAhHDQALC0EBIRVBACEhICJBAXFFDQALQbD+wYAAQQJBAkGABEEBQbCuwoAAEJCAgIAAQQBBgbD//wc2ArCuwoAAQYAsIQEDQCABQbDywYAAaiICIAIoAgAiAiACQf/PAGpB/////wdxIAJB/6eAgHxqQQBIGzYCACABQbTywYAAaiICIAIoAgAiAiACQf/PAGpB/////wdxIAJB/6eAgHxqQQBIGzYCACABQQhqIgFBgDxHDQALQYBwIQEDQCABQbC+woAAakEAIAFBtI7CgABqKAIAIgRBHnZrIgJBAXYiBSABQbCOwoAAaigCAHMgAkEBcWoiA0EfdiAFIARzaiIEQf////8HcSAEQQF0IAJxa7dEAAAAAAAA4EGiIANB/////wdxIANBAXQgAnFrt6A5AwAgAUEIaiIBDQALQYBwIQED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cSADckGAf2pBgX5JDQMgAkGxosKAAGogAzoAACABQQhqIQEgAkECaiICDQALQbC+woAAQbD+wYAAQQlBxdratgFBgbD//wdB/6//zQcQkoCAgABBgHAhAUGxnsKAACECA0AgAUGwjsKAAGogAkF/aiwAACIDQR91QYGw//8HcSADajYCACABQbSOwoAAaiACLAAAIgNBH3VBgbD//wdxIANqNgIAIAJBAmohAiABQQhqIgENAAtBACEBQbCuwoAAIQIDQCACQYBgaiABQbDywYAAaiwAACIDQR91QYGw//8HcSADajYCACACQYBwaiABQbD2wYAAaiwAACIDQR91QYGw//8HcSADajYCACACIAFBsPrBgABqLAAAIgNBH3VBgbD//wdxIANqNgIAIAJBBGohAiABQQFqIgFBgARHDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGwjsKAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGwnsKAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGwrsKAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGw/sGAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQYBwIQEDQCABQbCOwoAAajUCACABQbCewoAAajUCAH4iFkL/r//NB35C/////weDQoGw//8HfiAWfEIfiKciAiACQf/PgIB4aiICIAJBAEgbIAFBsL7CgABqNQIAIAFBsK7CgABqNQIAfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyICIAJB/8+AgHhqIgIgAkEASBtrIgJBH3VBgbD//wdxIAJqQcyI/pEHRw0DIAFBBGoiAQ0ACw8LICBBAnRBgLyBgABqKAIAIiFBAUEKICBrIid0IihBAXYiKWxBAnQiASABakGw/sGAAGoiAiAgQX9qIipBARCPgICAACAqQQJ0IgNBsLyBgABqKAIAIisgJ3QiLEECdCItQbD+wYAAaiIuIC1qIi8gAiAoIANBgLyBgABqKAIAIjBsQQN0EIaAgIAAGiAvIDAgJ3QiMUECdCIyaiIzIDJqIg1BsP7BgAAgKEECdCI0QXhxICFsEIaAgIAAGiAhIChBAXQiNUEEamwgMUEDdCI2aiAsQQN0IjdqQaz+wYAAaiElIDYgN2oiOCAhQQJ0IgVqQaz+wYAAaiE5IA0gAWohOiArQQEgK0EBSxshOyApQQEgKUEBSxshPCAhQX9qIRVBACEkA0AgJEEMbEGAi4GAAGooAgAiAUEAQQAgAUEBdGsgAUF9bCICIAJBAEgbrSIWIBZ+IhggAUECIAFBAiABQQIgAUECIAFrIgJsayACbCICbGsgAmwiAmxrIAJsIgJsQX5qIAJsQf////8Hca0iFn5C/////weDIAGtIhd+IBh8Qh+IpyICIAIgAWsiAiACQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAiACIAFrIgIgAkEASButIhggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgIgAiABayICIAJBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyICIAIgAWsiAiACQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAiACIAFrIgIgAkEASBsiAkEBcWtxIAJqQQF2IQhBgICAgHggAWshCwJAIBVFDQBBACECQQEhAyAIIQQDQAJAAkAgAyAVcQ0AIAStIRgMAQsgBK0iGCALrX4iGSAWfkL/////B4MgF34gGXxCH4inIgMgAyABayIDIANBAEgbIQsLIBggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgMgAyABayIDIANBAEgbIQRBAiACdCEDIAJBAWohAiADIBVNDQALCyAkQQJ0IgJBsP7BgABqIQYgLiACaiEHIAitIRhBACEjICUhCCA5IQkgDSEMIDohCgNAIAkhAiAhIQRBACEDA0AgA60gGH4iGSAWfkL/////B4MgF34gGXxCH4inIgMgAyABayIDIANBAEgbIAIoAgAiAyADIAFrIgMgA0EASBtqIgMgAyABayIDIANBAEgbIQMgAkF8aiECIARBf2oiBA0AC0EAIQQgBiADIAtBACAMIBVBAnQiImooAgBBHnZrcWsiAkEfdSABcSACajYCACAIIQIgISEDA0AgBK0gGH4iGSAWfkL/////B4MgF34gGXxCH4inIgQgBCABayIEIARBAEgbIAIoAgAiBCAEIAFrIgQgBEEASBtqIgQgBCABayIEIARBAEgbIQQgAkF8aiECIANBf2oiAw0ACyAHIAQgC0EAIAogImooAgBBHnZrcWsiAkEf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ACEPRAAAAAAAAPA/IQ4CQAJAIAlBAUcNAEEAIQEMAQsgDSEBIAohBQNAIA8gDiABQXxqKAIAIARzIAJqIgJB/////wdxIAJBAXQgA3Frt6KgIA5EAAAAAAAA4EGiIg4gASgCACAEcyACQR92aiICQf////8HcSACQQF0IANxa7eioCEPIAJBH3YhAiABQQhqIQEgDkQAAAAAAADgQaIhDiAFQX5qIgUNAAsgCiEBCwJAIAtFDQAgDyAOIAcgAUECdGooAgAgBHMgAmoiAUH/////B3EgAUEBdCADcWu3oqAhDwsgDCAIQQN0aiAPOQMAIA0gOWohDSAHIDlqIQcgCEEBaiIIIChHDQALCyAlICQgMRshCyA3ICcQi4CAgAAgDCAnEIuAgIAAICpBA3QiAUHkvIGAAGooAgBBBmwiBCABQeC8gYAAaigCACIFaiFRIDAgCWshQCA+IAZqIQMgNyEBIDwhAgNAIAEgQ2pEAAAAAAAA8D8gASsDACIOIA6iIAEgBmorAwAiDiAOoqAgASA+aisDACIOIA6iIAEgA2orAwAiDiAOoqCgozkDACABQQhqIQEgAkF/aiICDQALICEgBmogRWpBsP7BgABqIQEgKSECA0AgASABKwMAmjkDACABQQhqIQEgAkEBaiICIChJDQALICEgPmoiAyAGaiBFakGw/sGAAGohASApIQIDQCABIAErAwCaOQMAIAFBCGohASACQQFqIgIgKEkNAAsgLCAiaiAhaiAoQRRsaiBEIClqQQN0IgFqQbD+wYAAaiICICEgKEEYbGogAWpBsP7BgABqIgcgAiAHSxsiJCAGaiElICRBOGohOyAiICFqIENqIAFqQbD+wYAAaiFVIEMgBmohDCAtQbT+wYAAaiFZIChBeHEhLCAoQQdxIVIgQyApQQR0aiEKICEgQ2oiASBFakGw8sGAAGohOiADIEVqQbD+wYAAaiFWICtBH2wiWCAFayAEaiEyIAEgBmogRWoiAUGw/sGAAGohTSABQej+wYAAaiFaICshMQNAQQAgMUEKIDFBCkkbIglrITYCQAJAIAkNAEEAIQICQCBQQQdJDQBBACECIFohAQNAIAFCADcDACABQXhqQgA3AwAgAUFwakIANwMAIAFBaGpCADcDACABQWBqQgA3AwAgAUFYakIANwMAIAFBUGpCADcDACABQUhq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iKciCyALIAxrIgsgC0EASButIhIgEn4iEiATfkL/////B4MgDX4gEnxCH4inIgsgCyAMayILIAtBAEgbrSISIBJ+IhIgE35C/////weDIA1+IBJ8Qh+IpyILIAsgDGsiCyALQQBIG60iEiASfiISIBN+Qv////8HgyANfiASfEIfiKciCyALIAxrIgsgC0EASBsiC0EBcWtxIAtqQQF2rSEUIAAhFSAHIRYDQCAVIApBAnRqIhcoAgAhGCAWIQsgCCEZQQAhGgNAIBqtIBR+IhIgE35C/////weDIA1+IBJ8Qh+IpyIaIBogDGsiGiAaQQBIGyALKAIAIhogGiAMayIaIBpBAEgbaiIaIBogDGsiGiAaQQBIGyEaIAtBfGohCyAZQQFqIhsgGU8hHCAbIRkgHA0AC0EAIRsgGCAaayILQR91IAxxIAtqrSAQfiISIBN+Qv////8HgyANfiASfEIfiKciCyALIAxrIgsgC0EASButIR1CACESAkAgCUUNAEEAIQtBACEbA0AgFSALaiIZIBJC/////w+DIBk1AgB8IAUgC2oiGjUCACAdfnwiEqdB/////wdxNgIAIBlBBGoiGSASQh+IQv////8PgyAZNQIAfCAaQQRqNQIAIB1+fCISp0H/////B3E2AgAgEkIfiCESIAtBCGohCyAOIBtBAmoiG0cNAAsLAkAgD0UNACAVIBtBAnQiC2oiGSASQv////8PgyAZNQIAfCAFIAtqNQIAIB1+fCISp0H/////B3E2AgAgEkIfiCESCyAXIBI+AgAgFiAGaiEWIBUgBmohFSARQQFqIhEgA0cNAAsLQgAhEkEAIQsCQCAJRQ0AIAUhDANAIAwgDDUCACANfiASQv////8Pg3wiEqdB/////wdxNgIAIAxBBGoiGSAZNQIAIA1+IBJCH4hC/////w+DfCISp0H/////B3E2AgAgEkIfiCESIAxBCGohDCAOIAtBAmoiC0cNAAsLAkAgD0UNACAFIAtBAnRqIgwgDDUCACANfiASQv////8Pg3wiEqdB/////wdxNgIAIBJCH4ghEgsgBSAKQQJ0aiASPgIAIAdBBGohByAIQX9qIQggCUEBaiEJIApBAWoiCiABRw0ACwsCQCAERQ0AIANFDQACQCABRQ0AIAJBAnQhBiABQX5xIRYgAUEBcSEXIAFBAnRBfGohGEEAIREDQCAYIQwgASEZQQAhC0EAIRoDQEEAIAUgDGooAgAiG0EBdiAaQR50ciAAIAxqKAIAayIaa0EfdiAaQR91ciALQQFxQX9qcSALciELIAxBfGohDCAbQQFxIRogGUF/aiIZDQALQQAhGkEAIRsCQCABQQFGDQBBACEMQQAhGkEAIRsDQCAAIAxqIhkgGSgCACIcIAUgDGoiFSgCAGsgG2oiG0H/////B3EgHCALQQBIIg4bNgIAIBlBBGoiGSAZKAIAIhkgFUEEaigCAGsgG0EfdWoiG0H/////B3EgGSAOGzYCACAbQR91IRsgDEEIaiEMIBYgGkECaiIaRw0ACwsCQCAXRQ0AIAAgGkECdCIMaiIZIBkoAgAiGSAFIAxqKAIAayAbakH/////B3EgGSALQQBIGzYCAAsgACAGaiEAIBFBAWoiESADRw0ADAILCyADQQdxIQwCQCADQX9qQQdJDQAgA0F4aiIZQQN2QQFqIhpBB3EhCwJAIBlBOEkNACAaQfj///8DcSEZA0AgGUF4aiIZDQALCyALRQ0AA0AgC0F/aiILDQALCyAMRQ0AA0AgDEF/aiIMDQALCwvmBQUBfwF+AX8GfgN/IAAoAgAiCK0iCSAGfiABKAIAIgqtIgsgB358IAI1AgAiDCAKIAenbCAIIAanbGogA2xB/////wdxrSINfnxCH4chDiAJIAR+IAsgBX58IAwgCiAFp2wgCCAEp2xqIANsQf////8Hca0iD358Qh+HIQkgAkEEaiEKQQAhAwNAIAAgA2oiCCAIQQRqNQIAIgsgBH4gCXwgASADaiIIQQRqNQIAIgkgBX58IAogA2o1AgAiDCAPfnwiEKdB/////wdxNgIAIAggCyAGfiAOfCAJIAd+fCAMIA1+fCIOp0H/////B3E2AgAgDkIfhyEOIBBCH4chCSADQQRqIgNBpANHDQALIAAgCT4CpAMgASAOPgKkAyAJQj+IIQlBACEDQQAhCANAIAAgA2oiCkEEaigCACAKKAIAIAhqIAIgA2oiCCgCAGtBH3VqIAhBBGooAgBrIhFBH3UhCCADQQhqIgNBqANHDQALQQAhA0EAIAmnIgprQQF2IRJBACARQX9zQR92IApyayERA0AgACADaiIIIAgoAgAgCiACIANqIhMoAgAgEnMgEXFqayIKQf////8HcTYCACAIQQRqIgggCCgCACAKQR92IBNBBGooAgAgEnMgEXFqayIIQf////8HcTYCACAIQR92IQogA0EIaiIDQagDRw0ACyAOQj+IIQ5BACEDQQAhAANAIAEgA2oiCEEEaigCACAIKAIAIABqIAIgA2oiACgCAGtBH3VqIABBBGooAgBrIhJBH3UhACADQQhqIgNBqANHDQALQQAhA0EAIA6nIghrQQF2IQpBACASQX9zQR92IAhyayESA0AgASADaiIAIAAoAgAgCCACIANqIhEoAgAgCnMgEnFqayIIQf////8HcTYCACAAQQRqIgAgACgCACAIQR92IBFBBGooAgAgCnMgEnFqayIAQf////8HcTYCACAAQR92IQggA0EIaiIDQagDRw0ACwubBwUBfwR+AX8BfgF/QQBBACAEQQF0ayAEQX1sIgYgBkEASButIgcgB34iCCAFrSIHfkL/////B4MgBK0iCX4gCHxCH4inIgUgBSAEayIFIAVBAEgbrSIIIAh+IgggB35C/////weDIAl+IAh8Qh+IpyIFIAUgBGsiBSAFQQBIG60iCCAIfiIIIAd+Qv////8HgyAJfiAIfEIfiKciBSAFIARrIgUgBUEASButIgggCH4iCCAHfkL/////B4MgCX4gCHxCH4inIgUgBSAEayIFIAVBAEgbrSIIIAh+IgggB35C/////weDIAl+IAh8Qh+IpyIFIAUgBGsiBSAFQQBIGyIFQQFxayAEcSAFakEBdq0iCiADrX4iCCAHfkL/////B4MgCX4gCHxCH4inIgMgAyAEayIDIANBAEgbIQMCQCACQQlLDQACQAJAIAJBAXENACACIQUMAQsgA60iCCAIfiIIIAd+Qv////8HgyAJfiAIfEIfiKciAyADIARrIgMgA0EASBshAyACQQFqIQULIAJBCUYNACAFQXZqIQUDQCADrSIIIAh+IgggB35C/////weDIAl+IAh8Qh+IpyIDIAMgBGsiAyADQQBIG60iCCAIfiIIIAd+Qv////8HgyAJfiAIfEIfiKciAyADIARrIgMgA0EASBshAyAFQQJqIgUNAAsLIARBfmohCyADrSEIQR4hA0GAgICAeCAEayIFIQYDQCAGrSIMIAx+IgwgB35C/////weDIAl+IAx8Qh+IpyIGIAYgBGsiBiAGQQBIGyIGrSAIfiIMIAd+Qv////8HgyAJfiAMfEIfiKciDSANIARrIg0gDUEASBsgBnNBACALIAN2QQFxa3EgBnMhBiADQX9qIgNBf0cNAAsgBq0iDCAHfkL/////B4MgCX4gDHxCH4inIgMgAyAEayIDIANBAEgbrSAKfiIMIAd+Qv////8HgyAJfiAMfEIfiKciAyADIARrIgMgA0EASButIQpBCiACayELQQEhAyAFIQYDQCABIANBf2ogC3RBAXRBwL2BgABqLwEAQQJ0Ig1qIAU2AgAgACANaiAGNgIAIAWtIAp+IgwgB35C/////weDIAl+IAx8Qh+IpyIFIAUgBGsiBSAFQQBIGyEFIAatIAh+IgwgB35C/////weDIAl+IAx8Qh+IpyIGIAYgBGsiBiAGQQBIGyEGIAMgAnYhDSADQQFqIQMgDUUNAAsLzQMGAn8Cfgl/AX4FfwF+AkAgA0UNACABQQJ0IQYgAUEDdCEHIAStIQggBa0hCUEBIQpBASADdCILIQwCQANAIAwiDUECSQ0BIA1BAXYhDAJAIApFDQAgDEEBIAxBAUsbIQ4gByAKbCEPIAYgCmwhEEEAIREgACESA0AgAiARIAxqQQJ0ajUCACETIAohFCASIQUDQCAFIAUgEGoiFSgCACIWIAUoAgAiF2oiGCAYIARrIhggGEEASBs2AgAgFSAXIBZrIhZBH3UgBHEgFmqtIBN+IhkgCX5C/////weDIAh+IBl8Qh+IpyIWIBYgBGsiFiAWQQBIGzYCACAFIAZqIQUgFEF/aiIUDQALIBIgD2ohEiARQQFqIhEgDkcNAAsLIApBAXQhCiANQQRPDQALCyABQQN0IRUgAUECdCEWIAtBfnEhBUGAgICAeCADdq0hGQNAIAAgADUCACAZfiITIAl+Qv////8HgyAIfiATfEIfiKciFCAUIARrIhQgFEEASBs2AgAgACAWaiIUIBQ1AgAgGX4iEyAJfkL/////B4MgCH4gE3xCH4inIhQgFCAEayIUIBRBAEgbNgIAIAAgFWohACAFQX5qIgUNAAsLC8oSCBV/AX4BfwJ+A38Bfgp/AX4gCkEBIAl0IgtBAnQiDGoiDSAMaiIOIARBAWoiDyAJdEECdGohEAJAAkAgDyAETw0AIBBBgbD//wc2AgACQCAJQQJNDQAgC0F4aiIFQQN2QQFqIhFBB3EhDAJAIAVBOEkNACARQfj///8DcSEFA0AgBUF4aiIFDQALCwJAIAxFDQADQCAMQX9qIgwNAAsLIAlBAksNAgsgC0EHcSEMA0AgDEF/aiIMDQAMAgsLIA9BAnQhEiAFQQJ0IRMgC0F4cSEUIAtBB3EhFSALQX5xIRYgC0F/aiEXIARBAnRBBGohGCAEQQV0QSBqIRkgAyAEQX9qIhpBAnQiG2ohHCAOIR1BACEeA0AgHkEMbCIfQYCLgYAAaigCACIMQQBBACAMQQF0ayAMQX1sIgUgBUEASButIiAgIH4iICAMQQIgDEECIAxBAiAMQQIgDGsiBWxrIAVsIgVsayAFbCIFbGsgBWwiBWxBfmogBWxB/////wdxIiGtIiJ+Qv////8HgyAMrSIjfiAgfEIfiKciBSAFIAxrIgUgBUEASButIiAgIH4iICAifkL/////B4MgI34gIHxCH4inIgUgBSAMayIFIAVBAEgbrSIgICB+IiAgIn5C/////weDICN+ICB8Qh+IpyIFIAUgDGsiBSAFQQBIG60iICAgfiIgICJ+Qv////8HgyAjfiAgfEIfiKciBSAFIAxrIgUgBUEASButIiAgIH4iICAifkL/////B4MgI34gIHxCH4inIgUgBSAMayIFIAVBAEgbIgVBAXFrcSAFakEBdiEkQYCAgIB4IAxrISUCQCAaRQ0AQQAhBUEBIREgJCEmA0ACQAJAIBEgGnENACAmrSEgDAELICatIiAgJa1+IicgIn5C/////weDICN+ICd8Qh+IpyIRIBEgDGsiESARQQBIGyElCyAgICB+IiAgIn5C/////weDICN+ICB8Qh+IpyIRIBEgDGsiESARQQBIGyEmQQIgBXQhESAFQQFqIQUgESAaTQ0ACwsgCiANIAkgH0GEi4GAAGooAgAgDCAhEJKAgIAAQQAhJgJAIBdFDQAgBiEFIBAhEQNAIBEgBSgCACIfQR91IAxxIB9qNgIAIBFBBGogBUEEaigCACIfQR91IAxxIB9qNgIAIAVBCGohBSARQQhqIREgFiAmQQJqIiZHDQALCwJAAkAgCUUNAEEBISggCyEpA0AgKSIqQQF2ISkCQCAoRQ0AICpBAkkNACApQQEgKUEBSxshKyApQQJ0ISxBACEtQQAhLgNAIBAgLUECdGohBSAKIC4gKGpBAnRqNQIAIScgKyERA0AgBSAFICxqIiY1AgAgJ34iICAifkL/////B4MgI34gIHxCH4inIh8gHyAMayIfIB9BAEgbIh8gBSgCACIvaiIwIDAgDGsiMCAwQQBIGzYCACAmIC8gH2siH0EfdSAMcSAfajYCACAFQQRqIQUgEUF/aiIRDQALIC0gKmohLSAuQQFqIi4gKEcNAAsLIChBAXQiKCALSQ0ADAILCyAQICZBAnQiBWogBiAFaigCACIFQR91IAxxIAVqNgIACyAOIB5BAnRqITEgJK0hMgJAAkAgBEUNAEEAISwgHCEfIDEhLyADITADQCAfIQUgBCEmQQAhEQNAIBGtIDJ+IiAgIn5C/////weDICN+ICB8Qh+IpyIRIBEgDGsiESARQQBIGyAFKAIAIhEgESAMayIRIBFBAEgbaiIRIBEgDGsiESARQQBIGyERIAVBfGohBSAmQX9qIiYNAAsgLyARICVBACAwIBtqKAIAQR52a3FrIgVBH3UgDHEgBWo2AgAgHyATaiEfIC8gEmohLyAwIBNqITAgLEEBaiIsIAtHDQAMAgsLIDEhBQJAIBdBB0kNACAUIQUgHSERA0AgESImQQA2AgAgJiAYaiIRQQA2AgAgESAYaiIRQQA2AgAgESAYaiIRQQA2AgAgESAYaiIRQQA2AgAgESAYaiIRQQA2AgAgESAYaiIRQQA2AgAgESAYaiIRQQA2AgAgESAYaiERIAVBeGoiBQ0ACyAmIBlqIQULIAlBAksNACAVIREDQCAFQQA2AgAgBSAYaiEFIBFBf2oiEQ0ACwsCQCAJRQ0AQQEhKCALISkDQCApIgVBAXYhKQJAIChFDQAgBUECSQ0AIClBASApQQFLGyEqIBIgBWwhKyASIClsISxBACEtIB0hLgNAIAogLSAoakECdGo1AgAhJyAqIREgLiEFA0AgBSAFICxqIiY1AgAgJ34iICAifkL/////B4MgI34gIHxCH4inIh8gHyAMayIfIB9BAEgbIh8gBSgCACIvaiIwIDAgDGsiMCAwQQBIGzYCACAmIC8gH2siH0EfdSAMcSAfajYCACAFIBhqIQUgEUF/aiIRDQALIC4gK2ohLiAtQQFqIi0gKEcNAAsLIChBAXQiKCALSQ0ACwsgHSEFIBAhESALISYDQCAFIAU1AgAgETUCAH4iICAifkL/////B4MgI34gIHxCH4inIh8gHyAMayIfIB9BAEgbrSAyfiIgICJ+Qv////8HgyAjfiAgfEIfiKciHyAfIAxrIh8gH0EASBs2AgAgBSAYaiEFIBFBBGohESAmQX9qIiYNAAsgMSAPIA0gCSAMICEQk4CAgAAgHUEEaiEdIB4gBEYhDCAeQQFqIR4gDEUNAAsgDiAPIA8gC0EBIBAQkICAgAACQCAHIAFPDQBBHyAIayEYIAJBAnQhKCABIAdrIS0gBEECdCIKQQRqISogACAHQQJ0aiEwQQAhLgNAQQAgDiAKaigCAEEedmtBAXYhLEEAIQxBACERQQAhJkEAIR8DQCAsIQUCQCARIA9PDQAgDiAMaigCACEFCyAwIAxqIi8gLygCACAFIAh0Qf////8HcSAmcmsgH2oiJkH/////B3E2AgAgJkEfdSEfIAxBBGohDCAFIBh2ISYgLSARQQFqIhFHDQALIDAgKGohMCAOICpqIQ4gLkEBaiIuIAtHDQAMAgsLAkAgF0EHSQ0AIBRBeGoiBUEDdkEBaiIRQQdxIQwCQCAFQThJDQAgEUH4////A3EhBQNAIAVBeGoiBQ0ACwsgDEUNAANAIAxBf2oiDA0ACwsgCUECSw0AA0AgFUF/aiIVDQALCwuXBQIPfwJ+QQEgCXQhCgJAAkAgBA0AIApBB3EhCyAKQXhqIgFBA3ZBAWoiDEEHcSEIIAxB+P///wNxIQ1BACEFIAFBOEkhDiAJQQJLIQQDQAJAAkAgCUEDSQ0AIAxBB3EhDwJAIA4NACANIQEDQCABQXhqIgENAAsLAkAgD0UNACAIIQEDQCABQX9qIgENAAsLIAQNAQsgCyEBA0AgAUF/aiIBDQALCyAFQQFqIgUgCkcNAAwCCwsCQCAHIAFPDQBBHyAIayENIApBf2ohECAFQQJ0IREgASAHayESIARBf2pBAnQhE0EAIRQDQCAAIBQgAmxBAnRqIRVBACAGIBRBAnRqKAIAayEWIAMhF0EAIRgDQCAVIAdBAnRqIQxBACEBQQAgFyATaigCAEEedmtBAXYhDiAWrCEZQgAhGkEAIQVBACEPA0AgDiEJAkAgBSAETw0AIBcgAWooAgAhCQsgDCABaiILIBrEIAs1AgB8IAkgCHRB/////wdxIA9yrSAZfnwiGqdB/////wdxNgIAIBpCH4ghGiABQQRqIQEgCSANdiEPIBIgBUEBaiIFRw0ACyAAIBUgAkECdGogGCAUaiAQRiIBGyEVQQAgFmsgFiABGyEWIBcgEWohFyAYQQFqIhggCkcNAAsgFEEBaiIUIApHDQAMAgsLIApBB3EhCyAKQXhqIgFBA3ZBAWoiDEEHcSEIIAxB+P///wNxIQ1BACEFIAFBOEkhDiAJQQJLIQQDQAJAAkAgCUEDSQ0AIAxBB3EhDwJAIA4NACANIQEDQCABQXhqIgENAAsLAkAgD0UNACAIIQEDQCABQX9qIgENAAsLIAQNAQsgCyEBA0AgAUF/aiIBDQALCyAFQQFqIgUgCkcNAAsLC5cCAQh/IAAoAsgBIQMDQAJAIANBiAFHDQAgABCZgICAAEEAIQMLIAIgAkGIASADayIEIAQgAksbIgVrIQICQCAFRQ0AIAVBA3EhBkEAIQQCQCAFQX9qQQNJDQAgACADaiEHIAVBfHEhCEEAIQQDQCABIARqIgkgByAEaiIKLQAAOgAAIAlBAWogCkEBai0AADoAACAJQQJqIApBAmotAAA6AAAgCUEDaiAKQQNqLQAAOgAAIAggBEEEaiIERw0ACwsgBkUNACABIARqIQkgACADIARqaiEEA0AgCSAELQAAOgAAIARBAWohBCAJQQFqIQkgBkF/aiIGDQALCyABIAVqIQEgBSADaiEDIAINAAsgACADrTcDyAELoggDAX8BfiB/I4CAgIAAQcAAayEBIABBuARqKQMAIQJBACEDA0AgAUKy2ojLx66ZkOsANwMIIAFC5fDBi+aNmZAzNwMAQQAhBANAIAEgBGpBEGogACAEakGIBGooAAA2AgAgBEEEaiIEQTBHDQALIAEoAjggAqciBXMhBiABKAI8IAJCIIinIgdzIQhBCiEJIAEoAiwhCiABKAIMIQsgASgCHCEEIAEoAighDCABKAIIIQ0gASgCGCEOIAEoAiQhDyABKAI0IRAgASgCBCERIAEoAhQhEiABKAIgIRMgASgCMCEUIAEoAgAhFSABKAIQIRYDQCAKIAggCyAEaiILc0EQdyIIaiIKIARzQQx3IgQgC2oiFyATIBQgFSAWaiILc0EQdyIUaiITIBZzQQx3IhYgC2oiFSAUc0EIdyIUIBNqIhMgFnNBB3ciFmoiCyAMIAYgDSAOaiINc0EQdyIGaiIMIA5zQQx3Ig4gDWoiDSAGc0EIdyIYc0EQdyIGIA8gECARIBJqIhFzQRB3IhBqIg8gEnNBDHciEiARaiIRIBBzQQh3IhAgD2oiGWoiDyAWc0EMdyIWIAtqIgsgBnNBCHciBiAPaiIPIBZzQQd3IRYgFyAIc0EIdyIIIApqIgogBHNBB3ciBCANaiINIBBzQRB3IhAgE2oiEyAEc0EMdyIEIA1qIg0gEHNBCHciECATaiITIARzQQd3IQQgCiAYIAxqIgwgDnNBB3ciDiARaiIRIBRzQRB3IhRqIgogDnNBDHciDiARaiIRIBRzQQh3IhQgCmoiCiAOc0EHdyEOIAggGSASc0EHdyISIBVqIhVzQRB3IgggDGoiDCASc0EMdyISIBVqIhUgCHNBCHciCCAMaiIMIBJzQQd3IRIgCUF/aiIJDQALIAAoArQEIRcgACgCsAQhGCAAKAKsBCEZIAAoAqgEIRogACgCpAQhGyAAKAKgBCEcIAAoApwEIR0gACgCmAQhHiAAKAKUBCEfIAAoApAEISAgACgCjAQhISAAKAKIBCEiIAAgA0ECdGoiCSAVQeXwwYsGajYCACAJQSBqIBFB7siBmQNqNgIAIAlBwABqIA1BstqIywdqNgIAIAlB4ABqIAtB9MqB2QZqNgIAIAlBgAFqIBYgImo2AgAgCUGgAWogEiAhajYCACAJQcABaiAOICBqNgIAIAlB4AFqIAQgH2o2AgAgCUGAAmogEyAeajYCACAJQaACaiAPIB1qNgIAIAlBwAJqIAwgHGo2AgAgCUHgAmogCiAbajYCACAJQYADaiAUIBpqNgIAIAlBoANqIBAgGWo2AgAgCUHAA2ogBiAYIAVzajYCACAJQeADaiAIIBcgB3NqNgIAIAJCAXwhAiADQQFqIgNBCEcNAAsgAEEANgKABCAAIAI3A7gEC+4BAQh/IAAoAsgBIQMCQCACRQ0AA0ACQCACQYgBIANrIgQgBCACSxsiBUUNAEEAIQQCQCAFQQFGDQAgBUEBcSEGIAAgA2ohByAFQX5xIQhBACEEA0AgByAEaiIJIAktAAAgASAEaiIKLQAAczoAACAJQQFqIgkgCS0AACAKQQFqLQAAczoAACAIIARBAmoiBEcNAAsgBkUNAQsgACAEIANqaiIJIAktAAAgASAEai0AAHM6AAALIAIgBWshAgJAIAUgA2oiA0GIAUcNACAAEJmAgIAAQQAhAwsgASAFaiEBIAINAAsLIAAgA603A8gBC7gMAxl+An8YfiAAKQOgAUJ/hSEBIAApA4gBQn+FIQIgACkDYEJ/hSEDIAApA0BCf4UhBCAAKQMQQn+FIQUgACkDCEJ/hSEGIAApA7gBIQcgACkDkAEhCCAAKQNoIQkgACkDGCEKIAApA3ghCyAAKQNQIQwgACkDKCENIAApAwAhDiAAKQOwASEPIAApAzghECAAKQPAASERIAApA5gBIRIgACkDcCETIAApA0ghFCAAKQMgIRUgACkDqAEhFiAAKQOAASEXIAApA1ghGCAAKQMwIRlBfiEaQcDNgYAAIRsDQCAWIBcgGIWFIBkgBoWFIhwgByAIIAmFhSIdIAQgCoUiHoVCAYmFIh8gBYVCPokiICALIAyFIAGFIiEgDyACIAOFhSIiIBAgBYUiI4VCAYmFIA0gDoUiJIUiJSAWhUICiSIWhCALIBIgE4UgEYUiJiAcQgGJhSAUIBWFIieFIgWFQimJIhyFIiggHSAhICSFQgGJhSAehSILIBWFQhuJIh0gByAiICYgJ4VCAYmFICOFIhWFQjiJIgeDIB8gAoVCD4kiHkJ/hSIhhSIiICUgBoVCAYkiAiABIAWFQhKJIgGEIAsgEoVCCIkiI0J/hSIkhSImhYUgHyAPhUI9iSIGIAogFYVCHIkiCoQgJSAXhUItiSIPhSInIAsgEYVCDokiESAOIAWFIg6EIAggFYVCFYkiCIUiKYWFIiogHyAQhUIGiSIQIAkgFYVCGYkiCYQgAoUiKyAdICUgGIVCCokiEiANIAWFQiSJIg2DhSIYhSAgIAsgE4VCJ4kiEyAEIBWFQjeJIgRCf4UiLIOFIi2FIi4gGykDACAfIAOFQiuJIhUgJSAZhUIsiSIlhCAOhYUiAyALIBSFQhSJIgsgDCAFhUIDiSIFhCAKhSIMhSIvhUIBiYUiHyAQIAKDIAGFIgKFQieJIhcgICAEgyAWhSIwIAYgCyAKg4UiCiARICUgDoOFIgSFhSACIB0gDYQgB4UiFIWFIgIgCCAVQn+FhCAlhSIxIAsgDyAFg4UiMoUgHiAShCANhSIzIBAgIyAJg4UiI4WFIBMgHIQgLIUiLIUiC0IBiYUiJSAYhUIpiSIOhCAPIAZCf4WEIAWFIgYgFSARIAiDhSIRhSAHICGEIBKFIgcgASAkgyAJhSIBhYUgEyAWIByDhSINhSIPIAJCAYmFIgUgJ4VCN4kiE0J/hSIkhSEWIB8gBIVCG4kiFSAlIAyFQiSJIgmEIAUgKIVCOIkiAoUhEiAVIAKDIAsgKkIBiYUiCyAHhUIPiSInQn+FIgyFIQggHyAUhUIIiSIoIAUgJoVCGYkiBIMgCyAGhUIGiSIQhSEYIB8gCoVCFIkiGSAFICmFQhyJIgaDIAsgDYVCPYkiIIUhFCAZICUgK4VCA4kiHIQgBoUhDSAfIDCFQg6JIh0gAyAlhSIehCAFICKFQhWJIgeFIQogHSAHgyALIAGFQiuJIiGFIQUgLiAPQgGJhSAvhSIfICyFQgKJIg8gEyALIBGFQj6JIguDhSERIBcgJIMgC4UhASAfICOFQgqJIhMgAiAMhIUhAiAlIC2FQhKJIiUgKEJ/hSIkgyAEhSEDIB8gMYVCAYkiIiAEIBCEhSEMIB8gM4VCLYkiIyAGICCEhSEEIB8gMoVCLIkiHyAHICFCf4WEhSEGIA8gC4QgDoUhByAXIA8gDoOFIQ8gEyAnhCAJhSEXIBUgEyAJg4UhCyAiIBCDICWFIRMgIiAlhCAkhSEJICMgIEJ/hYQgHIUhECAZICMgHIOFIRkgHSAfIB6DhSEVIBtBCGopAwAgHyAhhCAehYUhDiAbQRBqIRsgGkECaiIaQRZJDQALIAAgFjcDqAEgACAXNwOAASAAIBg3A1ggACAZNwMwIAAgETcDwAEgACASNwOYASAAIBM3A3AgACAUNwNIIAAgFTcDICAAIA83A7ABIAAgEDcDOCAAIAs3A3ggACAMNwNQIAAgDTcDKCAAIA43AwAgACAHNwO4ASAAIAg3A5ABIAAgCTcDaCAAIAo3AxggACABQn+FNwOgASAAIAJCf4U3A4gBIAAgA0J/hTcDYCAAIARCf4U3A0AgACAFQn+FNwMQIAAgBkJ/hTcDCAu2BgUCfAJ+AXwIfwJ+IAArA5AGIQMgAiACoiEEAkACQCABmUQAAAAAAADgQ2NFDQAgAbAhBQwBC0KAgICAgICAgIB/IQULIAMgAqIhAyAERAAAAAAAAOA/oiEEIAUgBbkgAWStfSIGxLkgAaEhBwNAAkAgACgCgAQiCEH3A0kNACAAEJeAgIAAQQAhCAsgACAIQQlqIgk2AoAEIAAgCGoiCkEIai0AAEEQdCAKKQMAIgVCMIinciELIAWnQf///wdxIQwgBUIYiKdB////B3EhDUEAIQ5BfSEPQYDPgYAAIQoDQCALIAooAgBrIA0gCkEEaigCAGsgDCAKQQhqKAIAa0EfdWpBH3VqQR92IA5qIQ4gCkEMaiEKIA9BA2oiD0EzSQ0ACyAAIAhBCmoiCjYCgAQgACAJai0AACEPAkAgCkGABEcNACAAEJeAgIAACwJAAkAgBCAHIA9BAXEiCkEBdEF/aiAObCAKaiIPt6AiASABoqIgDiAObLhEwruDwYtPw7+ioCIBRP6CK2VHFfc/oiICmUQAAAAAAADgQ2NFDQAgArAhBQwBC0KAgICAgICAgIB/IQULAkACQCADRAAAAAAAAPA/IAEgBcS5RO85+v5CLua/oqAiAUTS///////vPyABRK0AAAAAAOA/IAFE/4FVVVVVxT8gAUQ8HFRVVVWlPyABRP1m4BAREYE/IAFE9YctGGzBVj8gAUSPW95zoAEqPyABRIjw7bGeAfo+IAFExEXgnZMdxz4gAUQ1UKD45X6SPiABIAFEJ82NDkbQIb6iRAAwA35GKls+oKKhoqGioaKhoqGioaKhoqGioaKhoqGiRAAAAAAAAOBDoiIBRAAAAAAAAPBDYyABRAAAAAAAAAAAZnFFDQAgAbEhEAwBC0IAIRALIBBCAYZCf3wgBUL/////D4NCPyAFp0FAakEASBuIIRFCwAAhBQNAIAAgACgCgAQiCkEBaiIONgKABCAFQnh8IRAgACAKai0AACEKAkAgDkGABEcNACAAEJeAgIAACwJAIAogESAQiKdB/wFxayIODQAgBUIIViEKIBAhBSAKDQELCyAOQX9KDQALIA8gBqdqC5AMBwF8CX8EfAF/AXwIfwF8AkACQCAHDQAgASAAIAErAwAgAysDAJ8gBkEDdEHA0YGAAGorAwCiIgkQmoCAgAC3OQMAIAIgACACKwMAIAkQmoCAgAC3OQMADAELIANBASAHdCIKQQF2IgtBA3QiDGohDSAEIAxqIQ4gBSAMaiEPQQAhDCALQQEgC0EBSxsiECERA0AgBCAMaiISIBIrAwAiCSADIAxqKwMAIhNEAAAAAAAA8D8gEyAToiANIAxqKwMAIhQgFKKgoyIVoiIWoiAOIAxqIhIrAwAiEyAVIBSaoiIVoqEiFDkDACAPIAxqIhcrAwAhGCAFIAxqIhkgGSsDACAJIBSiIBMgCSAVoiATIBaioCIVoqChOQMAIBIgFZo5AwAgFyAYIAkgFaIgEyAUoqGhOQMAIAxBCGohDCARQX9qIhENAAsgCCAIIAtBA3RqIhcgAyAHEI2AgIAAAkACQCAKQQN0IhFFDQBBACEMA0AgAyAMaiAIIAxqKAAANgAAIBEgDEEEaiIMRw0ACyAIIBcgBSAHEI2AgIAAQQAhDANAIAUgDGogCCAMaigAADYAACARIAxBBGoiDEcNAAtBACEMA0AgCCAMaiAEIAxqKAAANgAAIBEgDEEEaiIMRw0ADAILCyAIIBcgBSAHEI2AgIAACwJAAkAgC0EDdCISRQ0AQQAhDANAIAQgDGogAyAMaigAADYAACASIAxBBGoiDEcNAAsgBCALQQN0aiEZQQAhDANAIBkgDGogBSAMaigAADYAACASIAxBBGoiDEcNAAwCCwsgBCASaiEZCyAIIApBA3QiDWoiGiAaIAtBA3QiDGoiEiACIAcQjYCAgAAgACAaIBIgBSAFIAxqIBkgBiAHQX9qIhsgGiANahCbgICAACAIIApBBHQiBWoiHCAaKQMANwMAIBwgDGogEikDADcDACAKQQJ2IR0CQCAHQQJJDQAgBSAMaiESIBEgHUEDdGoiGSAMaiENIB1BASAdQQFLGyEeIBEgDGohDiALQQR0QbCIgIAAaiEMIBEhDwNAIAggBWoiHyAIIA9qKwMAIgkgCCAOaisDACITIAwrAwAiFKIgCCANaisDACIVIAxBCGorAwAiFqKhIhigOQMAIAggEmoiICAIIBlqKwMAIiEgFSAUoiATIBaioCIToDkDACAfQQhqIAkgGKE5AwAgIEEIaiAhIBOhOQMAIBlBCGohGSANQQhqIQ0gDkEIaiEOIAxBEGohDCASQRBqIRIgBUEQaiEFIA9BCGohDyAeQX9qIh4NAAsLAkAgEUUNAEEAIQwDQCAaIAxqIAIgDGooAAA2AAAgESAMQQRqIgxHDQALCyAaIQwgHCEFQQEhEgNAIAwgDCsDACAFKwMAoTkDACAMQQhqIQwgBUEIaiEFIBIgB3YhGSASQQFqIRIgGUUNAAsCQCARRQ0AQQAhDANAIAIgDGogHCAMaigAADYAACARIAxBBGoiDEcNAAsLIAtBA3QiBSAKQQN0IhJqIRkgCCEMA0AgDCAMKwMAIgkgDCASaisDACIToiAMIAVqIhErAwAiFCAMIBlqKwMAIhWioTkDACARIBQgE6IgCSAVoqA5AwAgDEEIaiEMIBBBf2oiEA0AC0EAIQxBASERA0AgASAMaiIFIAUrAwAgCCAMaisDAKA5AwAgDEEIaiEMIBEgB3YhBSARQQFqIREgBUUNAAsgCCAXIAEgBxCNgICAACAAIAggFyADIAMgC0EDdCIMaiAEIAYgGyAaEJuAgIAAIAEgCCkDADcDACABIAxqIgQgFykDADcDACAHQQJJDQAgHUEBIB1BAUsbIREgHUEDdCEFIAtBBHRBsIiAgABqIQdBACEMA0AgASAMaiISIAgrAwAiCSAXKwMAIhMgByAMaiIDKwMAIhSiIBcgBWorAwAiFSADQQhqKwMAIhaioSIYoDkDACAEIAxqIgMgCCAFaisDACIhIBUgFKIgEyAWoqAiE6A5AwAgEkEIaiAJIBihOQMAIANBCGogISAToTkDACAIQQhqIQggF0EIaiEXIAxBEGohDCARQX9qIhENAAsLC7IEARB/AkACQCABRQ0AQQEhAkEBIAF0IgMhBAJAA0AgBEEBTQ0BIAJBAXQhBSAEQQF2IgZBASAGQQFLGyEHIAJBAnQhCEEAIQkgACEKQQAhCwNAAkAgCyALIAJqTw0AIAkgBmpBAXRBoOKBgABqLwEAIQwgCiEBIAIhDQNAIAEgASAFaiIOLwEAIg8gAS8BACIQaiIRIBFB/58DaiARQYHgAEkbOwEAIA4gECAPayIRQR91QYHgAHEgEWogDGwiEUH/3wBsQf//A3FBgeAAbCARaiIRQRB2Ig8gD0H/nwNqIBFBgICEgANJGzsBACABQQJqIQEgDUF/aiINDQALCyAKIAhqIQogCyAFaiELIAlBAWoiCSAHRw0ACyAEQQRJIQEgBSECIAYhBCABRQ0ACwtB+x8hASADIREDQEEAIAFBAXFrQYHgAHEgAWpBAXYhASARQQNLIQ0gEUEBdiERIA0NAAsgA0F+cSERA0AgACABIAAvAQBsIg1B/98AbEH//wNxQYHgAGwgDWoiDUEQdiIOIA5B/58DaiANQYCAhIADSRs7AQAgAEECaiINIAEgDS8BAGwiDUH/3wBsQf//A3FBgeAAbCANaiINQRB2Ig4gDkH/nwNqIA1BgICEgANJGzsBACAAQQRqIQAgEUF+aiIRDQAMAgsLIAAgAC8BACIBQYWA/BdsQf//A3FBgeAAbCABQfsfbGoiAUEQdiIRIBFB/58DaiABQYCAhIADSRs7AQALC9IHAQR/IAFBuKqVwABsQfj/A3FBgeAAbCABQcjVAGxqIgFBEHYiAiACQf+ff2ogAUGAgISAA0kbIgEgAWwiAkH/3wBsQf//A3FBgeAAbCACaiICQRB2IgMgA0H/n39qIAJBgICEgANJGyICIAFsIgNB/98AbEH//wNxQYHgAGwgA2oiA0EQdiIEIARB/59/aiADQYCAhIADSRsiAyACbCICQf/fAGxB//8DcUGB4ABsIAJqIgJBEHYiBCAEQf+ff2ogAkGAgISAA0kbIgIgAmwiAkH/3wBsQf//A3FBgeAAbCACaiICQRB2IgQgBEH/n39qIAJBgICEgANJGyICIAJsIgJB/98AbEH//wNxQYHgAGwgAmoiAkEQdiIEIARB/59/aiACQYCAhIADSRsiAiACbCICQf/fAGxB//8DcUGB4ABsIAJqIgJBEHYiBCAEQf+ff2ogAkGAgISAA0kbIgIgAmwiAkH/3wBsQf//A3FBgeAAbCACaiICQRB2IgQgBEH/n39qIAJBgICEgANJGyICIAJsIgJB/98AbEH//wNxQYHgAGwgAmoiAkEQdiIEIARB/59/aiACQYCAhIADSRsiAiADbCIDQf/fAGxB//8DcUGB4ABsIANqIgNBEHYiBCAEQf+ff2ogA0GAgISAA0kbIgMgAmwiAkH/3wBsQf//A3FBgeAAbCACaiICQRB2IgQgBEH/n39qIAJBgICEgANJGyICIAJsIgRB/98AbEH//wNxQYHgAGwgBGoiBEEQdiIFIAVB/59/aiAEQYCAhIADSRsiBCAEbCIEQf/fAGxB//8DcUGB4ABsIARqIgRBEHYiBSAFQf+ff2ogBEGAgISAA0kbIANsIgNB/98AbEH//wNxQYHgAGwgA2oiA0EQdiIEIARB/59/aiADQYCAhIADSRsiAyADbCIDQf/fAGxB//8DcUGB4ABsIANqIgNBEHYiBCAEQf+ff2ogA0GAgISAA0kbIgMgA2wiA0H/3wBsQf//A3FBgeAAbCADaiIDQRB2IgQgBEH/n39qIANBgICEgANJGyACbCICQf/fAGxB//8DcUGB4ABsIAJqIgJBEHYiAyADQf+ff2ogAkGAgISAA0kbIgIgAmwiAkH/3wBsQf//A3FBgeAAbCACaiICQRB2IgMgA0H/n39qIAJBgICEgANJGyABbCIBQf/fAGxB//8DcUGB4ABsIAFqIgFBEHYiAiACQf+ff2ogAUGAgISAA0kbIABsIgFB/98AbEH//wNxQYHgAGwgAWoiAUEQdiICIAJB/59/aiABQYCAhIADSRsLpQEBAn8jgICAgABBgAJrIgIkgICAgAAgAkHQAWpCMBCBgICAACACQgA3A8gBQQAhAwNAIAIgA2pCADcDACADQQhqIgNByAFHDQALIAIgAkHQAWpBMBCYgICAACACIAIoAsgBaiIDIAMtAABBH3M6AAAgAkKIATcDyAEgAiACLQCHAUGAAXM6AIcBIAIgASAAEIiAgIAAIQMgAkGAAmokgICAgAAgAwuTAQECfyOAgICAAEHQAWsiAySAgICAACADQgA3A8gBQQAhBANAIAMgBGpCADcDACAEQQhqIgRByAFHDQALIAMgAkEwEJiAgIAAIAMgAygCyAFqIgQgBC0AAEEfczoAACADQogBNwPIASADIAMtAIcBQYABczoAhwEgAyABIAAQiICAgAAhBCADQdABaiSAgICAACAECwUAQYEHCwQAQTALq0YFKn8BfgJ/BHwEfiOAgICAAEHgC2siBCSAgICAACAEQgA3A8gDQQAhBQNAIARBgAJqIAVqQgA3AwAgBUEIaiIFQcgBRw0ACyAEQYACaiADQYEKEJiAgIAAIARBgAJqIAEgAhCYgICAACAEQYACaiAEKALIA2oiBSAFLQAAQR9zOgAAIARCiAE3A8gDIAQgBC0AhwNBgAFzOgCHAyAEQYACaiAEQTAQloCAgAAgBEIANwP4AUEAIQUDQCAEQTBqIAVqQgA3AwAgBUEIaiIFQcgBRw0ACyAEQTBqIARBMBCYgICAACAEQTBqIAQoAvgBaiIFIAUtAABBH3M6AAAgBEKIATcD+AEgBCAELQC3AUGAAXM6ALcBIARBMGogBEHQA2pBKBCWgICAACAEQgA3A8AFQQAhBQNAIARB+ANqIAVqQgA3AwAgBUEIaiIFQcgBRw0ACyAEQfgDaiAEQdADakEoEJiAgIAAIARB+ANqIAEgAhCYgICAAAJAAkAgAy0AACIFQfABcUHQAEYNAEF9IQIMAQsCQCAFQQ9xIgZBdWpBeU8NAEF9IQIMAQtBfiECAkBBCiAGQQF2ayAGQX5qdEEBIAZ0IgdqQYAKRg0AQX0hAgwBC0HOACAGdEGAuAJLDQACQCAGQYiJgYAAai0AACIIIAZ0IglBgNAATQ0AQX0hAgwBCyAHIAdqIAdqIAdqQbDywYAAaiIKIAdBAXRqIgVBCCAFQQdxIgVrQQAgBRsiC2ohDCAJQQdqQQN2IQ1BACAIayEOQX8gCHRBf3MhD0EAQQEgCEF/anQiEGshEUEAIQEgAyESQQAhE0EAIQUDQCATQQh0IBItAAFyIRMCQCABQQhqIgEgCEkNACAFIAdPDQADQAJAIBMgDiABaiIUdiAPcSIVQQAgFSAQcWtyIhUgEUcNAEF9IQIMBAsgASAIayEBIAVBsPLBgABqIBU6AAAgBUEBaiEFIBQgCEkNASAFIAdJDQALCyASQQFqIRIgBSAHSQ0ACwJAIBNBfyABdEF/c3FFDQBBfSECDAELAkAgCQ0AQX0hAgwBCwJAIA1BgAogDWtNDQBBfSECDAELIAdBsPLBgABqIRJBACAIayEOIAMgDUEBaiIWaiEJQQAhAUEAIRNBACEFA0AgE0EIdCAJLQAAciETAkAgAUEIaiIBIAhJDQAgBSAHTw0AA0ACQCATIA4gAWoiFHYgD3EiFUEAIBUgEHFrciIVIBFHDQBBfSECDAQLIAEgCGshASASIAVqIBU6AAAgBUEBaiEFIBQgCEkNASAFIAdJDQALCyAJQQFqIQkgBSAHSQ0ACwJAIBNBfyABdEF/c3FFDQBBfSECDAELAkAgBkGTiYGAAGotAAAiASAGdEEHakEDdiIXQYEKIA0gFmoiCWtNDQBBfSECDAELQQAgAWshEyADIAlqIRIgB0EBdEGw8sGAAGohDkF/IAF0QX9zIQ9BAEEBIAFBf2p0IhBrIRFBACEDQQAhFEEAIQUDQCAUQQh0IBItAAByIRQCQCADQQhqIgMgAUkNACAFIAdPDQADQAJAIBQgEyADaiIVdiAPcSIIQQAgCCAQcWtyIgggEUcNAEF9IQIMBAsgAyABayEDIA4gBWogCDoAACAFQQFqIQUgFSABSQ0BIAUgB0kNAAsLIBJBAWohEiAFIAdJDQALAkBBACAXIBRBfyADdEF/c3EbIgUNAEF9IQIMAQsCQCAFIAlqQYEKRg0AQX0hAgwBCyAHQQF0IgVBsPLBgABqIRUgDCAFaiEYIAsgB0EGbGpBsPLBgABqIQMgCyAHQQN0akGw8sGAAGohAUEAIQUDQCADIAcgBWpBsPLBgABqLAAAIghBD3ZBgeAAcSAIajsBACABIBUgBWosAAAiCEEPdkGB4ABxIAhqOwEAIANBAmohAyABQQJqIQEgByAFQQFqIgVHDQALAkAgBkUNACALIAdBBmxqQbDywYAAaiEXIAchDUEBIRIDQCANQQF2IQkCQCASRQ0AIA1BAXQhFiAJQQF0IQ9BACERIBchDkEAIRADQAJAIBAgECAJak8NACARIBJqQQF0QaDSgYAAai8BACETIA4hBSAJIQEDQCAFIAUgD2oiCC8BACATbCIDQf/fAGxB//8DcUGB4ABsIANqIgNBEHYiFSAVQf+ff2ogA0GAgISAA0kbIhUgBS8BACIUaiIDIANB/58DaiADQYHgAEgbOwEAIAggFCAVayIDQR91QYHgAHEgA2o7AQAgBUECaiEFIAFBf2oiAQ0ACwsgDiAWaiEOIBAgDWohECARQQFqIhEgEkcNAAsLIAkhDSASQQF0IhIgB0kNAAsgCyAHQQN0akGw8sGAAGohFyAHIQ1BASESA0AgDUEBdiEJAkAgEkUNACANQQF0IRYgCUEBdCEPQQAhESAXIQ5BACEQA0ACQCAQIBAgCWpPDQAgESASakEBdEGg0oGAAGovAQAhEyAOIQUgCSEBA0AgBSAFIA9qIggvAQAgE2wiA0H/3wBsQf//A3FBgeAAbCADaiIDQRB2IhUgFUH/n39qIANBgICEgANJGyIVIAUvAQAiFGoiAyADQf+fA2ogA0GB4ABIGzsBACAIIBQgFWsiA0EfdUGB4ABxIANqOwEAIAVBAmohBSABQX9qIgENAAsLIA4gFmohDiAQIA1qIRAgEUEBaiIRIBJHDQALCyAJIQ0gEkEBdCISIAdJDQALCyALIAdBBmxqQbDywYAAaiEFQQEhAwNAIAUgBS8BACIBQbiqlcAAbEH4/wNxQYHgAGwgAUHI1QBsaiIBQRB2IgggCEH/nwNqIAFBgICEgANJGzsBACAFQQJqIQUgAyAGdiEBIANBAWohAyABRQ0ACyALIAdBBmxqQbDywYAAaiEFIAsgB0EDdGpBsPLBgABqIQNBASEBA0AgBSADLwEAIAUvAQBsIghB/98AbEH//wNxQYHgAGwgCGoiCEEQdiIVIBVB/58DaiAIQYCAhIADSRs7AQAgBUECaiEFIANBAmohAyABIAZ2IQggAUEBaiEBIAhFDQALAkACQCAGRQ0AIAdB/v8DcSEIIAsgB0EDdGpBsPLBgABqIQVBACEDA0AgBSADQbDywYAAaiwAACIBQQ92QYHgAHEgAWo7AQAgBUECaiADQbHywYAAaiwAACIBQQ92QYHgAHEgAWo7AQAgBUEEaiEFIAggA0ECaiIDRw0ADAILCyAYQQAsALDywYAAIgVBD3ZBgeAAcSAFajsBAAsCQCAGRQ0AIAsgB0EDdGpBsPLBgABqIRcgByENQQEhEgNAIA1BAXYhCQJAIBJFDQAgDUEBdCEWIAlBAXQhD0EAIREgFyEOQQAhEANAAkAgECAQIAlqTw0AIBEgEmpBAXRBoNKBgABqLwEAIRMgDiEFIAkhAQNAIAUgBSAPaiIILwEAIBNsIgNB/98AbEH//wNxQYHgAGwgA2oiA0EQdiIVIBVB/59/aiADQYCAhIADSRsiFSAFLwEAIhRqIgMgA0H/nwNqIANBgeAASBs7AQAgCCAUIBVrIgNBH3VBgeAAcSADajsBACAFQQJqIQUgAUF/aiIBDQALCyAOIBZqIQ4gECANaiEQIBFBAWoiESASRw0ACwsgCSENIBJBAXQiEiAHSQ0ACwsgCyAHQQN0akGw8sGAAGohAyALIAdBBmxqQbDywYAAaiEFIAchAQNAAkAgAy8BACIIDQBBfSECDAILIAUgBS8BACAIEJ2AgIAAOwEAIANBAmohAyAFQQJqIQUgAUF/aiIBDQALIAwgBhCcgICAACAHQQNsQbDywYAAaiEIIAsgB0EGbGpBsPLBgABqIQVBACEDA0ACQEEAQf+ffyAFLwEAIgFBgDBJGyABaiIBQYB/akGBfk8NAEF9IQIMAgsgCCADaiABOgAAIAVBAmohBSAHIANBAWoiA0cNAAsgBEH4A2ogBCgCwAVqIgUgBS0AAEEfczoAACAEQogBNwPABSAEIAQtAP8EQYABczoA/wQgBkEwciEZIAchBSAKIQMDQCAEQfgDaiAEQcgFakECEJaAgIAAAkAgBC0AyAVBCHQgBC0AyQVyIgFBhOADSw0AIAMgAUGB4ABwOwEAIAVBf2ohBSADQQJqIQMLIAUNAAsgB0EBdiIaQQEgGkEBSxsiG0H+/wFxIRwgG0EBcSEdIAwgB0EDdCIDaiIeIANqIh8gA2oiICADaiIhIANqISIgB0H8/wNxISMgB0EDcSEkIAdBBHQhJSAAQSlqISYgB0ECdCInQbDywYAAaiEoIBpBA3QhBSAHQQNsQbDywYAAaiEXIAdBAXRBsPLBgABqIRggJ0EEaiEpICdBBmohKiALIAdBPmxqQbDywYAAaiESIAsgB0E2bGpBsPLBgABqIQ8gCyAHQS5saiIrQbDywYAAaiEBIAsgB0EmbGpBsPLBgABqIQggCyAHQRZsakGw8sGAAGohLCALIAdBHmxqQbDywYAAaiEOIAsgB0EGbGpBsPLBgABqIS0gCyAHQQ5sakGw8sGAAGohESAGQQN0QeDQgYAAaikDACEuIARB0AlqIS8gBkECdEGAiICAAGooAgAhMANAIAQgLjcD2AsgBEEwaiAvQTgQloCAgAAgBEHIBWoQl4CAgAAgESEUQQEhFQNAIBQgFUGv8sGAAGosAAC3OQMAIBRBCGohFCAVIAZ2IRMgFUEBaiEVIBNFDQALQQEhFSAtIRQDQCAUIAcgFWpBr/LBgABqLAAAtzkDACAUQQhqIRQgFSAGdiETIBVBAWohFSATRQ0AC0EBIRUgDiEUA0AgFCAYIBVqQX9qLAAAtzkDACAUQQhqIRQgFSAGdiETIBVBAWohFSATRQ0AC0EBIRUgLCEUA0AgFCAXIBVqQX9qLAAAtzkDACAUQQhqIRQgFSAGdiETIBVBAWohFSATRQ0ACyAeIAYQi4CAgAAgDCAGEIuAgIAAICAgBhCLgICAACAfIAYQi4CAgABBASEUIBEhFQNAIBUgFSsDAJo5AwAgFUEIaiEVIBQgBnYhEyAUQQFqIRQgE0UNAAtBASEUIA4hFQNAIBUgFSsDAJo5AwAgFUEIaiEVIBQgBnYhEyAUQQFqIRQgE0UNAAtBACEVA0AgCCAVaiIUIBEgFWoiEy0AADoAACAUQQFqIBNBAWotAAA6AAAgFEECaiATQQJqLQAAOgAAIBRBA2ogE0EDai0AADoAACADIBVBBGoiFUcNAAsCQCAGRQ0AQQAhEwJAIAZBAUYNAEEAIRMgCCEVA0AgFSAFaiIUKwMAITEgFEIANwMAIBRBCGoiFCsDACEyIBRCADcDACAVIBUrAwAiMyAzoiAxIDGioDkDACAVQQhqIhQgFCsDACIxIDGiIDIgMqKgOQMAIBVBEGohFSAcIBNBAmoiE0cNAAsLIB1FDQAgISATIBpqQQN0aiIVKwMAITEgFUIANwMAICEgE0EDdGoiFSAVKwMAIjIgMqIgMSAxoqA5AwALQQAhFQNAIAEgFWoiFCAtIBVqIhMtAAA6AAAgFEEBaiATQQFqLQAAOgAAIBRBAmogE0ECai0AADoAACAUQQNqIBNBA2otAAA6AAAgAyAVQQRqIhVHDQALAkAgBkUNACABIRUgLCEUIBshEwNAIBUgFSsDACIxIBQrAwAiMqIgFSAFaiIQKwMAIjMgFCAFaisDACI0oqA5AwAgECAzIDKiIDEgNKKhOQMAIBVBCGohFSAUQQhqIRQgE0F/aiITDQALQQAhEwJAIAZBAUYNAEEAIRMgLSEVA0AgFSAFaiIUKwMAITEgFEIANwMAIBRBCGoiFCsDACEyIBRCADcDACAVIBUrAwAiMyAzoiAxIDGioDkDACAVQQhqIhQgFCsDACIxIDGiIDIgMqKgOQMAIBVBEGohFSAcIBNBAmoiE0cNAAsLIB1FDQAgDCATIBpqQQN0aiIVKwMAITEgFUIANwMAIAwgE0EDdGoiFSAVKwMAIjIgMqIgMSAxoqA5AwALQQEhFCAtIRUgCCETA0AgFSAVKwMAIBMrAwCgOQMAIBVBCGohFSATQQhqIRMgFCAGdiEQIBRBAWohFCAQRQ0AC0EAIRUDQCAIIBVqIhQgESAVaiITLQAAOgAAIBRBAWogE0EBai0AADoAACAUQQJqIBNBAmotAAA6AAAgFEEDaiATQQNqLQAAOgAAIAMgFUEEaiIVRw0ACwJAIAZFDQAgESEVIA4hFCAbIRMDQCAVIBUrAwAiMSAUKwMAIjKiIBUgBWoiECsDACIzIBQgBWorAwAiNKKgOQMAIBAgMyAyoiAxIDSioTkDACAVQQhqIRUgFEEIaiEUIBNBf2oiEw0ACwtBASEUIBEhFSABIRMDQCAVIBUrAwAgEysDAKA5AwAgFUEIaiEVIBNBCGohEyAUIAZ2IRAgFEEBaiEUIBBFDQALAkAgBkUNAEEAIRMCQCAGQQFGDQBBACETICwhFQNAIBUgBWoiFCsDACExIBRCADcDACAUQQhqIhQrAwAhMiAUQgA3AwAgFSAVKwMAIjMgM6IgMSAxoqA5AwAgFUEIaiIUIBQrAwAiMSAxoiAyIDKioDkDACAVQRBqIRUgHCATQQJqIhNHDQALCyAdRQ0AIB8gEyAaakEDdGoiFSsDACExIBVCADcDACAfIBNBA3RqIhUgFSsDACIyIDKiIDEgMaKgOQMAC0EAIRUDQCABIBVqIhQgDiAVaiITLQAAOgAAIBRBAWogE0EBai0AADoAACAUQQJqIBNBAmotAAA6AAAgFEEDaiATQQNqLQAAOgAAIAMgFUEEaiIVRw0ACwJAIAZFDQBBACETAkAgBkEBRg0AQQAhEyABIRUDQCAVIAVqIhQrAwAhMSAUQgA3AwAgFEEIaiIUKwMAITIgFEIANwMAIBUgFSsDACIzIDOiIDEgMaKgOQMAIBVBCGoiFCAUKwMAIjEgMaIgMiAyoqA5AwAgFUEQaiEVIBwgE0ECaiITRw0ACwsgHUUNACAiIBMgGmpBA3RqIhUrAwAhMSAVQgA3AwAgIiATQQN0aiIVIBUrAwAiMiAyoiAxIDGioDkDAAtBASEUICwhFSABIRMDQCAVIBUrAwAgEysDAKA5AwAgFUEIaiEVIBNBCGohEyAUIAZ2IRAgFEEBaiEUIBBFDQALQQAhCQJAIAZBAkkNAEEAIQkgJyEUICkhEyArIRUgKiEQA0AgFUGw8sGAAGogFEGw8sGAAGovAQC4OQMAIBVBuPLBgABqIBRBsvLBgABqLwEAuDkDACAVQcDywYAAaiATQbDywYAAai8BALg5AwAgFUHI8sGAAGogEEGw8sGAAGovAQC4OQMAIBRBCGohFCATQQhqIRMgFUEgaiEVIBBBCGohECAjIAlBBGoiCUcNAAsLAkAgBkEBSw0AIAEgCUEDdGohFSAoIAlBAXRqIRQgJCETA0AgFSAULwEAuDkDACAVQQhqIRUgFEECaiEUIBNBf2oiEw0ACwsgIiAGEIuAgIAAQQAhFQNAIA8gFWoiFCABIBVqIhMtAAA6AAAgFEEBaiATQQFqLQAAOgAAIBRBAmogE0ECai0AADoAACAUQQNqIBNBA2otAAA6AAAgAyAVQQRqIhVHDQALAkAgBkUNACAPIRUgCCEUIBshEwNAIBUgFSsDACIxIBQrAwAiMqIgFSAFaiIQKwMAIjMgFCAFaisDACI0oqE5AwAgECAzIDKiIDEgNKKgOQMAIBVBCGohFSAUQQhqIRQgE0F/aiITDQALC0EBIRQgDyEVA0AgFSAVKwMARIKnl5DjVBW/ojkDACAVQQhqIRUgFCAGdiETIBRBAWohFCATRQ0ACwJAIAZFDQAgASEVIA4hFCAbIRMDQCAVIBUrAwAiMSAUKwMAIjKiIBUgBWoiECsDACIzIBQgBWorAwAiNKKhOQMAIBAgMyAyoiAxIDSioDkDACAVQQhqIRUgFEEIaiEUIBNBf2oiEw0ACwtBASEUIAEhFQNAIBUgFSsDAESCp5eQ41QVP6I5AwAgFUEIaiEVIBQgBnYhEyAUQQFqIRQgE0UNAAtBACEVA0AgDiAVaiIUIAEgFWoiEy0AADoAACAUQQFqIBNBAWotAAA6AAAgFEECaiATQQJqLQAAOgAAIBRBA2ogE0EDai0AADoAACAlIBVBBGoiFUcNAAsgBEHIBWogICAhIAwgHiAfIAYgBiAiEJuAgIAAICEgICAlEIaAgIAAGkEBIRUgESEUA0AgFCAVQa/ywYAAaiwAALc5AwAgFEEIaiEUIBUgBnYhEyAVQQFqIRUgE0UNAAtBASEVIC0hFANAIBQgByAVakGv8sGAAGosAAC3OQMAIBRBCGohFCAVIAZ2IRMgFUEBaiEVIBNFDQALQQEhFSAOIRQDQCAUIBggFWpBf2osAAC3OQMAIBRBCGohFCAVIAZ2IRMgFUEBaiEVIBNFDQALQQEhFSAsIRQDQCAUIBcgFWpBf2osAAC3OQMAIBRBCGohFCAVIAZ2IRMgFUEBaiEVIBNFDQALIB4gBhCLgICAACAMIAYQi4CAgAAgICAGEIuAgIAAIB8gBhCLgICAAEEBIRQgESEVA0AgFSAVKwMAmjkDACAVQQhqIRUgFCAGdiETIBRBAWohFCATRQ0AC0EBIRQgDiEVA0AgFSAVKwMAmjkDACAVQQhqIRUgFCAGdiETIBRBAWohFCATRQ0AC0EAIRUDQCAPIBVqIhQgCCAVaiITLQAAOgAAIBRBAWogE0EBai0AADoAACAUQQJqIBNBAmotAAA6AAAgFEEDaiATQQNqLQAAOgAAIAMgFUEEaiIVRw0AC0EAIRUDQCASIBVqIhQgASAVaiITLQAAOgAAIBRBAWogE0EBai0AADoAACAUQQJqIBNBAmotAAA6AAAgFEEDaiATQQNqLQAAOgAAIAMgFUEEaiIVRw0ACwJAIAZFDQAgDyEVIC0hFCAbIRMDQCAVIBUrAwAiMSAUKwMAIjKiIBUgBWoiECsDACIzIBQgBWorAwAiNKKhOQMAIBAgMyAyoiAxIDSioDkDACAVQQhqIRUgFEEIaiEUIBNBf2oiEw0ACyASIRUgLCEUIBshEwNAIBUgFSsDACIxIBQrAwAiMqIgFSAFaiIQKwMAIjMgFCAFaisDACI0oqE5AwAgECAzIDKiIDEgNKKgOQMAIBVBCGohFSAUQQhqIRQgE0F/aiITDQALC0EBIRQgDyEVIBIhEwNAIBUgFSsDACATKwMAoDkDACAVQQhqIRUgE0EIaiETIBQgBnYhECAUQQFqIRQgEEUNAAtBACEVA0AgEiAVaiIUIAggFWoiEy0AADoAACAUQQFqIBNBAWotAAA6AAAgFEECaiATQQJqLQAAOgAAIBRBA2ogE0EDai0AADoAACADIBVBBGoiFUcNAAsCQCAGRQ0AIBIhFSARIRQgGyETA0AgFSAVKwMAIjEgFCsDACIyoiAVIAVqIhArAwAiMyAUIAVqKwMAIjSioTkDACAQIDMgMqIgMSA0oqA5AwAgFUEIaiEVIBRBCGohFCATQX9qIhMNAAsLQQAhFQNAIAggFWoiFCAPIBVqIhMtAAA6AAAgFEEBaiATQQFqLQAAOgAAIBRBAmogE0ECai0AADoAACAUQQNqIBNBA2otAAA6AAAgAyAVQQRqIhVHDQALAkAgBkUNACABIRUgDiEUIBshEwNAIBUgFSsDACIxIBQrAwAiMqIgFSAFaiIQKwMAIjMgFCAFaisDACI0oqE5AwAgECAzIDKiIDEgNKKgOQMAIBVBCGohFSAUQQhqIRQgE0F/aiITDQALC0EBIRQgASEVIBIhEwNAIBUgFSsDACATKwMAoDkDACAVQQhqIRUgE0EIaiETIBQgBnYhECAUQQFqIRQgEEUNAAsgISAGEIyAgIAAICIgBhCMgICAAEEAIQkgKCEVIAghFCAPIRMgByEWQQAhDQNAAkACQCAUKwMAIjGZRAAAAAAAAOBDY0UNACAxsCE1DAELQoCAgICAgICAgH8hNQsgNUI0iEIBfEL/H4NC/v///w98Qh+IQgGDITYCQAJAIDFEAAAAAAAA8L+gIjKZRAAAAAAAAOBDY0UNACAysCE3DAELQoCAgICAgICAgH8hNwtCACA2fSE4AkACQCAxRAAAAAAAADDDRAAAAAAAADBDIDdCAFMboCIxmUQAAAAAAADgQ2NFDQAgMbAhNwwBC0KAgICAgICAgIB/ITcLIBMgFS8BACA2Qn98IDWDIDggN4OEp2siEDsBACAQIBBsIA1qIg0gCXIhCSAVQQJqIRUgFEEIaiEUIBNBAmohEyAWQX9qIhYNAAsgASEVIC0hFCAHIRMDQAJAAkAgFSsDACIxmUQAAAAAAADgQ2NFDQAgMbAhNQwBC0KAgICAgICAgIB/ITULIDVCNIhCAXxC/x+DQv7///8PfEIfiEIBgyE2AkACQCAxRAAAAAAAAPC/oCIymUQAAAAAAADgQ2NFDQAgMrAhNwwBC0KAgICAgICAgIB/ITcLQgAgNn0hOAJAAkAgMUQAAAAAAAAww0QAAAAAAAAwQyA3QgBTG6AiMZlEAAAAAAAA4ENjRQ0AIDGwITcMAQtCgICAgICAgICAfyE3CyAUQQAgNkJ/fCA1gyA4IDeDhKdrOwEAIBVBCGohFSAUQQJqIRQgE0F/aiITDQALIAlBH3UgDXIiE0EfdSEQQQEhFSAtIRQDQCAULgEAIgkgCWwgE2oiEyAQciEQIBUgBnYhCSAUQQJqIRQgFUEBaiEVIAlFDQALIBMgEEEfdXIgMEsNAAsgB0EBdCITQQJxIQhBACEFAkAgE0F/aiIPQQNJDQAgE0H8/wdxIRUgB0ECdEGw8sGAAGohFCALIAdBBmxqQbDywYAAaiEGQQAhBQNAIBQgBWoiAyAGIAVqIgEtAAA6AAAgA0EBaiABQQFqLQAAOgAAIANBAmogAUECai0AADoAACADQQNqIAFBA2otAAA6AAAgFSAFQQRqIgVHDQALCwJAIAhFDQAgCyAFaiAHQQZsakGw8sGAAGohAyAFIAdBAnRqQbDywYAAaiEFIAghAQNAIAUgAy0AADoAACADQQFqIQMgBUEBaiEFIAFBf2oiAQ0ACwtBACEFAkAgD0EDSQ0AIBNB/P8HcSEVIAsgB0E2bGpBsPLBgABqIRQgCyAHQQZsakGw8sGAAGohBkEAIQUDQCAGIAVqIgMgFCAFaiIBLQAAOgAAIANBAWogAUEBai0AADoAACADQQJqIAFBAmotAAA6AAAgA0EDaiABQQNqLQAAOgAAIBUgBUEEaiIFRw0ACwsCQCAIRQ0AIAsgBWoiAyAHQTZsakGw8sGAAGohBSADIAdBBmxqQbDywYAAaiEDA0AgAyAFLQAAOgAAIAVBAWohBSADQQFqIQMgCEF/aiIIDQALCyAAIAQtANADOgABIAAgBCgA0QM2AAIgACAEKQDVAzcABiAAIAQpAN0DNwAOIAAgBCkA5QM3ABYgACAEKQDtAzcAHiAAIAQvAPUDOwAmIAAgBC0A9wM6ACggACAZOgAAIAdBAnRBsPLBgABqIQUgByEDA0AgBS8BAEGAcGpB//8DcUGB4ANJDQEgBUECaiEFIANBf2oiAw0ACyAAQSlqIQBBACEIQQAhFUEAIQZBACEUA0AgFUEIdCAKIBRBAXRqLgEAIgVBCHZBgAFxciAFIAVBH3UiA2ogA3MiBUH/AHFyIAVBgP8DcUEHdiITQQFqIgV0QQFyIRUCQCAIIAVqQQhqIgFBCEkNAEEAQccFIAZrIgUgBUHHBUsbIQUgACAGaiEDIAggE2pBAWpBA3YiE0EBaiEIIAYgE2pBAWohBgNAIAVFDQMgAyAVIAFBeGoiAXY6AAAgBUF/aiEFIANBAWohAyAIQX9qIggNAAsLIAEhCCAUQQFqIhQgB0cNAAsCQAJAIAhFDQAgBkHGBUsNAiAmIAZqIBVBCCAIa3Q6AAAgBkEBaiEGDAELIAZFDQELIAZBKWohAgsgBEHgC2okgICAgAAgAgsFAEHwBQsFAEGBCgvGDwELfyOAgICAAEHgAWsiBSSAgICAAAJAAkAgAUEpTw0AQX0hBgwBCyAFQgA3A9ABQQAhBgNAIAVBCGogBmpCADcDACAGQQhqIgZByAFHDQALIAVBCGogAEEBakEoEJiAgIAAIAVBCGogAiADEJiAgIAAAkAgBC0AACIGQfABcUUNAEF9IQYMAQsCQCAGQQ9xIgJBdWpBdk8NAEF9IQYMAQtBfCEGIAAtAAAiA0EPcSACRw0AAkAgA0HwAXFBMEYNAEF9IQYMAQsCQCACQQlGDQBBfSEGDAELIARBAWohBEEAIQZBACECQQAhAwNAIAJBCHQgBC0AAHIhAgJAAkAgBkEGTg0AIAZBCGohBgwBCwJAIAIgBkF6aiIGdkH//wBxIgdBgOAATQ0AQX0hBgwDCyADQQF0QbDywYAAaiAHOwEAIANBAWohAwsgBEEBaiEEIANBgARJDQALAkAgAkF/IAZ0QX9zcUUNAEF9IQYMAQsgAUFXaiEHIABBKWohCEEAIQlBACEGQQAhAkEAIQMDQAJAIAMgB0kNAEF9IQYMAgsgAkEIdCAIIANqLQAAciICIAZ2IgRB/wBxIQAgBEGAAXEhCiADQQFqIQMCQANAAkAgBg0AAkAgAyAHSQ0AQX0hBgwFC0EIIQYgAkEIdCAIIANqLQAAciECIANBAWohAwsgAiAGQX9qIgZ2QQFxDQEgAEH/DkshBCAAQYABaiEAIARFDQALQX0hBgwCCwJAIApFDQAgAA0AQX0hBgwCCyAJQQF0QbCCwoAAakEAIABrIAAgChs7AQAgCUEBaiIJQYAESQ0ACwJAIAJBfyAGdEF/c3FFDQBBfSEGDAELAkAgAw0AQX0hBgwBC0F9IQYgA0EpaiABRw0AIAVBCGogBSgC0AFqIgYgBi0AAEEfczoAACAFQogBNwPQASAFIAUtAI8BQYABczoAjwFBsPrBgAAhAUGABCEGA0AgBUEIaiAFQd4BakECEJaAgIAAAkAgBS0A3gFBCHQgBS0A3wFyIgBBhOADSw0AIAEgAEGB4ABwOwEAIAZBf2ohBiABQQJqIQELIAYNAAtBgAQhC0EBIQwDQCALQQF0IQ0gC0EBdiIOQQF0IQdBACEPQbDywYAAIQNBACEKA0ACQCAKIAogDmpPDQAgDyAMakEBdEGg0oGAAGovAQAhCCADIAdqIQlBACEGA0AgAyAGaiIBIAkgBmoiAC8BACAIbCIEQf/fAGxB//8DcUGB4ABsIARqIgRBEHYiAiACQf+ff2ogBEGAgISAA0kbIgQgAS8BACICaiIBIAFB/58DaiABQYHgAEgbOwEAIAAgAiAEayIBQR91QYHgAHEgAWo7AQAgByAGQQJqIgZHDQALCyADIA1qIQMgCiALaiEKIA9BAWoiDyAMRw0ACyAOIQsgDEEBdCIMQYAESQ0AC0EAIQFBsPLBgAAhBgNAIAYgBi8BACIAQbiqlcAAbEH4/wNxQYHgAGwgAEHI1QBsaiIAQRB2IgQgBEH/nwNqIABBgICEgANJGzsBACAGQQJqIQYgAUEBaiIBQYAESQ0AC0GAeCEGA0AgBkGwksKAAGogBkGwisKAAGouAQAiAUEPdkGB4ABxIAFqOwEAIAZBspLCgABqIAZBsorCgABqLgEAIgFBD3ZBgeAAcSABajsBACAGQQRqIgYNAAtBgAQhC0EBIQwDQCALQQF0IQ0gC0EBdiIOQQF0IQdBACEPQbCKwoAAIQNBACEKA0ACQCAKIAogDmpPDQAgDyAMakEBdEGg0oGAAGovAQAhCCADIAdqIQlBACEGA0AgAyAGaiIBIAkgBmoiAC8BACAIbCIEQf/fAGxB//8DcUGB4ABsIARqIgRBEHYiAiACQf+ff2ogBEGAgISAA0kbIgQgAS8BACICaiIBIAFB/58DaiABQYHgAEgbOwEAIAAgAiAEayIBQR91QYHgAHEgAWo7AQAgByAGQQJqIgZHDQALCyADIA1qIQMgCiALaiEKIA9BAWoiDyAMRw0ACyAOIQsgDEEBdCIMQYAESQ0AC0EAIQFBsPLBgAAhBgNAIAZBgBhqIgAgBi8BACAALwEAbCIAQf/fAGxB//8DcUGB4ABsIABqIgBBEHYiBCAEQf+fA2ogAEGAgISAA0kbOwEAIAZBAmohBiABQQFqIgFBgARJDQALQbCKwoAAIQZBsIrCgABBCRCcgICAAEEAIQEDQCAGIAYvAQAgBkGAcGovAQBrIgBBH3VBgeAAcSAAajsBACAGQQJqIQYgAUEBaiIBQYAESQ0AC0GAeCEGA0AgBkGwksKAAGoiAUH/n39BACABLwEAIgFBgDBLGyABajsBACAGQbKSwoAAaiIBQf+ff0EAIAEvAQAiAUGAMEsbIAFqOwEAIAZBtJLCgABqIgFB/59/QQAgAS8BACIBQYAwSxsgAWo7AQAgBkG2ksKAAGoiAUH/n39BACABLwEAIgFBgDBLGyABajsBACAGQQhqIgYNAAtBACEEQbCCwoAAIQZBACEBQQAhAANAIAZBgAhqLgEAIgIgAmwgAGoiACABciAAIAYuAQAiASABbGoiAHIhASAGQQJqIQYgBEEBaiIEQYAESQ0AC0F8QQAgAUEfdSAAckGmqJ0QSxshBgsgBUHgAWokgICAgAAgBgsLqeoBAQBBgAgLoOoBAAAAAHqMAQBKLwMAQYsGAIecDQAYRRwARqI6ALZ0eQDASfsAJlQHApopMAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAA8D/NO39mnqDmP807f2aeoOY/zTt/Zp6g5r/NO39mnqDmP0aNMs9rkO0/Y6mupuJ92D9jqa6m4n3Yv0aNMs9rkO0/Y6mupuJ92D9GjTLPa5DtP0aNMs9rkO2/Y6mupuJ92D+wXPfPl2LvPwumaTy4+Mg/C6ZpPLj4yL+wXPfPl2LvP8horjk7x+E/o6EOKWab6j+joQ4pZpvqv8horjk7x+E/o6EOKWab6j/IaK45O8fhP8horjk7x+G/o6EOKWab6j8Lpmk8uPjIP7Bc98+XYu8/sFz3z5di778Lpmk8uPjIPyYl0aON2O8/LLQpvKYXuT8stCm8phe5vyYl0aON2O8/1h0JJfNM5D9BFxVrgLzoP0EXFWuAvOi/1h0JJfNM5D+xvYDxsjjsPzv2BjhdK94/O/YGOF0r3r+xvYDxsjjsPwaf1S4GlNI/2i3GVkGf7j/aLcZWQZ/uvwaf1S4GlNI/2i3GVkGf7j8Gn9UuBpTSPwaf1S4GlNK/2i3GVkGf7j879gY4XSveP7G9gPGyOOw/sb2A8bI47L879gY4XSveP0EXFWuAvOg/1h0JJfNM5D/WHQkl80zkv0EXFWuAvOg/LLQpvKYXuT8mJdGjjdjvPyYl0aON2O+/LLQpvKYXuT9+bXnjIfbvPxTYDfFlH6k/FNgN8WUfqb9+bXnjIfbvP6DsjDRpfeU/r69qIt+15z+vr2oi37Xnv6DsjDRpfeU/c8c89Hrt7D/AXOEJEF3bP8Bc4QkQXdu/c8c89Hrt7D/dH6t1mo/VP+WG9gQhIe4/5Yb2BCEh7r/dH6t1mo/VP9cwkvt+Cu8/G18he/kZzz8bXyF7+RnPv9cwkvt+Cu8/7v8imYdz4D8+bhlFg3LrPz5uGUWDcuu/7v8imYdz4D9Bh/NH4LPpPzVw4fz3D+M/NXDh/PcP479Bh/NH4LPpPzphjm4QyMI/F6UIf1Wn7z8XpQh/Vafvvzphjm4QyMI/F6UIf1Wn7z86YY5uEMjCPzphjm4QyMK/F6UIf1Wn7z81cOH89w/jP0GH80fgs+k/QYfzR+Cz6b81cOH89w/jPz5uGUWDcus/7v8imYdz4D/u/yKZh3Pgvz5uGUWDcus/G18he/kZzz/XMJL7fgrvP9cwkvt+Cu+/G18he/kZzz/lhvYEISHuP90fq3Waj9U/3R+rdZqP1b/lhvYEISHuP8Bc4QkQXds/c8c89Hrt7D9zxzz0eu3sv8Bc4QkQXds/r69qIt+15z+g7Iw0aX3lP6DsjDRpfeW/r69qIt+15z8U2A3xZR+pP35teeMh9u8/fm154yH2778U2A3xZR+pPw3NhGCI/e8/fmaj91UhmT9+ZqP3VSGZvw3NhGCI/e8/3ywdVbcQ5j+W/+83CC3nP5b/7zcILee/3ywdVbcQ5j86yU3RNEHtP4rtqEN579k/iu2oQ3nv2b86yU3RNEHtP59F+jCFCNc/PMLMthPb7T88wsy2E9vtv59F+jCFCNc/ieVkrPM47z9jT35qggvMP2NPfmqCC8y/ieVkrPM47z8jSxtUsx7hPwACFVgKCes/AAIVWAoJ678jSxtUsx7hP4InRqCnKeo/3xLdTAVt4j/fEt1MBW3iv4InRqCnKeo/xj+LRBTixT+pS3H6ZIfvP6lLcfpkh++/xj+LRBTixT/Tn+FwZMLvPw5zqVZOVr8/DnOpVk5Wv7/Tn+FwZMLvP7lQICn6r+M/+2OSSSI66T/7Y5JJIjrpv7lQICn6r+M/KpVvrMDX6z+6mvjbpIvfP7qa+Nuki9+/KpVvrMDX6z939rFi0hHRP2NJaOdA1+4/Y0lo50DX7r939rFi0hHRPxLhSOyIYu4/AWYXlFwT1D8BZheUXBPUvxLhSOyIYu4/XsQxmW7G3D/1ETQhS5XsP/URNCFLley/XsQxmW7G3D9ul/8LDjvoP+nl47vK5uQ/6eXju8rm5L9ul/8LDjvoP/YZzpIg1bI/OogBrc3p7z86iAGtzenvv/YZzpIg1bI/OogBrc3p7z/2Gc6SINWyP/YZzpIg1bK/OogBrc3p7z/p5eO7yubkP26X/wsOO+g/bpf/Cw476L/p5eO7yubkP/URNCFLlew/XsQxmW7G3D9exDGZbsbcv/URNCFLlew/AWYXlFwT1D8S4UjsiGLuPxLhSOyIYu6/AWYXlFwT1D9jSWjnQNfuP3f2sWLSEdE/d/axYtIR0b9jSWjnQNfuP7qa+Nuki98/KpVvrMDX6z8qlW+swNfrv7qa+Nuki98/+2OSSSI66T+5UCAp+q/jP7lQICn6r+O/+2OSSSI66T8Oc6lWTla/P9Of4XBkwu8/05/hcGTC778Oc6lWTla/P6lLcfpkh+8/xj+LRBTixT/GP4tEFOLFv6lLcfpkh+8/3xLdTAVt4j+CJ0agpynqP4InRqCnKeq/3xLdTAVt4j8AAhVYCgnrPyNLG1SzHuE/I0sbVLMe4b8AAhVYCgnrP2NPfmqCC8w/ieVkrPM47z+J5WSs8zjvv2NPfmqCC8w/PMLMthPb7T+fRfowhQjXP59F+jCFCNe/PMLMthPb7T+K7ahDee/ZPzrJTdE0Qe0/OslN0TRB7b+K7ahDee/ZP5b/7zcILec/3ywdVbcQ5j/fLB1VtxDmv5b/7zcILec/fmaj91UhmT8NzYRgiP3vPw3NhGCI/e+/fmaj91UhmT/bkpsWYv/vP4TH3vzRIYk/hMfe/NEhib/bkpsWYv/vPz148CUZWeY/r6jqVETn5j+vqOpUROfmvz148CUZWeY/i+bJc2Fp7T/Xk7xjKjfZP9eTvGMqN9m/i+bJc2Fp7T/nzB0xqcPXP5ugOGJStu0/m6A4YlK27b/nzB0xqcPXPy0vCztgTu8/UQSwJaCCyj9RBLAloILKvy0vCztgTu8/SdveY01z4T8R1SGevNLqPxHVIZ680uq/SdveY01z4T/i+gIbCWPqP1nrM5l5GuI/WeszmXka4r/i+gIbCWPqPzG/UN7Zbcc/dyCho5l17z93IKGjmXXvvzG/UN7Zbcc/e6Zt/RXO7z/Vwp7HhTe8P9XCnseFN7y/e6Zt/RXO7z/UVkVT2f7jPw2U76PM++g/DZTvo8z76L/UVkVT2f7jP0lVcibECOw/1njvUhnc3j/WeO9SGdzev0lVcibECOw/PttMP0TT0T90C9/I2LvuP3QL38jYu+6/PttMP0TT0T8N0Uyre4HuP1KB4cIQVNM/UoHhwhBU078N0Uyre4HuP4njhlt3ed0/m3OINItn7D+bc4g0i2fsv4njhlt3ed0/vy66D0B86D85CZubRJrkPzkJm5tEmuS/vy66D0B86D8ZpJoK0Pa1PwlbvfzK4e8/CVu9/Mrh778ZpJoK0Pa1P61xjmWV8O8/4CD4eW5lrz/gIPh5bmWvv61xjmWV8O8/llWjkoIy5T9xF1fj7PjnP3EXV+Ps+Oe/llWjkoIy5T9c/Pzz8MHsP+ceAdhJEtw/5x4B2EkS3L9c/Pzz8MHsP2rneELi0dQ/fsErS2pC7j9+wStLakLuv2rneELi0dQ/wnPko3jx7j+u/TcOuE/QP679Nw64T9C/wnPko3jx7j+3PkyH/BzgP9KQNWeqpes/0pA1Z6ql67+3PkyH/BzgP0LXx/R+d+k/81kGsVhg4z/zWQaxWGDjv0LXx/R+d+k/d/XazvA5wT9B15VxebXvP0HXlXF5te+/d/XazvA5wT+bCckk+ZfvP1o+KbF2VcQ/Wj4psXZVxL+bCckk+ZfvP+rz+iXbvuI/lK8p70Pv6T+UrynvQ+/pv+rz+iXbvuI/Elf1Pk0+6z+PiV1NcMngP4+JXU1wyeC/Elf1Pk0+6z8RQ0XlT5PNP9o6dvdSIu8/2jp291Ii778RQ0XlT5PNPyu+LWKu/u0/xic/3X1M1j/GJz/dfUzWvyu+LWKu/u0/yj9tK8im2j/cNT505xftP9w1PnTnF+2/yj9tK8im2j9hcgNf53HnP4wBZb57x+U/jAFlvnvH5b9hcgNf53HnP81VlHVl2KI/Xff+73L67z9d9/7vcvrvv81VlHVl2KI/Xff+73L67z/NVZR1ZdiiP81VlHVl2KK/Xff+73L67z+MAWW+e8flP2FyA1/ncec/YXIDX+dx57+MAWW+e8flP9w1PnTnF+0/yj9tK8im2j/KP20ryKbav9w1PnTnF+0/xic/3X1M1j8rvi1irv7tPyu+LWKu/u2/xic/3X1M1j/aOnb3UiLvPxFDReVPk80/EUNF5U+Tzb/aOnb3UiLvP4+JXU1wyeA/Elf1Pk0+6z8SV/U+TT7rv4+JXU1wyeA/lK8p70Pv6T/q8/ol277iP+rz+iXbvuK/lK8p70Pv6T9aPimxdlXEP5sJyST5l+8/mwnJJPmX779aPimxdlXEP0HXlXF5te8/d/XazvA5wT939drO8DnBv0HXlXF5te8/81kGsVhg4z9C18f0fnfpP0LXx/R+d+m/81kGsVhg4z/SkDVnqqXrP7c+TIf8HOA/tz5Mh/wc4L/SkDVnqqXrP679Nw64T9A/wnPko3jx7j/Cc+SjePHuv679Nw64T9A/fsErS2pC7j9q53hC4tHUP2rneELi0dS/fsErS2pC7j/nHgHYSRLcP1z8/PPwwew/XPz88/DB7L/nHgHYSRLcP3EXV+Ps+Oc/llWjkoIy5T+WVaOSgjLlv3EXV+Ps+Oc/4CD4eW5lrz+tcY5llfDvP61xjmWV8O+/4CD4eW5lrz8JW738yuHvPxmkmgrQ9rU/GaSaCtD2tb8JW738yuHvPzkJm5tEmuQ/vy66D0B86D+/LroPQHzovzkJm5tEmuQ/m3OINItn7D+J44Zbd3ndP4njhlt3ed2/m3OINItn7D9SgeHCEFTTPw3RTKt7ge4/DdFMq3uB7r9SgeHCEFTTP3QL38jYu+4/PttMP0TT0T8+20w/RNPRv3QL38jYu+4/1njvUhnc3j9JVXImxAjsP0lVcibECOy/1njvUhnc3j8NlO+jzPvoP9RWRVPZ/uM/1FZFU9n+478NlO+jzPvoP9XCnseFN7w/e6Zt/RXO7z97pm39Fc7vv9XCnseFN7w/dyCho5l17z8xv1De2W3HPzG/UN7Zbce/dyCho5l17z9Z6zOZeRriP+L6AhsJY+o/4voCGwlj6r9Z6zOZeRriPxHVIZ680uo/SdveY01z4T9J295jTXPhvxHVIZ680uo/UQSwJaCCyj8tLws7YE7vPy0vCztgTu+/UQSwJaCCyj+boDhiUrbtP+fMHTGpw9c/58wdManD17+boDhiUrbtP9eTvGMqN9k/i+bJc2Fp7T+L5slzYWntv9eTvGMqN9k/r6jqVETn5j89ePAlGVnmPz148CUZWea/r6jqVETn5j+Ex9780SGJP9uSmxZi/+8/25KbFmL/77+Ex9780SGJP5KKjoXY/+8/cQBn/vAheT9xAGf+8CF5v5KKjoXY/+8/EK+RhPd85j91gsFzDcTmP3WCwXMNxOa/EK+RhPd85j/57LgCC33tP7CkyC6l2tg/sKTILqXa2L/57LgCC33tP8SqTrDjINg/iIlmqYOj7T+IiWapg6Ptv8SqTrDjINg/hJ54saJY7z9mQ9zyy73JP2ZD3PLLvcm/hJ54saJY7z+4ufIJWp3hP9TAFlkyt+o/1MAWWTK36r+4ufIJWp3hP53mn1JYf+o/G4a8i/Dw4T8bhryL8PDhv53mn1JYf+o/xmSc6GYzyD+3u/V9P2zvP7e79X0/bO+/xmSc6GYzyD+ECyIUedPvPwNcSSS3p7o/A1xJJLenur+ECyIUedPvP7Frjhf/JeQ/zJgWM0Xc6D/MmBYzRdzov7Frjhf/JeQ/sHGpP94g7D8UUfjq4IPePxRR+Orgg96/sHGpP94g7D9xu8OruzPSP46o5+iyre4/jqjn6LKt7r9xu8OruzPSP/L3HTaEkO4/hwPs2iL00j+HA+zaIvTSv/L3HTaEkO4/WMyBFI/S3T8HaSsBQlDsPwdpKwFCUOy/WMyBFI/S3T+q1E2afpzoP0dzmBu1c+Q/R3OYG7Vz5L+q1E2afpzoPyFbXWpYh7c/VvTxn1Pd7z9W9PGfU93vvyFbXWpYh7c/XFeND4Pz7z/j18ASjUKsP+PXwBKNQqy/XFeND4Pz7z83UZc4EFjlP7I9w2yD1+c/sj3DbIPX5783UZc4EFjlP/Yyi4nZ1+w/Ab0EI8+32z8BvQQjz7fbv/Yyi4nZ1+w/JDyvgNgw1T8lznDo6jHuPyXOcOjqMe6/JDyvgNgw1T/slQsMIv7uP/nt3xrc3M8/+e3fGtzcz7/slQsMIv7uPxoiriZWSOA/6QR10jiM6z/pBHXSOIzrvxoiriZWSOA/Ig3YLs+V6T9XjgwNQDjjP1eODA1AOOO/Ig3YLs+V6T/Pe+zUFgHCP7vPRo6Oru8/u89Gjo6u77/Pe+zUFgHCP8iyrVXOn+8/FI3NsNuOwz8Ujc2w247Dv8iyrVXOn+8/F+ro44Dn4j/VgOr1sdHpP9WA6vWx0em/F+ro44Dn4j8FFJL+iVjrP+HFF3SQnuA/4cUXdJCe4L8FFJL+iVjrPxsaEB7KVs4/XSD3U48W7z9dIPdTjxbvvxsaEB7KVs4/rIApygwQ7j+Tpp43J+7VP5Omnjcn7tW/rIApygwQ7j8JQH9sDQLbP5K9sv7UAu0/kr2y/tQC7b8JQH9sDQLbP+VVT1cAlOc/UHJdKo2i5T9Qcl0qjaLlv+VVT1cAlOc/Q82Q0gD8pT/fgdvacfjvP9+B29px+O+/Q82Q0gD8pT/40/EdJfzvPwHP0TE3aZ8/Ac/RMTdpn7/40/EdJfzvP3Rwg5U07OU/jdKojZRP5z+N0qiNlE/nv3Rwg5U07OU/n+/gILIs7T/lod4nQUvaP+Wh3idBS9q/n+/gILIs7T8Xfsd9narWP9pH3vcF7e0/2kfe9wXt7b8Xfsd9narWP52aCMnJLe8/hrISs4zPzD+GshKzjM/Mv52aCMnJLe8/fo4quyb04D+0EwBHzSPrP7QTAEfNI+u/fo4quyb04D83+brqlQzqP6icYicHluI/qJxiJweW4r83+brqlQzqP/LFl4XfG8U/20Gu/9WP7z/bQa7/1Y/vv/LFl4XfG8U/hkHkFxa87z8dg7pHoHLAPx2DukegcsC/hkHkFxa87z8i69+FQYjjP9dtjuTvWOk/122O5O9Y6b8i69+FQYjjP+qAk8TXvus/EBLnS/bi3z8QEudL9uLfv+qAk8TXvus/kNvbz9mw0D+8nVriguTuP7ydWuKC5O6/kNvbz9mw0D/8n3IEn1LuP1QQV6W4ctQ/VBBXpbhy1L/8n3IEn1LuPwsAl0l/bNw/ALmgacGr7D8AuaBpwavsvwsAl0l/bNw/zHq1Mxsa6D+boFmfwAzlP5ugWZ/ADOW/zHq1Mxsa6D+zCdc0AUSxP8RztuxY7e8/xHO27Fjt77+zCdc0AUSxP0A5Lq/z5e8/liAneRFmtD+WICd5EWa0v0A5Lq/z5e8/BADsRaHA5D/MWOkaxVvoP8xY6RrFW+i/BADsRaHA5D/zPCNSjn7sP1vb6egWIN0/W9vp6BYg3b/zPCNSjn7sP7cUBPrOs9M/RJdq2ydy7j9El2rbJ3Luv7cUBPrOs9M/hL/D07LJ7j93UXbXoHLRP3dRdtegctG/hL/D07LJ7j9n0D+WBTTfP913U+Fk8Os/3XdT4WTw679n0D+WBTTfP6Kd1G8WG+k/RIPFOILX4z9Eg8U4gtfjv6Kd1G8WG+k/yZ+uyw7HvT8ht/5sZMjvPyG3/mxkyO+/yZ+uyw7HvT9uPeYppn7vP7JK9gQTqMY/skr2BBOoxr9uPeYppn7vPx+smPvVQ+I/yJoRyHhG6j/ImhHIeEbqvx+smPvVQ+I/dBQ8tATu6j/rbDOvFUnhP+tsM68VSeG/dBQ8tATu6j8iZz3vMkfLP92S/4XQQ+8/3ZL/hdBD778iZz3vMkfLP2ACQcvXyO0/9hgkDzRm1z/2GCQPNGbXv2ACQcvXyO0//71BYXGT2T+xPulSb1XtP7E+6VJvVe2//71BYXGT2T96bRezQgrnP+kbHKMDNeY/6RscowM15r96bRezQgrnP/0O47s22ZI/oVFLtJz+7z+hUUu0nP7vv/0O47s22ZI/oVFLtJz+7z/9DuO7NtmSP/0O47s22ZK/oVFLtJz+7z/pGxyjAzXmP3ptF7NCCuc/em0Xs0IK57/pGxyjAzXmP7E+6VJvVe0//71BYXGT2T//vUFhcZPZv7E+6VJvVe0/9hgkDzRm1z9gAkHL18jtP2ACQcvXyO2/9hgkDzRm1z/dkv+F0EPvPyJnPe8yR8s/Imc97zJHy7/dkv+F0EPvP+tsM68VSeE/dBQ8tATu6j90FDy0BO7qv+tsM68VSeE/yJoRyHhG6j8frJj71UPiPx+smPvVQ+K/yJoRyHhG6j+ySvYEE6jGP2495immfu8/bj3mKaZ+77+ySvYEE6jGPyG3/mxkyO8/yZ+uyw7HvT/Jn67LDse9vyG3/mxkyO8/RIPFOILX4z+indRvFhvpP6Kd1G8WG+m/RIPFOILX4z/dd1PhZPDrP2fQP5YFNN8/Z9A/lgU037/dd1PhZPDrP3dRdtegctE/hL/D07LJ7j+Ev8PTssnuv3dRdtegctE/RJdq2ydy7j+3FAT6zrPTP7cUBPrOs9O/RJdq2ydy7j9b2+noFiDdP/M8I1KOfuw/8zwjUo5+7L9b2+noFiDdP8xY6RrFW+g/BADsRaHA5D8EAOxFocDkv8xY6RrFW+g/liAneRFmtD9AOS6v8+XvP0A5Lq/z5e+/liAneRFmtD/Ec7bsWO3vP7MJ1zQBRLE/swnXNAFEsb/Ec7bsWO3vP5ugWZ/ADOU/zHq1Mxsa6D/MerUzGxrov5ugWZ/ADOU/ALmgacGr7D8LAJdJf2zcPwsAl0l/bNy/ALmgacGr7D9UEFeluHLUP/yfcgSfUu4//J9yBJ9S7r9UEFeluHLUP7ydWuKC5O4/kNvbz9mw0D+Q29vP2bDQv7ydWuKC5O4/EBLnS/bi3z/qgJPE177rP+qAk8TXvuu/EBLnS/bi3z/XbY7k71jpPyLr34VBiOM/IuvfhUGI47/XbY7k71jpPx2DukegcsA/hkHkFxa87z+GQeQXFrzvvx2DukegcsA/20Gu/9WP7z/yxZeF3xvFP/LFl4XfG8W/20Gu/9WP7z+onGInB5biPzf5uuqVDOo/N/m66pUM6r+onGInB5biP7QTAEfNI+s/fo4quyb04D9+jiq7JvTgv7QTAEfNI+s/hrISs4zPzD+dmgjJyS3vP52aCMnJLe+/hrISs4zPzD/aR973Be3tPxd+x32dqtY/F37HfZ2q1r/aR973Be3tP+Wh3idBS9o/n+/gILIs7T+f7+Agsiztv+Wh3idBS9o/jdKojZRP5z90cIOVNOzlP3Rwg5U07OW/jdKojZRP5z8Bz9ExN2mfP/jT8R0l/O8/+NPxHSX8778Bz9ExN2mfP9+B29px+O8/Q82Q0gD8pT9DzZDSAPylv9+B29px+O8/UHJdKo2i5T/lVU9XAJTnP+VVT1cAlOe/UHJdKo2i5T+SvbL+1ALtPwlAf2wNAts/CUB/bA0C27+SvbL+1ALtP5Omnjcn7tU/rIApygwQ7j+sgCnKDBDuv5Omnjcn7tU/XSD3U48W7z8bGhAeylbOPxsaEB7KVs6/XSD3U48W7z/hxRd0kJ7gPwUUkv6JWOs/BRSS/olY67/hxRd0kJ7gP9WA6vWx0ek/F+ro44Dn4j8X6ujjgOfiv9WA6vWx0ek/FI3NsNuOwz/Isq1Vzp/vP8iyrVXOn++/FI3NsNuOwz+7z0aOjq7vP8977NQWAcI/z3vs1BYBwr+7z0aOjq7vP1eODA1AOOM/Ig3YLs+V6T8iDdguz5Xpv1eODA1AOOM/6QR10jiM6z8aIq4mVkjgPxoiriZWSOC/6QR10jiM6z/57d8a3NzPP+yVCwwi/u4/7JULDCL+7r/57d8a3NzPPyXOcOjqMe4/JDyvgNgw1T8kPK+A2DDVvyXOcOjqMe4/Ab0EI8+32z/2MouJ2dfsP/Yyi4nZ1+y/Ab0EI8+32z+yPcNsg9fnPzdRlzgQWOU/N1GXOBBY5b+yPcNsg9fnP+PXwBKNQqw/XFeND4Pz7z9cV40Pg/Pvv+PXwBKNQqw/VvTxn1Pd7z8hW11qWIe3PyFbXWpYh7e/VvTxn1Pd7z9Hc5gbtXPkP6rUTZp+nOg/qtRNmn6c6L9Hc5gbtXPkPwdpKwFCUOw/WMyBFI/S3T9YzIEUj9LdvwdpKwFCUOw/hwPs2iL00j/y9x02hJDuP/L3HTaEkO6/hwPs2iL00j+OqOfosq3uP3G7w6u7M9I/cbvDq7sz0r+OqOfosq3uPxRR+Orgg94/sHGpP94g7D+wcak/3iDsvxRR+Orgg94/zJgWM0Xc6D+xa44X/yXkP7Frjhf/JeS/zJgWM0Xc6D8DXEkkt6e6P4QLIhR50+8/hAsiFHnT778DXEkkt6e6P7e79X0/bO8/xmSc6GYzyD/GZJzoZjPIv7e79X0/bO8/G4a8i/Dw4T+d5p9SWH/qP53mn1JYf+q/G4a8i/Dw4T/UwBZZMrfqP7i58glaneE/uLnyCVqd4b/UwBZZMrfqP2ZD3PLLvck/hJ54saJY7z+Ennixoljvv2ZD3PLLvck/iIlmqYOj7T/Eqk6w4yDYP8SqTrDjINi/iIlmqYOj7T+wpMgupdrYP/nsuAILfe0/+ey4Agt97b+wpMgupdrYP3WCwXMNxOY/EK+RhPd85j8Qr5GE93zmv3WCwXMNxOY/cQBn/vAheT+Sio6F2P/vP5KKjoXY/++/cQBn/vAheT8CHWIh9v/vP7qkzL74IWk/uqTMvvghab8CHWIh9v/vP3GcoerRjuY/nOIv7Vyy5j+c4i/tXLLmv3GcoerRjuY/T6RFhMSG7T9E7dWGS6zYP0Tt1YZLrNi/T6RFhMSG7T8/kPOqak/YP0Y9i90Amu0/Rj2L3QCa7b8/kPOqak/YP11oQ+2mXe8/+iq26UlbyT/6KrbpSVvJv11oQ+2mXe8/v3MTF1Cy4T+OuSx6VKnqP465LHpUqeq/v3MTF1Cy4T/SWlRuZ43qP3JI3GQb3OE/ckjcZBvc4b/SWlRuZ43qPwQYxCcXlsg/7jyIVnVn7z/uPIhWdWfvvwQYxCcXlsg/nlynLQ3W7z9cqCTrtt+5P1yoJOu237m/nlynLQ3W7z+AQypbfznkP1VGGHVqzOg/VUYYdWrM6L+AQypbfznkP/HjMUnRLOw/Jdg8bahX3j8l2DxtqFfev/HjMUnRLOw/ulRVmeZj0j8AWOaTg6buPwBY5pODpu6/ulRVmeZj0j8wawE27JfuPyBFlU4axNI/IEWVThrE0r8wawE27JfuP95BqWb//t0/BMBBMYNE7D8EwEExg0Tsv95BqWb//t0/iB3eHoes6D+iMitpWmDkP6IyK2laYOS/iB3eHoes6D+hMMESh0+4P4xTFHX62u8/jFMUdfra77+hMMESh0+4P9O+sVTc9O8/F4NfvQGxqj8Xg1+9AbGqv9O+sVTc9O8/n2SXUcNq5T8z0+KcuMbnPzPT4py4xue/n2SXUcNq5T9goJkns+LsP5NW/RR4its/k1b9FHiK279goJkns+LsP7Rn9BJAYNU/ehk5RI8p7j96GTlEjynuv7Rn9BJAYNU/jHPPFFoE7z8COL2AdHvPPwI4vYB0e8+/jHPPFFoE7z+3uDHs813gP+mS54Zmf+s/6ZLnhmZ/67+3uDHs813gP7IGK6TfpOk/H6ZJ7CEk4z8fpknsISTjv7IGK6TfpOk/CTT9TZlkwj/c/QzL+6rvP9z9DMv7qu+/CTT9TZlkwj+RF3qsm6PvP6cWRfl7K8M/pxZF+Xsrw7+RF3qsm6PvPxUQREvC++I/wnXwENHC6T/CdfAQ0cLpvxUQREvC++I/R7z9FI9l6z+MsDIgEYngP4ywMiARieC/R7z9FI9l6z9I4y1Ga7jOP1+PibyQEO8/X4+JvJAQ779I4y1Ga7jOP9lm3C+gGO4/trOdi+e+1T+2s52L577Vv9lm3C+gGO4/chmzHZcv2z97Rs7oMPjsP3tGzugw+Oy/chmzHZcv2z/Sl78H96TnP98j99UBkOU/3yP31QGQ5b/Sl78H96TnP4ZGh6W6jac/ZJEbu1P37z9kkRu7U/fvv4ZGh6W6jac/eabinOD87z8dO+VMT0WcPx075UxPRZy/eabinOD87z8QauW9fP7lP0KZB45VPuc/QpkHjlU+578QauW9fP7lP9z7y3v8Nu0/wAq1Q2Ud2j/ACrVDZR3av9z7y3v8Nu0/tgyKY5jZ1j+BjW0PFuTtP4GNbQ8W5O2/tgyKY5jZ1j/wrjpaaDPvP910XVOQbcw/3XRdU5BtzL/wrjpaaDPvP1ep0EhyCeE/9aJMKnQW6z/1okwqdBbrv1ep0EhyCeE/XqfA0iYb6j+6PE3vi4HiP7o8Te+LgeK/XqfA0iYb6j/ey1SGAH/FP3hLyzeni+8/eEvLN6eL77/ey1SGAH/FP4iNCg9Hv+8/W7hvregOwD9buG+t6A7Av4iNCg9Hv+8/KTDW4yOc4z9sSqzjkEnpP2xKrOOQSem/KTDW4yOc4z8nIw3LVMvrP97SJFxXt98/3tIkXFe3378nIw3LVMvrP85JF05b4dA/UYYHauvd7j9Rhgdq693uv85JF05b4dA/02cEVZ1a7j/wNoncEEPUP/A2idwQQ9S/02cEVZ1a7j+JU4bDf5ncP0nEuRmPoOw/ScS5GY+g7L+JU4bDf5ncP/9F9ROcKug/hqTMJcz55D+GpMwlzPnkv/9F9ROcKug/TUTtdJYMsj8PQTAlnevvPw9BMCWd6++/TUTtdJYMsj9gLUiF6ufvP5mixRKfnbM/maLFEp+ds79gLUiF6ufvP3+fWG280+Q/+oOvEXFL6D/6g68RcUvov3+fWG280+Q/E5wCh/WJ7D8hzeGuS/PcPyHN4a5L89y/E5wCh/WJ7D9xwm7pm+PTP6dTXcVhau4/p1NdxWFq7r9xwm7pm+PTPwmQmV6D0O4/eJPG7z5C0T94k8bvPkLRvwmQmV6D0O4/o81W5t5f3z/BVBFhG+TrP8FUEWEb5Ou/o81W5t5f3z8VqMUfpCrpPxjFgUnEw+M/GMWBScTD478VqMUfpCrpPz+q5P23jr4/9pp9O27F7z/2mn07bsXvvz+q5P23jr4/DMZASg+D7z8Ngx2DGkXGPw2DHYMaRca/DMZASg+D7z8QcbtMc1jiP8Y7WUoYOOo/xjtZShg46r8QcbtMc1jiP7ZXn9iP++o/TyXuz+kz4T9PJe7P6TPhv7ZXn9iP++o/rV3xNGOpyz9lvBu8az7vP2W8G7xrPu+/rV3xNGOpyz9akYrz/tHtP5IQJsljN9c/khAmyWM3179akYrz/tHtP/L5DUR9wdk/JHUYG1tL7T8kdRgbW0vtv/L5DUR9wdk/v0EOlqwb5z//IuxP5CLmP/8i7E/kIua/v0EOlqwb5z8msvohTf2VP3fLcGgc/u8/d8twaBz+778msvohTf2VP9E7xUMJ/+8/y5e5ailqjz/Ll7lqKWqPv9E7xUMJ/+8/W1N/QxVH5j91W8mZyvjmP3VbyZnK+Oa/W1N/QxVH5j9/iohycV/tP4+Uq7dVZdk/j5Srt1Vl2b9/iohycV/tP67fE+b1lNc/mnWVQ56/7T+adZVDnr/tv67fE+b1lNc/tKu8BiJJ7z+rufPV8eTKP6u589Xx5Mq/tKu8BiJJ7z+84tvkNl7hP+/sRfNo4Oo/7+xF82jg6r+84tvkNl7hPyP1kBDJVOo/4hMsZi0v4j/iEyxmLS/ivyP1kBDJVOo//8QIjf0Kxz8qMhqcKXrvPyoyGpwpeu+//8QIjf0Kxz9UQ5EDR8vvP8F9MDtT/7w/wX0wO1P/vL9UQ5EDR8vvP4AGvuoz6+M//l5XQ3kL6T/+XldDeQvpv4AGvuoz6+M/R7GhJZ386z/+978GGQjfP/73vwYZCN+/R7GhJZ386z9D8uj796LRP7L2GkvPwu4/svYaS8/C7r9D8uj796LRP1oWpSnbee4/q7ZT4/WD0z+rtlPj9YPTv1oWpSnbee4/nWCoK9BM3T/Xqp6JFXPsP9eqnokVc+y/nWCoK9BM3T+VoZodCmzoP/EiZ1F5reQ/8SJnUXmt5L+VoZodCmzoPwpNTUp3LrU/htjpK+nj7z+G2Okr6ePvvwpNTUp3LrU/kWGCAgHv7z9kMEZOYXuwP2QwRk5he7C/kWGCAgHv7z+mmtkcqB/lP/pSbnWLCeg/+lJudYsJ6L+mmtkcqB/lP5naAArituw/KTEmR20/3D8pMSZHbT/cv5naAArituw/84Ib0VOi1D9ezoH/jUruP17Ogf+NSu6/84Ib0VOi1D9EpVBMB+vuPx5m6wVOgNA/HmbrBU6A0L9EpVBMB+vuP+GCK8hAB+A/DcS2oEmy6z8NxLagSbLrv+GCK8hAB+A/4X+9Qj9o6T+Nf4EbU3TjP41/gRtTdOO/4X+9Qj9o6T+GZ7K8TdbAP7etZo3RuO8/t61mjdG477+GZ7K8TdbAPwishU/xk+8/iPp5f7G4xD+I+nl/sbjEvwishU/xk+8/WOt66Haq4j/eSTHx9P3pP95JMfH0/em/WOt66Haq4j/ze/OlFTHrP7bES7jQ3uA/tsRLuNDe4L/ze/OlFTHrP+69LE13Mc0/zglG/Bco7z/OCUb8Fyjvv+69LE13Mc0/nKWbauP17T/LY62clHvWP8tjrZyUe9a/nKWbauP17T8b89vTDHnaP+Gk5cZVIu0/4aTlxlUi7b8b89vTDHnaP2RHMCzFYOc/XDQ+597Z5T9cND7n3tnlv2RHMCzFYOc/f8FC24VGoT+u/SXkVfvvP679JeRV+++/f8FC24VGoT8UwAhCfPnvP3lh+G85aqQ/eWH4bzlqpL8UwAhCfPnvP0h0TyYLteU/W7OQG/uC5z9bs5Ab+4Lnv0h0TyYLteU/udJZL2cN7T8J3FwSc9TaPwncXBJz1Nq/udJZL2cN7T8CwohcWR3WP1QPKNlmB+4/VA8o2WYH7r8CwohcWR3WPwhHKL56HO8/mgkBPxb1zT+aCQE/FvXNvwhHKL56HO8/7IWPhwW04D8led4JdEvrPyV53gl0S+u/7IWPhwW04D9yJLTtguDpP7ibTtMz0+I/uJtO0zPT4r9yJLTtguDpP5NI21cv8sM/Kd77fO2b7z8p3vt87Zvvv5NI21cv8sM/TdWBxg2y7z/nJL5AiZ3BP+ckvkCJncG/TdWBxg2y7z/hTcFSUkzjP5R1RfGuhuk/lHVF8a6G6b/hTcFSUkzjP14V2R/6mOs/lr3tVa4y4D+Wve1VrjLgv14V2R/6mOs/0v25Bhgf0D/Aoxzl1vfuP8CjHOXW9+6/0v25Bhgf0D+FznXsMzruP0hwGdxjAdU/SHAZ3GMB1b+FznXsMzruP9nA/xcV5ds/oN7CIO7M7D+g3sIg7szsv9nA/xcV5ds/hjawhz/o5z/8nRX1T0XlP/ydFfVPReW/hjawhz/o5z/JjoD5BtStP+0x4RQW8u8/7THhFBby77/JjoD5BtStPwcz9yKZ3+8/KbF5Phu/tj8psXk+G7+2vwcz9yKZ3+8//5FgMAOH5D+hG0jnZozoP6EbSOdmjOi//5FgMAOH5D9a+P5Z71vsP9kQ+lwMpt0/2RD6XAym3b9a+P5Z71vsP6+6OLYfJNM/JWCtWwmJ7j8lYK1bCYnuv6+6OLYfJNM/EYhbUc+07j++J9eDhQPSP74n14OFA9K/EYhbUc+07j8gVvKVBrDeP1deRtzZFOw/V15G3NkU7L8gVvKVBrDeP0lsSJsQ7Og/jBA9ZnIS5D+MED1mchLkv0lsSJsQ7Og/TPY47KZvuz+HYNhY0dDvP4dg2FjR0O+/TPY47KZvuz+3fktD9nDvPxzL0run0Mc/HMvSu6fQx7+3fktD9nDvP9ZgdaG6BeI/9WCd3jhx6j/1YJ3eOHHqv9ZgdaG6BeI/yPo+vf/E6j/lRjofWYjhP+VGOh9ZiOG/yPo+vf/E6j/aMRgbPiDKPwctrx+LU+8/By2vH4tT77/aMRgbPiDKP7mK5iz0rO0/5EFz003y1z/kQXPTTfLXv7mK5iz0rO0/0Xvvge8I2T//DYxQP3PtP/8NjFA/c+2/0Xvvge8I2T/Nr0rvr9XmP4azUj8Pa+Y/hrNSPw9r5r/Nr0rvr9XmPwOXUA5r2YI/T4yXLKf/7z9PjJcsp//vvwOXUA5r2YI/T4yXLKf/7z8Dl1AOa9mCPwOXUA5r2YK/T4yXLKf/7z+Gs1I/D2vmP82vSu+v1eY/za9K76/V5r+Gs1I/D2vmP/8NjFA/c+0/0Xvvge8I2T/Re++B7wjZv/8NjFA/c+0/5EFz003y1z+5iuYs9KztP7mK5iz0rO2/5EFz003y1z8HLa8fi1PvP9oxGBs+IMo/2jEYGz4gyr8HLa8fi1PvP+VGOh9ZiOE/yPo+vf/E6j/I+j69/8Tqv+VGOh9ZiOE/9WCd3jhx6j/WYHWhugXiP9ZgdaG6BeK/9WCd3jhx6j8cy9K7p9DHP7d+S0P2cO8/t35LQ/Zw778cy9K7p9DHP4dg2FjR0O8/TPY47KZvuz9M9jjspm+7v4dg2FjR0O8/jBA9ZnIS5D9JbEibEOzoP0lsSJsQ7Oi/jBA9ZnIS5D9XXkbc2RTsPyBW8pUGsN4/IFbylQaw3r9XXkbc2RTsP74n14OFA9I/EYhbUc+07j8RiFtRz7Tuv74n14OFA9I/JWCtWwmJ7j+vuji2HyTTP6+6OLYfJNO/JWCtWwmJ7j/ZEPpcDKbdP1r4/lnvW+w/Wvj+We9b7L/ZEPpcDKbdP6EbSOdmjOg//5FgMAOH5D//kWAwA4fkv6EbSOdmjOg/KbF5Phu/tj8HM/cimd/vPwcz9yKZ3++/KbF5Phu/tj/tMeEUFvLvP8mOgPkG1K0/yY6A+QbUrb/tMeEUFvLvP/ydFfVPReU/hjawhz/o5z+GNrCHP+jnv/ydFfVPReU/oN7CIO7M7D/ZwP8XFeXbP9nA/xcV5du/oN7CIO7M7D9IcBncYwHVP4XOdewzOu4/hc517DM67r9IcBncYwHVP8CjHOXW9+4/0v25Bhgf0D/S/bkGGB/Qv8CjHOXW9+4/lr3tVa4y4D9eFdkf+pjrP14V2R/6mOu/lr3tVa4y4D+UdUXxrobpP+FNwVJSTOM/4U3BUlJM47+UdUXxrobpP+ckvkCJncE/TdWBxg2y7z9N1YHGDbLvv+ckvkCJncE/Kd77fO2b7z+TSNtXL/LDP5NI21cv8sO/Kd77fO2b7z+4m07TM9PiP3IktO2C4Ok/ciS07YLg6b+4m07TM9PiPyV53gl0S+s/7IWPhwW04D/shY+HBbTgvyV53gl0S+s/mgkBPxb1zT8IRyi+ehzvPwhHKL56HO+/mgkBPxb1zT9UDyjZZgfuPwLCiFxZHdY/AsKIXFkd1r9UDyjZZgfuPwncXBJz1No/udJZL2cN7T+50lkvZw3tvwncXBJz1No/W7OQG/uC5z9IdE8mC7XlP0h0TyYLteW/W7OQG/uC5z95YfhvOWqkPxTACEJ8+e8/FMAIQnz57795YfhvOWqkP679JeRV++8/f8FC24VGoT9/wULbhUahv679JeRV++8/XDQ+597Z5T9kRzAsxWDnP2RHMCzFYOe/XDQ+597Z5T/hpOXGVSLtPxvz29MMedo/G/Pb0wx52r/hpOXGVSLtP8tjrZyUe9Y/nKWbauP17T+cpZtq4/Xtv8tjrZyUe9Y/zglG/Bco7z/uvSxNdzHNP+69LE13Mc2/zglG/Bco7z+2xEu40N7gP/N786UVMes/83vzpRUx67+2xEu40N7gP95JMfH0/ek/WOt66Haq4j9Y63rodqriv95JMfH0/ek/iPp5f7G4xD8IrIVP8ZPvPwishU/xk++/iPp5f7G4xD+3rWaN0bjvP4ZnsrxN1sA/hmeyvE3WwL+3rWaN0bjvP41/gRtTdOM/4X+9Qj9o6T/hf71CP2jpv41/gRtTdOM/DcS2oEmy6z/hgivIQAfgP+GCK8hAB+C/DcS2oEmy6z8eZusFToDQP0SlUEwH6+4/RKVQTAfr7r8eZusFToDQP17Ogf+NSu4/84Ib0VOi1D/zghvRU6LUv17Ogf+NSu4/KTEmR20/3D+Z2gAK4rbsP5naAArituy/KTEmR20/3D/6Um51iwnoP6aa2RyoH+U/pprZHKgf5b/6Um51iwnoP2QwRk5he7A/kWGCAgHv7z+RYYICAe/vv2QwRk5he7A/htjpK+nj7z8KTU1Kdy61PwpNTUp3LrW/htjpK+nj7z/xImdRea3kP5Whmh0KbOg/laGaHQps6L/xImdRea3kP9eqnokVc+w/nWCoK9BM3T+dYKgr0Ezdv9eqnokVc+w/q7ZT4/WD0z9aFqUp23nuP1oWpSnbee6/q7ZT4/WD0z+y9hpLz8LuP0Py6Pv3otE/Q/Lo+/ei0b+y9hpLz8LuP/73vwYZCN8/R7GhJZ386z9HsaElnfzrv/73vwYZCN8//l5XQ3kL6T+ABr7qM+vjP4AGvuoz6+O//l5XQ3kL6T/BfTA7U/+8P1RDkQNHy+8/VEORA0fL77/BfTA7U/+8PyoyGpwpeu8//8QIjf0Kxz//xAiN/QrHvyoyGpwpeu8/4hMsZi0v4j8j9ZAQyVTqPyP1kBDJVOq/4hMsZi0v4j/v7EXzaODqP7zi2+Q2XuE/vOLb5DZe4b/v7EXzaODqP6u589Xx5Mo/tKu8BiJJ7z+0q7wGIknvv6u589Xx5Mo/mnWVQ56/7T+u3xPm9ZTXP67fE+b1lNe/mnWVQ56/7T+PlKu3VWXZP3+KiHJxX+0/f4qIcnFf7b+PlKu3VWXZP3VbyZnK+OY/W1N/QxVH5j9bU39DFUfmv3VbyZnK+OY/y5e5ailqjz/RO8VDCf/vP9E7xUMJ/++/y5e5ailqjz93y3BoHP7vPyay+iFN/ZU/JrL6IU39lb93y3BoHP7vP/8i7E/kIuY/v0EOlqwb5z+/QQ6WrBvnv/8i7E/kIuY/JHUYG1tL7T/y+Q1EfcHZP/L5DUR9wdm/JHUYG1tL7T+SECbJYzfXP1qRivP+0e0/WpGK8/7R7b+SECbJYzfXP2W8G7xrPu8/rV3xNGOpyz+tXfE0Y6nLv2W8G7xrPu8/TyXuz+kz4T+2V5/Yj/vqP7ZXn9iP++q/TyXuz+kz4T/GO1lKGDjqPxBxu0xzWOI/EHG7THNY4r/GO1lKGDjqPw2DHYMaRcY/DMZASg+D7z8MxkBKD4Pvvw2DHYMaRcY/9pp9O27F7z8/quT9t46+Pz+q5P23jr6/9pp9O27F7z8YxYFJxMPjPxWoxR+kKuk/FajFH6Qq6b8YxYFJxMPjP8FUEWEb5Os/o81W5t5f3z+jzVbm3l/fv8FUEWEb5Os/eJPG7z5C0T8JkJleg9DuPwmQmV6D0O6/eJPG7z5C0T+nU13FYWruP3HCbumb49M/ccJu6Zvj07+nU13FYWruPyHN4a5L89w/E5wCh/WJ7D8TnAKH9YnsvyHN4a5L89w/+oOvEXFL6D9/n1htvNPkP3+fWG280+S/+oOvEXFL6D+ZosUSn52zP2AtSIXq5+8/YC1Ihern77+ZosUSn52zPw9BMCWd6+8/TUTtdJYMsj9NRO10lgyyvw9BMCWd6+8/hqTMJcz55D//RfUTnCroP/9F9ROcKui/hqTMJcz55D9JxLkZj6DsP4lThsN/mdw/iVOGw3+Z3L9JxLkZj6DsP/A2idwQQ9Q/02cEVZ1a7j/TZwRVnVruv/A2idwQQ9Q/UYYHauvd7j/OSRdOW+HQP85JF05b4dC/UYYHauvd7j/e0iRcV7ffPycjDctUy+s/JyMNy1TL67/e0iRcV7ffP2xKrOOQSek/KTDW4yOc4z8pMNbjI5zjv2xKrOOQSek/W7hvregOwD+IjQoPR7/vP4iNCg9Hv++/W7hvregOwD94S8s3p4vvP97LVIYAf8U/3stUhgB/xb94S8s3p4vvP7o8Te+LgeI/XqfA0iYb6j9ep8DSJhvqv7o8Te+LgeI/9aJMKnQW6z9XqdBIcgnhP1ep0EhyCeG/9aJMKnQW6z/ddF1TkG3MP/CuOlpoM+8/8K46Wmgz77/ddF1TkG3MP4GNbQ8W5O0/tgyKY5jZ1j+2DIpjmNnWv4GNbQ8W5O0/wAq1Q2Ud2j/c+8t7/DbtP9z7y3v8Nu2/wAq1Q2Ud2j9CmQeOVT7nPxBq5b18/uU/EGrlvXz+5b9CmQeOVT7nPx075UxPRZw/eabinOD87z95puKc4Pzvvx075UxPRZw/ZJEbu1P37z+GRoeluo2nP4ZGh6W6jae/ZJEbu1P37z/fI/fVAZDlP9KXvwf3pOc/0pe/B/ek57/fI/fVAZDlP3tGzugw+Ow/chmzHZcv2z9yGbMdly/bv3tGzugw+Ow/trOdi+e+1T/ZZtwvoBjuP9lm3C+gGO6/trOdi+e+1T9fj4m8kBDvP0jjLUZruM4/SOMtRmu4zr9fj4m8kBDvP4ywMiARieA/R7z9FI9l6z9HvP0Uj2Xrv4ywMiARieA/wnXwENHC6T8VEERLwvviPxUQREvC++K/wnXwENHC6T+nFkX5eyvDP5EXeqybo+8/kRd6rJuj77+nFkX5eyvDP9z9DMv7qu8/CTT9TZlkwj8JNP1NmWTCv9z9DMv7qu8/H6ZJ7CEk4z+yBiuk36TpP7IGK6TfpOm/H6ZJ7CEk4z/pkueGZn/rP7e4MezzXeA/t7gx7PNd4L/pkueGZn/rPwI4vYB0e88/jHPPFFoE7z+Mc88UWgTvvwI4vYB0e88/ehk5RI8p7j+0Z/QSQGDVP7Rn9BJAYNW/ehk5RI8p7j+TVv0UeIrbP2CgmSez4uw/YKCZJ7Pi7L+TVv0UeIrbPzPT4py4xuc/n2SXUcNq5T+fZJdRw2rlvzPT4py4xuc/F4NfvQGxqj/TvrFU3PTvP9O+sVTc9O+/F4NfvQGxqj+MUxR1+trvP6EwwRKHT7g/oTDBEodPuL+MUxR1+trvP6IyK2laYOQ/iB3eHoes6D+IHd4eh6zov6IyK2laYOQ/BMBBMYNE7D/eQalm//7dP95BqWb//t2/BMBBMYNE7D8gRZVOGsTSPzBrATbsl+4/MGsBNuyX7r8gRZVOGsTSPwBY5pODpu4/ulRVmeZj0j+6VFWZ5mPSvwBY5pODpu4/Jdg8bahX3j/x4zFJ0SzsP/HjMUnRLOy/Jdg8bahX3j9VRhh1aszoP4BDKlt/OeQ/gEMqW3855L9VRhh1aszoP1yoJOu237k/nlynLQ3W7z+eXKctDdbvv1yoJOu237k/7jyIVnVn7z8EGMQnF5bIPwQYxCcXlsi/7jyIVnVn7z9ySNxkG9zhP9JaVG5njeo/0lpUbmeN6r9ySNxkG9zhP465LHpUqeo/v3MTF1Cy4T+/cxMXULLhv465LHpUqeo/+iq26UlbyT9daEPtpl3vP11oQ+2mXe+/+iq26UlbyT9GPYvdAJrtPz+Q86pqT9g/P5DzqmpP2L9GPYvdAJrtP0Tt1YZLrNg/T6RFhMSG7T9PpEWExIbtv0Tt1YZLrNg/nOIv7Vyy5j9xnKHq0Y7mP3GcoerRjua/nOIv7Vyy5j+6pMy++CFpPwIdYiH2/+8/Ah1iIfb/77+6pMy++CFpPwAAAAAAAABAAAAAAAAA8D8AAAAAAADgPwAAAAAAANA/AAAAAAAAwD8AAAAAAACwPwAAAAAAAKA/AAAAAAAAkD8AAAAAAACAPwAAAAAAAHA/AAAAAAAAYD8ACAgICAgHBwYGBQAICAgICAgICAgIAABYq/It2DfREXT59T/2QAxZt3W5hR3kmDj5j4VQ72SpIOtXOJeu0QcRN+ogksIe/gc5pDfNyq9dA0JtIQaD2UQBVRb46u5rbQBMqG8NoOEgAJzanc3dzQgAtNzcwy8ZAgDpVzzN33EAAOt2jZN0FQAA5TMMS5cDAAD+pj2diAAAAMvG3QQSAAAAerLTGwIAAABeHwk4AAAAALB9KAUAAAAAKMVrAAAAAAD7ywcAAAAAAPx/AAAAAAAARgcAAAAAAABeAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHY/39FrdYW/ycAAAGQ/n+J8p8M4QwZHAGI/n9a1T4CGQs8TwFg/n8+Ktd1vuq1OQEY/n86oJs/7y3lBwEA/n/63bpfsVevIwHo/X/5Fjt5oDT1PgHI/X+BiZJiNlMcGQFY/X8zXJ8lMpU7QgEo/X/3+X55nbYbPgEg/X/j/fl0oaEoAQFI/H/ntyx9eOEOFQE4/H9ula52y7mPZQHw+396t8cevZYJSwHA+3+UJ2YY0enzQAGg+3+/70w3zD4BdAFY+38rD8RDxARKUAEo+n88L8Yzs+zKKQHg+X/ILhZxxjLTJAHA+X+zF5VwbbhwCQFo+X/3kH0Bj6koHwFI+X+P9YUTRQ04AgE4+X/ILq0tjKWNQwFw+H9SVghv0QhnBAEQ+H/YCh4YK0nsJgEA+H9e4m1zta1QOwGw93/wM/hcKSLYJQE493/cuTAZTJ1RdgHg9n+yBmFo6sDGEQGo9n9bnIEiDa5kEQFI9n9BNmdCco+XNgEY9n8iEFt7REfaAgHY9X8IOY5cX3eFJgEw9X/HVp9xu/48XwHo9H+6Tx1uCC4zSQG49H+GkGhsJRkeRgGg9H/eVqRCTpXhPgGY9H++VBoDSeSiNwFA9H8wKU0jRlfXUwH4838ViK8PjYhAWgFg83+rz9koAxXrFgFI83+4/Us3eb8KIAE4838SPSIDZaRBawEw838kexpMMGlnUAGQ8n9ZF4UwuPmwWgEY8n9YFRJu+bUhTgG48X+accw2RVa9PAEg8X+8lAso4LhMAgHg8H8AJuwQcie8HwHY8H8bVBlq6rVuNQFg8H8yl4wTVEAmTwEw8H/VlB1OBcQjOQEY8H++5JAY2GgfEQEI8H+Rq3kRRnXLdwHw73/02KsKgBEDUQHA73/Q2nBa4Aa1agGQ739mdk9gI6R2XgGI7381s0UxcuwvJAEo738cPjoA76sScQHo7n/4O81IXwRudgHI7n8QcLxS+HupMgGA7n9V0X5r5JitYgEg7n8xJAE9l+ZPEAHY7X/Y9gxAhxDcGwGw7X+8R5ExnqPVWgF47H+Pdn0qjoTJRQG463+CoTNpu2x4PwGI639lJ2UlV63aUwFQ63/9L6xhQVt6fAHg6n/6Vlxa2tYqKQHI6n/BFS9NYprIEgHA6n8tqsZzYQgHOgGQ6n+2/uBt7PAXfwFI6n8qdH1BOaB7FQEY6n8wt2Rg7t5YdAEA6n+BEKJroWq4ewGo6X8F0TYQTgOAaAEo6X8oMepHVs48eQEA6X8QaiJKbFLwRQHQ6H9HnOE0SsRfTAHw538XqmhiqC4DNgF453/wlrtjvN4yPgFo53/qSxxJDDNvUwHw5n+1hFdXurDyTgHQ5n85W5VEl6kGIQGQ5n+qXzUNP7R4GQEY5n/5BkskksreEgGg5X+e4gtmoEpkZAFw5X+TkJ9NnK80KwE45X99fMwetMi6GQHI5H9bY0QfKQGLYAGo5H+XtcZy4/+WOgGY5H/O9aQb/PcTTQFg5H8cdv8tbd2ONAG443/xAvpZ/CzpMQEw438QqqcNqx/DMgEQ439JkRprWI7eJQEg4n8ix6IqMXj4YwGo4X/aVgs+SDn2CwE44X/N3Jw40mHVawHo4H9avsVjkWuuBQEQ4H+c9Bgwn8onVQHI339s1phTpn9/CQGg33/qRKV+nUW4XgGY339bn5FIYkETXQGI338arioUb7D/BAFY338EglhS8nE7JgEQ33+29klwh5kaWwH43n+4IphPTC3sAwHg3n9qszV3EHRtcgGw3n/Sk0454kxJSQFo3n/PnkQ27TcRdQGo3X+NOKswf8bUGgFw3X/6UIpVhAv2agH43H8fQP8BflDYSwHg3H8JUxQQSa5GUgHI3H/7YlwDktl9TgFQ238lcZR9XCT1UgFw2n9oaldQTh/yKgFY2n9uDFMMc0dvYgEo2n8UpmJwpE8NUwGA2X8DOuhr+1LnAQFA2X8ebN9NgOVdeAEg2X+aOTkCnuTCbQGA2H/483NfJ6xqCQFo2H+Sy+IFZL3ffgFI2H9akKNpWDS/ewEI2H/KMbdTLOL+eAF4139y5sEvlKM8GAEo13+jotAU4qp4WQEA138IE/NbB45CfAG41n8kWSpISzIYaAFw1n/DtVdEaWG0KgFo1n9QBhERMeKzbAH41X9vEVJQEfp4bQHw1X/uQwhr3BcDHwF41X+VMaJNuTPXMgEI1X/uliBAn5QZHgGY03/w7NgLlqxjYAFQ03+/IyoTy6RJCQFA0398yIYwbAt6bAEI038m9AoiL1VlOQHY0n/GCh1ombUlAAGo0n+llpBs2wBnBwEA0n+6m7U2Zi8bSwHY0X89M44W87WIXQFI0X/kynEKG8PQbAEY0X9D/kdldbn1FAGA0H+nruM/LcIcOQEo0H97jRdpJiQ1IAH4z38UmDE///bPNgHgz3/Gcown3ChXVgHYz3+xYgw/+BUuIwGQz3/wgqJloBH7VgFgz3/prGsTZgBKYgFIz3/t0ggshjKrGgGQzn9iQlw5Z906NQF4zn/1N6livguyNQFQzX/mx28OAMdzXQE4zX+MWNwtLt1iSgHwzH/3URoTLhy/HgGwzH9qFbdhdqfyLQHwy3+RtQJpuP15OQHYy39h6QUZ+GcxDAFIy38lILMn8G2ifAEAy38PtEJUEpCFWgEgyn+KYs9Jzy5aHAHwyX91ak0S/sojRgGYyX/XcPV6C2blLgFQyX9R+8FPc68eXQEwyX8p4Q8E8w0yBQEYyX/6zPA2tv6CFwGgyH9BxOYqzM36BwFYyH8qc4JEQ6P1bgE4x38mhjFuwbygTwEgx38WcxNPxKQjBgF4xn9fCyow1OX0RAEgxn9jgSYXs5HTcgHQxX+u5BtV+fO0aAHAxX99dflxvcXOOgFwxX+voal5Md8pFgFgxX9R1ElMzmWjeAFIxX9WjPEqxuDKUgEQxX9PoWJNxt1FZwG4xH9oPFBcIqnNbAFAxH+ItfskYbEAQAEoxH/PizZzzSSTOAEIxH+IbR4Vnhd4YgHYw3+gy2oiIlBjQQGww3+mjVQVt3eHHAGQw38pwEN4VDxrXAFQw387td17peq8bAEIw3/V45Ak9kWbXwHAwn+rdmpXXF3tHQEYwn+7HXxCt+VDPgFwwX99M5UA9kplcQFYwX+8DtRcSziZegEgwX9nSd0mQ38tdQGQv38zvEtXxRDLWgFYv39hUNNv3PuRLQHIvn8h1UJgTCR7cgGwvn+Pqnk6gRItegEIvn+NaBxucZJsKwGQvX+5QI05wNvxIwF4vX8nR5p/B2R/AAEgvX/DXjlc/8lgKQEAvX/6Z1omRWcDdgHYvH+C3T0LtvzEeAGIvH8f2MhiW3J/FgFgvH+ORdoGsUBeOgH4u39uATxlYP1gVgGwu3+rLgdvPfWwZwGIu3/puBktMjJgOwE4u3/KFE43Vq6MRQEQu3/dR/I1Ju50JwFQun+SlXACJ+qFagHwuX/wQH521sxAKAHYuX9714gvpdvcTgGguX/mkUN7J4knVAF4uX8CpoxIv2e8VQEAuX/HrG4YmmlfaQGYuH9Bz2RHB9pxFQFQuH+V318mPv6hHgE4uH9CDFhmkc4MDQFgt3/+K1MFySPWGAEgt38FtVoA01TfUAFgtn/36+w0SuieewEQtn/EEw0Jo2kwYgHwtH+BU9JkCGxmWAF4tH/IxZt2AQ21QwFotH+WMS05AeJPWwFgtH85EAQb0gzaZgEAtH/G7Y1bienZCgHws39qoPshdy3PKQGwsn8oGn0Tq5SNGAHgsX8CoOBjNYJuWgGwsX+elro5v3frXQFgsX+WtYxSjCNyaQEgsX/6RNl1dLxMbQHAsH9J16oFxWU1ZgGosH9P+IQG1dLPPwGQsH/+ywIBWRHaKQFYsH/DFwMhKxm2GQGAr3//e2QObhBtegHYrn8OngdrsJSAPQHQrX9+vUVIvwl8KgGorX8YhCJp4+8CMQGIrX+xqWMmYto3aQF4rX/IPLcGPYdWJgEArX//7LdSfjtcTQG4rH/hJLkuAkmhOwGArH8YT/s1SaAZZAHwq3+RzasvBfDmGwF4q398SDBz09vHGgFQq3/4UgpbleItMgFIq39j4FRKLNpVLAHYqn/zXYFHZkXxFwGoqn9+1vIITEKKZgEoqn9Sv7xMKQOSJwHIqX/DM9YkSupubAGYqX8OXJQ7sHShUwEQqX9VseAE5WnPWgHYqH+IFScHjE+hGwGoqH+9hUwHGtWnfgGAqH/5iHYI0W8MOAGIp3/eav40+5lwHAFYp3/JF1MTWuHoQgFIp3/rYBVGQc3iUQEQp38mBmFCKiOyEQEIpn8aCRM7EyCHXgH4pX+Rc4hTEFFvawHYpX/Od7JdlN57KgFopX+gcAhCnZuFSgHwpH/bBrcLaiU4FQGgpH+yM1Rnoq45PwFwpH/rfyoTQsyiRQEQpH+LLCYeWyO0KwGQon8iVjQ9BI6GOAEIon+wmFU4rrP0fgHooX9kuYZvGtbmbQFwoX+K/bpqoPxVaAEooX/gMRFSUJYYCwH4oH/4nfB+R9XbbwHIoH/QCH1/nOzeTwFYoH/r/zdz1c7WQAFQoH/rUytx8TN5agEooH/MyAU7uasROAHAn39l2NNTMlgxOwGYn3+jwk9LVxY6EQEwnn+T04xYwmVFHgHgnX/E31xw8VWNEgGwnX8/3pdMJtW+EAGAnX8GfA1b5pRaFgFAnX/423tTLBLRCQEQnX94MrolW6mWOQEInX8y0u153mjxTAH4nH8j8DRUbaJfFgEwnH/wWeIqFMPPLgHwm388EbICfcbcMQHQm39MKvxE0du2OwFYm39wR5kQ/B4YfQGYmn9xgCFjWpEUNwHYmX+HM9UvntrpeQGAmX+tRnxsUFROawF4mX8xGbZFYxiTfQFwmH96yp0Hy+JpcAFAmH+NXPQA2+5zQQHIl3+WwLEnt+UXawHgln+zOCw+2k59FgGoln9DA0lnWfCsWQGAln+DQAESSBZbFQF4ln8FsncL9x7LcQFQln+TKDwY3h0ORgEwln/mWD1on/hKHwEYlX8WzMQdBkB2PQH4lH+xJGpwWM9jPQFQlH9kWWdYNefpYwE4lH/xYRdqHE9tMgEglH8dkSsfZV1DbAGok395SB5zmXJNTQFok38LikhyLAnGCAE4k38BQfsAy+ZoUAEgk3881MdvAsLkbgHAkn8dnjUbYyW1agG4kn/VGiBhEE7xCAGgkn+atX1xlwSTFwEYkn+IRVdqNW6OMQGgkX9jlEMP7bOQKQFQkX9u2SgXqj+JDgE4kX8YVI0sAmc5UwHgkH//qz4e8SL8cAFIkH8gt5MiPcPoeQEYkH/Mw3Yqy3nNLgHoj3+gL+1V7+7/HwGgj3+Ww6cU3ey8ZwEwj3/FydgQ1jZBAQH4jn/kE+RTjXAREwGIjn/EBYVgBrm6WAFwjn9A1ol8FhXtdwHwjX9APqhl+CYrYAGojH/p5gpuCSlVTAFgjH8jo/k6/IWrRgHIi39irrxa6zk4FgFoi3+x/Dpka9fsDAEoi3+8ASl7KO5kagEgi3+WxakcE3ozWgGYin+wfooy2/smMwGAin8y8N5hCKdeXgFQin/F7xE4VAm2CgFIin9KB9ASRNJ+OQG4iH+zkMQTIuSTLQFYiH8vREl+JHVOTgFAiH/jlfEeoY3yHgGwh39COftaIPp6aQFQh39C3NkgVX/rMAE4h39y5KhSrfkoHAHwhn+C/oAwU2wuVAHAhn/0T0dgI+7sXwHQhX/Dap5QJeYhZQGAhX/Bw4E+6DF4XgEohX/1vdQxvrKhOAEIhX/Ne+Fciox7YQHAhH/fUgVnBazNYwGYhH/G2fpm0PZrWAFohH/zniNBDDjQZwEwhH9DaywpdZoTSgHog38sem1pcX9nfgGog3/3zrVnSRgSVQGgg39/OzhcYmUiJQFIg3+N9kZQ7nixXwEwg388WAMWf0VgMQEog3/XEwJdA9WTagHggn/XDqxNvjB4IwFYgn+W37xQMcItIgE4gn/oY6IDm/PLNAHwgX+tnjEVd9HHSAHYgX8CxMMhZEDCZgHYgH9pFfEz7mzpXwHAgH/ifBpYwb/MQwFYgH+aPI9uu5aAOQG4f3/XdRAMEGkXLQGAf3+d921Ty1+9NAFAf3+mr6U+tJKpRwEQf3+GqslliiKvJQGofn9Tp1h5wlfODQHQfX/kmfUKHzj4MQG4fX+F96NTqpIbGAFYfX9zbIcSwa13TAEwfX+pPy9PH90qBgEYfX9B4LIETdA3OwEQfX8r/KhOadLvPgHAe3+4i+gWZZWyZQGoe3+zxqlAeSQuGAFQe39cjOkXDRIcdQEge3985ExucQtVSgEAe3+NLRw0XfnwXQHYen82bcdGJz04OwG4en8IKj5qUxEuPgGoen9Hns5Iuy+xLwGQen8Y+6QYzlJ3VgHoeX8U7wwsENZrFAFYeX98kNBQjjEYKAEgeX8aIUMkDFy5WwHweH9yox9WFm/xKAGQeH/qDeQc9oeKVQFQeH89hCcgtdXqTAEIeH+u3sh8VorfdwG4d39sW4hEu8koQAGgd39O4hsyuY+0fQFwd3/zTX8M/d7PCwFId38Ch8V1wIgdTAHIdn/IOJRQ/XXUdQFQdn81HlJs1WP5dQHYdX/50Dt0CEcgDAFodX+ByC02PYx0JQFgdX+wRBsN6JY1LQEIdX+r9uFNqkpEOgGodH9iq88Rl2x9dwFwdH+YHFAafICGPgEwdH+Mv3ZaqUn3VQG4c38dkNFQH1ktYgHgcn9fMqsf2uAaaAGQcn/ytTZx/HeTLgFgcn81dxds44O1YAE4cn+7CcJAZ34ePQEYcn8rRiN3+vtLMQHwcX/i2IRy5Q6vLAHgcH+UA51gPzTEfgHQcH+dJmQxGU7UcAGYcH8rgrEK52HtWgE4cH+jlLIk6qoTSwH4b3/QlAN5AggxZwHwb38sfGh8M9EHYQHIb3/oiYgH2IQUQgF4b392cJ4qkiStPAEwb3+tB/RkkIGSUAGYbX/TNeBMZeLEPgEQbX9SousLlXbBSgHAbH919Bw45BB3NQGAbH8+crosjTiRSgEgbH/vqJEvkGrwFQEIbH+Hgl00sZG2PQHAa38KsI4AvsPvRAGQa38OMGRSX9uGZAEYa39SSTJQi34zZAHIan+xAcAxr3SVJQFQan/hfh5iswbHcAGAaX9NvW0uDWPjAgF4aX9zfSpnlXEfZgHoaH9jowQwXzYwUgFAaH90BC4M5Cg9dAEQaH+6eBZ0wTp0WQHoZ3+11+gq/PBgWQGIZ389aLwNbbopIQHAZn8lG2M64ziaGAHAZX/gu003YcR5dAGQZX//jSJKoDFSMwHQZH+FM/NPslpzOgHIZH8O0t831T7iagHwY3/8ymcvXcIOVAHAY3/zW/wITwk+dQHQYn/iebwJN2SXcwGoYn/LlWF0dRg8LQF4Yn9xiwUiep4IDQFIYn+qrwxxyXPueQEwYn+SLl4VWxnjHgEoYn811LRZqAo3KAEQYn+/46kBEmOHMQHoYX/JYDYaBoSzXAHQYX8jhyUv/w2MbwG4YX+ydsEZmCljMAGYYX9t6+9QCaGhRgGIYX+7F7QeJ2ZDZgFoYX/jXFoY8adQfAFYYX9/yQl9U6xxUAHgYH9y98lcs6VsVgGAYH+6ZyJcpOqdUQHYX3/KHNMTKgIxBgGQX38CBmhZk9EeYwHgXn9xZxUzGk9IAAFwXn8IcCl0+ykAIgFoXn9oz4MDwh17XQFQXn8jZcp+BP9OEAHAXX8X6qAGnI1oRgEgXX+mQv5gE54nZAFwXH8Z495dw8vVAAEYXH+vytUAy4ZNQwHgW38jOCMCdSCWbQHIW38S0n0StORLUQFwW3+StxtgVJEBXQGwWn9jvtxDHECvLwEIWn8vuuYjzFFrVQFgWX/xStwKnvBqcgFAWX89PFIT/7feCQEoWX8ZS6cLIa7xDAHQWH+ucqE+j+MBOAGIWH+dcW5wLB6OYAEQWH8wfFYkRQ0XAgH4V3+YF34ojLiPVgHAV38PvaoHibMpMQE4V3/I7i0BJqz1WgEwV38keJ8pJ3Y7WwFwVn9la3ViBUKTawHgVX+ldXcTutwVFAGwVX96K8UDd5GLcQFQVX/MbZsSi0tDCgGQVH8RmLkW3v3+FQF4VH8FKGEVOonAYQFIVH9E1Y4eyVaBBAEgVH9yNt98BSFtdQHwU38i9dJxo5MNIAF4U3+DoIxPAypnWwEwU3/Ax/J8WlzjagH4Un+9ORdx97ODEQHQUn+uzgw36n30PAFAUn9fHVBXajNOWgE4Un9gH3F4CBLiegHwUX+nO1URmYgqbAFoUX+Wt1IJAQyNSgG4UH/k4LoRzF97QwEYUH/owBwgbIWpZAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAACAAAAAgAAAAQAAAAHAAAADgAAABsAAAA1AAAAagAAANEAAAAAAAAAAgAAAAIAAAAFAAAABwAAAAwAAAAVAAAAKAAAAE4AAACdAAAANAEAAAAAAAAAAAAABAAAAAAAAAALAAAAAQAAABgAAAABAAAAMgAAAAEAAABmAAAAAQAAAMoAAAACAAAAkQEAAAQAAAAaAwAABQAAACkGAAAIAAAAQgwAAA0AAACkGAAAGQAAAAAAAAAAAAAAAAAAAgABAAOAAIACgAGAA0AAQAJAAUADwADAAsABwAMgACACIAEgA6AAoAKgAaADYABgAmABYAPgAOAC4AHgAxAAEAIQARADkACQApABkANQAFACUAFQA9AA0ALQAdADMAAwAjABMAOwALACsAGwA3AAcAJwAXAD8ADwAvAB8AMIAAgCCAEIA4gAiAKIAYgDSABIAkgBSAPIAMgCyAHIAygAKAIoASgDqACoAqgBqANoAGgCaAFoA+gA6ALoAegDGAAYAhgBGAOYAJgCmAGYA1gAWAJYAVgD2ADYAtgB2AM4ADgCOAE4A7gAuAK4AbgDeAB4AngBeAP4APgC+AH4AwQABAIEAQQDhACEAoQBhANEAEQCRAFEA8QAxALEAcQDJAAkAiQBJAOkAKQCpAGkA2QAZAJkAWQD5ADkAuQB5AMUABQCFAEUA5QAlAKUAZQDVABUAlQBVAPUANQC1AHUAzQANAI0ATQDtAC0ArQBtAN0AHQCdAF0A/QA9AL0AfQDDAAMAgwBDAOMAIwCjAGMA0wATAJMAUwDzADMAswBzAMsACwCLAEsA6wArAKsAawDbABsAmwBbAPsAOwC7AHsAxwAHAIcARwDnACcApwBnANcAFwCXAFcA9wA3ALcAdwDPAA8AjwBPAO8ALwCvAG8A3wAfAJ8AXwD/AD8AvwB/AMCAAICAgECA4IAggKCAYIDQgBCAkIBQgPCAMICwgHCAyIAIgIiASIDogCiAqIBogNiAGICYgFiA+IA4gLiAeIDEgASAhIBEgOSAJICkgGSA1IAUgJSAVID0gDSAtIB0gMyADICMgEyA7IAsgKyAbIDcgByAnIBcgPyAPIC8gHyAwoACgIKAQoDigCKAooBigNKAEoCSgFKA8oAygLKAcoDKgAqAioBKgOqAKoCqgGqA2oAagJqAWoD6gDqAuoB6gMaABoCGgEaA5oAmgKaAZoDWgBaAloBWgPaANoC2gHaAzoAOgI6AToDugC6AroBugN6AHoCegF6A/oA+gL6AfoDBgAGAgYBBgOGAIYChgGGA0YARgJGAUYDxgDGAsYBxgMmACYCJgEmA6YApgKmAaYDZgBmAmYBZgPmAOYC5gHmAxYAFgIWARYDlgCWApYBlgNWAFYCVgFWA9YA1gLWAdYDNgA2AjYBNgO2ALYCtgG2A3YAdgJ2AXYD9gD2AvYB9gMOAA4CDgEOA44AjgKOAY4DTgBOAk4BTgPOAM4CzgHOAy4ALgIuAS4DrgCuAq4BrgNuAG4CbgFuA+4A7gLuAe4DHgAeAh4BHgOeAJ4CngGeA14AXgJeAV4D3gDeAt4B3gM+AD4CPgE+A74AvgK+Ab4DfgB+An4BfgP+AP4C/gH+AwEAAQIBAQEDgQCBAoEBgQNBAEECQQFBA8EAwQLBAcEDIQAhAiEBIQOhAKECoQGhA2EAYQJhAWED4QDhAuEB4QMRABECEQERA5EAkQKRAZEDUQBRAlEBUQPRANEC0QHRAzEAMQIxATEDsQCxArEBsQNxAHECcQFxA/EA8QLxAfEDCQAJAgkBCQOJAIkCiQGJA0kASQJJAUkDyQDJAskByQMpACkCKQEpA6kAqQKpAakDaQBpAmkBaQPpAOkC6QHpAxkAGQIZARkDmQCZApkBmQNZAFkCWQFZA9kA2QLZAdkDOQA5AjkBOQO5ALkCuQG5A3kAeQJ5AXkD+QD5AvkB+QMFAAUCBQEFA4UAhQKFAYUD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");
var ADDRESS_HRP2 = "lea";
async function generateKeyset(masterSeed = null) {
  const ed25519 = new WasmCrypto(ed25519_default);
  await ed25519.init();
  const falcon = new WasmCrypto(falcon512_default);
  await falcon.init();
  let ed25519Pk, ed25519Sk, falconPk, falconSk;
  if (masterSeed) {
    if (masterSeed.length !== 32) {
      throw new Error("Master seed must be 32 bytes.");
    }
    const ed25519Seed = await deriveSeed(masterSeed, "lea-ed25519-seed", ed25519.exports.seed_bytes());
    ({ pk: ed25519Pk, sk: ed25519Sk } = await ed25519.generateKeypairFromSeed(ed25519Seed));
    const falconSeed = await deriveSeed(masterSeed, "lea-falcon512-seed", falcon.exports.seed_bytes());
    ({ pk: falconPk, sk: falconSk } = await falcon.generateKeypairFromSeed(falconSeed));
  } else {
    ({ pk: ed25519Pk, sk: ed25519Sk } = await ed25519.generateKeypair());
    ({ pk: falconPk, sk: falconSk } = await falcon.generateKeypair());
  }
  const blake3 = await createBLAKE3();
  blake3.init();
  blake3.update(ed25519Pk);
  blake3.update(falconPk);
  const addressHash = blake3.digest("binary");
  const address = encode(ADDRESS_HRP2, addressHash);
  const addressHex = uint8ArrayToHex(addressHash);
  const keyset = [
    [Array.from(ed25519Sk), Array.from(ed25519Pk)],
    [Array.from(falconSk), Array.from(falconPk)]
  ];
  return { keyset, address, addressHex };
}

// node_modules/@getlea/ltm/dist/ltm.web.mjs
var __toBinary2 = /* @__PURE__ */ (() => {
  var table = new Uint8Array(128);
  for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
  return (base64) => {
    var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == "=") - (base64[n - 2] == "=")) * 3 / 4 | 0);
    for (var i2 = 0, j = 0; i2 < n; ) {
      var c0 = table[base64.charCodeAt(i2++)], c1 = table[base64.charCodeAt(i2++)];
      var c2 = table[base64.charCodeAt(i2++)], c3 = table[base64.charCodeAt(i2++)];
      bytes[j++] = c0 << 2 | c1 >> 4;
      bytes[j++] = c1 << 4 | c2 >> 2;
      bytes[j++] = c2 << 6 | c3;
    }
    return bytes;
  };
})();
function __awaiter2(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var Mutex2 = class {
  constructor() {
    this.mutex = Promise.resolve();
  }
  lock() {
    let begin = () => {
    };
    this.mutex = this.mutex.then(() => new Promise(begin));
    return new Promise((res) => {
      begin = res;
    });
  }
  dispatch(fn) {
    return __awaiter2(this, void 0, void 0, function* () {
      const unlock = yield this.lock();
      try {
        return yield Promise.resolve(fn());
      } finally {
        unlock();
      }
    });
  }
};
var _a2;
function getGlobal2() {
  if (typeof globalThis !== "undefined")
    return globalThis;
  if (typeof self !== "undefined")
    return self;
  if (typeof window !== "undefined")
    return window;
  return global;
}
var globalObject2 = getGlobal2();
var nodeBuffer2 = (_a2 = globalObject2.Buffer) !== null && _a2 !== void 0 ? _a2 : null;
var textEncoder3 = globalObject2.TextEncoder ? new globalObject2.TextEncoder() : null;
function hexCharCodesToInt2(a, b) {
  return (a & 15) + (a >> 6 | a >> 3 & 8) << 4 | (b & 15) + (b >> 6 | b >> 3 & 8);
}
function writeHexToUInt82(buf, str) {
  const size = str.length >> 1;
  for (let i = 0; i < size; i++) {
    const index = i << 1;
    buf[i] = hexCharCodesToInt2(str.charCodeAt(index), str.charCodeAt(index + 1));
  }
}
function hexStringEqualsUInt82(str, buf) {
  if (str.length !== buf.length * 2) {
    return false;
  }
  for (let i = 0; i < buf.length; i++) {
    const strIndex = i << 1;
    if (buf[i] !== hexCharCodesToInt2(str.charCodeAt(strIndex), str.charCodeAt(strIndex + 1))) {
      return false;
    }
  }
  return true;
}
var alpha2 = "a".charCodeAt(0) - 10;
var digit2 = "0".charCodeAt(0);
function getDigestHex2(tmpBuffer, input, hashLength) {
  let p = 0;
  for (let i = 0; i < hashLength; i++) {
    let nibble = input[i] >>> 4;
    tmpBuffer[p++] = nibble > 9 ? nibble + alpha2 : nibble + digit2;
    nibble = input[i] & 15;
    tmpBuffer[p++] = nibble > 9 ? nibble + alpha2 : nibble + digit2;
  }
  return String.fromCharCode.apply(null, tmpBuffer);
}
var getUInt8Buffer2 = nodeBuffer2 !== null ? (data) => {
  if (typeof data === "string") {
    const buf = nodeBuffer2.from(data, "utf8");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  if (nodeBuffer2.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.length);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("Invalid data type!");
} : (data) => {
  if (typeof data === "string") {
    return textEncoder3.encode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("Invalid data type!");
};
var base64Chars2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64Lookup2 = new Uint8Array(256);
for (let i = 0; i < base64Chars2.length; i++) {
  base64Lookup2[base64Chars2.charCodeAt(i)] = i;
}
function getDecodeBase64Length2(data) {
  let bufferLength = Math.floor(data.length * 0.75);
  const len = data.length;
  if (data[len - 1] === "=") {
    bufferLength -= 1;
    if (data[len - 2] === "=") {
      bufferLength -= 1;
    }
  }
  return bufferLength;
}
function decodeBase642(data) {
  const bufferLength = getDecodeBase64Length2(data);
  const len = data.length;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = base64Lookup2[data.charCodeAt(i)];
    const encoded2 = base64Lookup2[data.charCodeAt(i + 1)];
    const encoded3 = base64Lookup2[data.charCodeAt(i + 2)];
    const encoded4 = base64Lookup2[data.charCodeAt(i + 3)];
    bytes[p] = encoded1 << 2 | encoded2 >> 4;
    p += 1;
    bytes[p] = (encoded2 & 15) << 4 | encoded3 >> 2;
    p += 1;
    bytes[p] = (encoded3 & 3) << 6 | encoded4 & 63;
    p += 1;
  }
  return bytes;
}
var MAX_HEAP2 = 16 * 1024;
var WASM_FUNC_HASH_LENGTH2 = 4;
var wasmMutex2 = new Mutex2();
var wasmModuleCache2 = /* @__PURE__ */ new Map();
function WASMInterface2(binary, hashLength) {
  return __awaiter2(this, void 0, void 0, function* () {
    let wasmInstance = null;
    let memoryView = null;
    let initialized = false;
    if (typeof WebAssembly === "undefined") {
      throw new Error("WebAssembly is not supported in this environment!");
    }
    const writeMemory = (data, offset = 0) => {
      memoryView.set(data, offset);
    };
    const getMemory = () => memoryView;
    const getExports = () => wasmInstance.exports;
    const setMemorySize = (totalSize) => {
      wasmInstance.exports.Hash_SetMemorySize(totalSize);
      const arrayOffset = wasmInstance.exports.Hash_GetBuffer();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      memoryView = new Uint8Array(memoryBuffer, arrayOffset, totalSize);
    };
    const getStateSize = () => {
      const view = new DataView(wasmInstance.exports.memory.buffer);
      const stateSize = view.getUint32(wasmInstance.exports.STATE_SIZE, true);
      return stateSize;
    };
    const loadWASMPromise = wasmMutex2.dispatch(() => __awaiter2(this, void 0, void 0, function* () {
      if (!wasmModuleCache2.has(binary.name)) {
        const asm = decodeBase642(binary.data);
        const promise = WebAssembly.compile(asm);
        wasmModuleCache2.set(binary.name, promise);
      }
      const module = yield wasmModuleCache2.get(binary.name);
      wasmInstance = yield WebAssembly.instantiate(module, {
        // env: {
        //   emscripten_memcpy_big: (dest, src, num) => {
        //     const memoryBuffer = wasmInstance.exports.memory.buffer;
        //     const memView = new Uint8Array(memoryBuffer, 0);
        //     memView.set(memView.subarray(src, src + num), dest);
        //   },
        //   print_memory: (offset, len) => {
        //     const memoryBuffer = wasmInstance.exports.memory.buffer;
        //     const memView = new Uint8Array(memoryBuffer, 0);
        //     console.log('print_int32', memView.subarray(offset, offset + len));
        //   },
        // },
      });
    }));
    const setupInterface = () => __awaiter2(this, void 0, void 0, function* () {
      if (!wasmInstance) {
        yield loadWASMPromise;
      }
      const arrayOffset = wasmInstance.exports.Hash_GetBuffer();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      memoryView = new Uint8Array(memoryBuffer, arrayOffset, MAX_HEAP2);
    });
    const init = (bits = null) => {
      initialized = true;
      wasmInstance.exports.Hash_Init(bits);
    };
    const updateUInt8Array = (data) => {
      let read = 0;
      while (read < data.length) {
        const chunk = data.subarray(read, read + MAX_HEAP2);
        read += chunk.length;
        memoryView.set(chunk);
        wasmInstance.exports.Hash_Update(chunk.length);
      }
    };
    const update = (data) => {
      if (!initialized) {
        throw new Error("update() called before init()");
      }
      const Uint8Buffer = getUInt8Buffer2(data);
      updateUInt8Array(Uint8Buffer);
    };
    const digestChars = new Uint8Array(hashLength * 2);
    const digest = (outputType, padding = null) => {
      if (!initialized) {
        throw new Error("digest() called before init()");
      }
      initialized = false;
      wasmInstance.exports.Hash_Final(padding);
      if (outputType === "binary") {
        return memoryView.slice(0, hashLength);
      }
      return getDigestHex2(digestChars, memoryView, hashLength);
    };
    const save = () => {
      if (!initialized) {
        throw new Error("save() can only be called after init() and before digest()");
      }
      const stateOffset = wasmInstance.exports.Hash_GetState();
      const stateLength = getStateSize();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      const internalState = new Uint8Array(memoryBuffer, stateOffset, stateLength);
      const prefixedState = new Uint8Array(WASM_FUNC_HASH_LENGTH2 + stateLength);
      writeHexToUInt82(prefixedState, binary.hash);
      prefixedState.set(internalState, WASM_FUNC_HASH_LENGTH2);
      return prefixedState;
    };
    const load = (state) => {
      if (!(state instanceof Uint8Array)) {
        throw new Error("load() expects an Uint8Array generated by save()");
      }
      const stateOffset = wasmInstance.exports.Hash_GetState();
      const stateLength = getStateSize();
      const overallLength = WASM_FUNC_HASH_LENGTH2 + stateLength;
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      if (state.length !== overallLength) {
        throw new Error(`Bad state length (expected ${overallLength} bytes, got ${state.length})`);
      }
      if (!hexStringEqualsUInt82(binary.hash, state.subarray(0, WASM_FUNC_HASH_LENGTH2))) {
        throw new Error("This state was written by an incompatible hash implementation");
      }
      const internalState = state.subarray(WASM_FUNC_HASH_LENGTH2);
      new Uint8Array(memoryBuffer, stateOffset, stateLength).set(internalState);
      initialized = true;
    };
    const isDataShort = (data) => {
      if (typeof data === "string") {
        return data.length < MAX_HEAP2 / 4;
      }
      return data.byteLength < MAX_HEAP2;
    };
    let canSimplify = isDataShort;
    switch (binary.name) {
      case "argon2":
      case "scrypt":
        canSimplify = () => true;
        break;
      case "blake2b":
      case "blake2s":
        canSimplify = (data, initParam) => initParam <= 512 && isDataShort(data);
        break;
      case "blake3":
        canSimplify = (data, initParam) => initParam === 0 && isDataShort(data);
        break;
      case "xxhash64":
      // cannot simplify
      case "xxhash3":
      case "xxhash128":
      case "crc64":
        canSimplify = () => false;
        break;
    }
    const calculate = (data, initParam = null, digestParam = null) => {
      if (!canSimplify(data, initParam)) {
        init(initParam);
        update(data);
        return digest("hex", digestParam);
      }
      const buffer = getUInt8Buffer2(data);
      memoryView.set(buffer);
      wasmInstance.exports.Hash_Calculate(buffer.length, initParam, digestParam);
      return getDigestHex2(digestChars, memoryView, hashLength);
    };
    yield setupInterface();
    return {
      getMemory,
      writeMemory,
      getExports,
      setMemorySize,
      init,
      update,
      digest,
      save,
      load,
      calculate,
      hashLength
    };
  });
}
var mutex$l2 = new Mutex2();
var mutex$k2 = new Mutex2();
var uint32View2 = new DataView(new ArrayBuffer(4));
var mutex$j2 = new Mutex2();
var name$h2 = "blake3";
var data$h2 = "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IQEgAkFAaiICQcAASw0ACwsCQEHAACAHQf8BcSIGayIFIAIgBSACSRsiCUUNACAJQQNxIQtBACEFAkAgCUEESQ0AIAAgBmohByAJQfwAcSEIQQAhBQNAIAcgBWoiAkEoaiABIAVqIgotAAA6AAAgAkEpaiAKQQFqLQAAOgAAIAJBKmogCkECai0AADoAACACQStqIApBA2otAAA6AAAgCCAFQQRqIgVHDQALCwJAIAtFDQAgASAFaiEBIAUgBmogAGpBKGohBQNAIAUgAS0AADoAACABQQFqIQEgBUEBaiEFIAtBf2oiCw0ACwsgAC0AaCEHCyAAIAcgCWo6AGggA0HAAGokAAveAwQFfwN+BX8GfiMAQdABayIBJAACQCAAe6ciAkEALQCQigEiA08NAEEALQCKigFBBHIhBCABQShqIQVBACkDmIkBIQBBACkDkIkBIQZBACkDiIkBIQdBACkDgIkBIQggAyEJA0AgASAANwMYIAEgBjcDECABIAc3AwggASAINwMAIAEgA0EFdCIDQdGJAWoiCikDADcDKCABIANB2YkBaiILKQMANwMwIAEgA0HhiQFqIgwpAwA3AzggASADQemJAWoiDSkDADcDQCABIANB8YkBaikDADcDSCABIANB+YkBaikDADcDUCABIANBgYoBaikDADcDWCADQYmKAWopAwAhDiABQcAAOgBoIAEgDjcDYCABQgA3AyAgASAEOgBpIAEgADcDiAEgASAGNwOAASABIAc3A3ggASAINwNwIAFBkAFqIAFB8ABqIAVBwABCACAEQf8BcRACIAEpA7ABIQ4gASkDkAEhDyABKQO4ASEQIAEpA5gBIREgASkDwAEhEiABKQOgASETIA0gASkDyAEgASkDqAGFNwMAIAwgEiAThTcDACALIBAgEYU3AwAgCiAOIA+FNwMAIAlBf2oiCUH/AXEiAyACSw0AC0EAIAk6AJCKAQsgAUHQAWokAAvHCQIKfwV+IwBB4AJrIgUkAAJAAkAgAUGACEsNACAFIAA2AvwBIAVB/AFqIAFBgAhGIgZBECACQQEgA0EBQQIgBBABIAZBCnQiByABTw0BIAVB4ABqIgZCADcDACAFQdgAaiIIQgA3AwAgBUHQAGoiCUIANwMAIAVByABqIgpCADcDACAFQcAAaiILQgA3AwAgBUE4aiIMQgA3AwAgBUEwaiINQgA3AwAgBSADOgBqIAVCADcDKCAFQQA7AWggBUEAKQOAiQE3AwAgBUEAKQOIiQE3AwggBUEAKQOQiQE3AxAgBUEAKQOYiQE3AxggBSABQYAIRiIOrSACfDcDICAFIAAgB2pBACABIA4bEAQgBUGIAWpBMGogDSkDADcDACAFQYgBakE4aiAMKQMANwMAIAUgBSkDACIPNwOIASAFIAUpAwgiEDcDkAEgBSAFKQMQIhE3A5gBIAUgBSkDGCISNwOgASAFIAUpAyg3A7ABIAUtAGohACAFLQBpIQcgBSkDICECIAUtAGghASAFQYgBakHAAGogCykDADcDACAFQYgBakHIAGogCikDADcDACAFQYgBakHQAGogCSkDADcDACAFQYgBakHYAGogCCkDADcDACAFQYgBakHgAGogBikDADcDACAFIAE6APABIAUgAjcDqAEgBSAAIAdFckECciIAOgDxASAFIBI3A5gCIAUgETcDkAIgBSAQNwOIAiAFIA83A4ACIAVBoAJqIAVBgAJqIAVBsAFqIAEgAiAAQf8BcRACIAUpA8ACIQIgBSkDoAIhDyAFKQPIAiEQIAUpA6gCIREgBSkD0AIhEiAFKQOwAiETIAQgDkEFdGoiASAFKQPYAiAFKQO4AoU3AxggASASIBOFNwMQIAEgECARhTcDCCABIAIgD4U3AwBBAkEBIA4bIQYMAQsgAEIBIAFBf2pBCnZBAXKteUI/hYYiD6dBCnQiDiACIAMgBRAGIQcgACAOaiABIA5rIA9C////AYMgAnwgAyAFQcAAQSAgDkGACEsbahAGIQECQCAHQQFHDQAgBCAFKQMANwMAIAQgBSkDCDcDCCAEIAUpAxA3AxAgBCAFKQMYNwMYIAQgBSkDIDcDICAEIAUpAyg3AyggBCAFKQMwNwMwIAQgBSkDODcDOEECIQYMAQtBACEGQQAhAAJAIAEgB2oiCUECSQ0AIAlBfmoiCkEBdkEBaiIGQQNxIQ5BACEHAkAgCkEGSQ0AIAZB/P///wdxIQhBACEHIAVBiAFqIQEgBSEAA0AgASAANgIAIAFBDGogAEHAAWo2AgAgAUEIaiAAQYABajYCACABQQRqIABBwABqNgIAIABBgAJqIQAgAUEQaiEBIAggB0EEaiIHRw0ACwsgCkF+cSEIAkAgDkUNACAFIAdBBnRqIQEgBUGIAWogB0ECdGohAANAIAAgATYCACABQcAAaiEBIABBBGohACAOQX9qIg4NAAsLIAhBAmohAAsgBUGIAWogBkEBQgBBACADQQRyQQBBACAEEAEgACAJTw0AIAQgBkEFdGoiASAFIAZBBnRqIgApAwA3AwAgASAAKQMINwMIIAEgACkDEDcDECABIAApAxg3AxggBkEBaiEGCyAFQeACaiQAIAYLrRAIAn8EfgF/AX4EfwR+BH8EfiMAQfABayIBJAACQCAARQ0AAkBBAC0AkIoBIgINACABQTBqQQApA9CJATcDACABQThqQQApA9iJATcDACABQQApA6CJASIDNwMAIAFBACkDqIkBIgQ3AwggAUEAKQOwiQEiBTcDECABQQApA7iJASIGNwMYIAFBACkDyIkBNwMoQQAtAIqKASECQQAtAImKASEHQQApA8CJASEIQQAtAIiKASEJIAFBwABqQQApA+CJATcDACABQcgAakEAKQPoiQE3AwAgAUHQAGpBACkD8IkBNwMAIAFB2ABqQQApA/iJATcDACABQeAAakEAKQOAigE3AwAgASAJOgBoIAEgCDcDICABIAIgB0VyIgJBAnI6AGkgAUEoaiEKQgAhCEGACSELIAJBCnJB/wFxIQwDQCABQbABaiABIAogCUH/AXEgCCAMEAIgASABKQPQASINIAEpA7ABhTcDcCABIAEpA9gBIg4gASkDuAGFNwN4IAEgASkD4AEiDyABKQPAAYU3A4ABIAEgASkD6AEiECAGhTcDqAEgASAPIAWFNwOgASABIA4gBIU3A5gBIAEgDSADhTcDkAEgASAQIAEpA8gBhTcDiAEgAEHAACAAQcAASRsiEUF/aiESAkACQCARQQdxIhMNACABQfAAaiECIAshByARIRQMAQsgEUH4AHEhFCABQfAAaiECIAshBwNAIAcgAi0AADoAACAHQQFqIQcgAkEBaiECIBNBf2oiEw0ACwsCQCASQQdJDQADQCAHIAIpAAA3AAAgB0EIaiEHIAJBCGohAiAUQXhqIhQNAAsLIAhCAXwhCCALIBFqIQsgACARayIADQAMAgsLAkACQAJAQQAtAImKASIHQQZ0QQBBAC0AiIoBIhFrRg0AIAEgEToAaCABQQApA4CKATcDYCABQQApA/iJATcDWCABQQApA/CJATcDUCABQQApA+iJATcDSCABQQApA+CJATcDQCABQQApA9iJATcDOCABQQApA9CJATcDMCABQQApA8iJATcDKCABQQApA8CJASIINwMgIAFBACkDuIkBIgM3AxggAUEAKQOwiQEiBDcDECABQQApA6iJASIFNwMIIAFBACkDoIkBIgY3AwAgAUEALQCKigEiEyAHRXJBAnIiCzoAaSATQQRyIRNBACkDmIkBIQ1BACkDkIkBIQ5BACkDiIkBIQ9BACkDgIkBIRAMAQtBwAAhESABQcAAOgBoQgAhCCABQgA3AyAgAUEAKQOYiQEiDTcDGCABQQApA5CJASIONwMQIAFBACkDiIkBIg83AwggAUEAKQOAiQEiEDcDACABQQAtAIqKAUEEciITOgBpIAEgAkF+aiICQQV0IgdByYoBaikDADcDYCABIAdBwYoBaikDADcDWCABIAdBuYoBaikDADcDUCABIAdBsYoBaikDADcDSCABIAdBqYoBaikDADcDQCABIAdBoYoBaikDADcDOCABIAdBmYoBaikDADcDMCABIAdBkYoBaikDADcDKCATIQsgECEGIA8hBSAOIQQgDSEDIAJFDQELIAJBf2oiB0EFdCIUQZGKAWopAwAhFSAUQZmKAWopAwAhFiAUQaGKAWopAwAhFyAUQamKAWopAwAhGCABIAM3A4gBIAEgBDcDgAEgASAFNwN4IAEgBjcDcCABQbABaiABQfAAaiABQShqIhQgESAIIAtB/wFxEAIgASATOgBpIAFBwAA6AGggASAYNwNAIAEgFzcDOCABIBY3AzAgASAVNwMoIAFCADcDICABIA03AxggASAONwMQIAEgDzcDCCABIBA3AwAgASABKQPoASABKQPIAYU3A2AgASABKQPgASABKQPAAYU3A1ggASABKQPYASABKQO4AYU3A1AgASABKQPQASABKQOwAYU3A0ggB0UNACACQQV0QemJAWohAiATQf8BcSERA0AgAkFoaikDACEIIAJBcGopAwAhAyACQXhqKQMAIQQgAikDACEFIAEgDTcDiAEgASAONwOAASABIA83A3ggASAQNwNwIAFBsAFqIAFB8ABqIBRBwABCACAREAIgASATOgBpIAFBwAA6AGggASAFNwNAIAEgBDcDOCABIAM3AzAgASAINwMoIAFCADcDICABIA03AxggASAONwMQIAEgDzcDCCABIBA3AwAgASABKQPoASABKQPIAYU3A2AgASABKQPgASABKQPAAYU3A1ggASABKQPYASABKQO4AYU3A1AgASABKQPQASABKQOwAYU3A0ggAkFgaiECIAdBf2oiBw0ACwsgAUEoaiEJQgAhCEGACSELIBNBCHJB/wFxIQoDQCABQbABaiABIAlBwAAgCCAKEAIgASABKQPQASIDIAEpA7ABhTcDcCABIAEpA9gBIgQgASkDuAGFNwN4IAEgASkD4AEiBSABKQPAAYU3A4ABIAEgDSABKQPoASIGhTcDqAEgASAOIAWFNwOgASABIA8gBIU3A5gBIAEgECADhTcDkAEgASAGIAEpA8gBhTcDiAEgAEHAACAAQcAASRsiEUF/aiESAkACQCARQQdxIhMNACABQfAAaiECIAshByARIRQMAQsgEUH4AHEhFCABQfAAaiECIAshBwNAIAcgAi0AADoAACAHQQFqIQcgAkEBaiECIBNBf2oiEw0ACwsCQCASQQdJDQADQCAHIAIpAAA3AAAgB0EIaiEHIAJBCGohAiAUQXhqIhQNAAsLIAhCAXwhCCALIBFqIQsgACARayIADQALCyABQfABaiQAC6MCAQR+AkACQCAAQSBGDQBCq7OP/JGjs/DbACEBQv+kuYjFkdqCm38hAkLy5rvjo6f9p6V/IQNC58yn0NbQ67O7fyEEQQAhAAwBC0EAKQOYCSEBQQApA5AJIQJBACkDiAkhA0EAKQOACSEEQRAhAAtBACAAOgCKigFBAEIANwOAigFBAEIANwP4iQFBAEIANwPwiQFBAEIANwPoiQFBAEIANwPgiQFBAEIANwPYiQFBAEIANwPQiQFBAEIANwPIiQFBAEIANwPAiQFBACABNwO4iQFBACACNwOwiQFBACADNwOoiQFBACAENwOgiQFBACABNwOYiQFBACACNwOQiQFBACADNwOIiQFBACAENwOAiQFBAEEAOgCQigFBAEEAOwGIigELBgAgABADCwYAIAAQBwsGAEGAiQELqwIBBH4CQAJAIAFBIEYNAEKrs4/8kaOz8NsAIQNC/6S5iMWR2oKbfyEEQvLmu+Ojp/2npX8hBULnzKfQ1tDrs7t/IQZBACEBDAELQQApA5gJIQNBACkDkAkhBEEAKQOICSEFQQApA4AJIQZBECEBC0EAIAE6AIqKAUEAQgA3A4CKAUEAQgA3A/iJAUEAQgA3A/CJAUEAQgA3A+iJAUEAQgA3A+CJAUEAQgA3A9iJAUEAQgA3A9CJAUEAQgA3A8iJAUEAQgA3A8CJAUEAIAM3A7iJAUEAIAQ3A7CJAUEAIAU3A6iJAUEAIAY3A6CJAUEAIAM3A5iJAUEAIAQ3A5CJAUEAIAU3A4iJAUEAIAY3A4CJAUEAQQA6AJCKAUEAQQA7AYiKASAAEAMgAhAHCwsLAQBBgAgLBHgHAAA=";
var hash$h2 = "215d875f";
var wasmJson$h2 = {
  name: name$h2,
  data: data$h2,
  hash: hash$h2
};
var mutex$i2 = new Mutex2();
function validateBits$22(bits) {
  if (!Number.isInteger(bits) || bits < 8 || bits % 8 !== 0) {
    return new Error("Invalid variant! Valid values: 8, 16, ...");
  }
  return null;
}
function createBLAKE32(bits = 256, key = null) {
  if (validateBits$22(bits)) {
    return Promise.reject(validateBits$22(bits));
  }
  let keyBuffer = null;
  let initParam = 0;
  if (key !== null) {
    keyBuffer = getUInt8Buffer2(key);
    if (keyBuffer.length !== 32) {
      return Promise.reject(new Error("Key length must be exactly 32 bytes"));
    }
    initParam = 32;
  }
  const outputSize = bits / 8;
  const digestParam = outputSize;
  return WASMInterface2(wasmJson$h2, outputSize).then((wasm) => {
    if (initParam === 32) {
      wasm.writeMemory(keyBuffer);
    }
    wasm.init(initParam);
    const obj = {
      init: initParam === 32 ? () => {
        wasm.writeMemory(keyBuffer);
        wasm.init(initParam);
        return obj;
      } : () => {
        wasm.init(initParam);
        return obj;
      },
      update: (data) => {
        wasm.update(data);
        return obj;
      },
      // biome-ignore lint/suspicious/noExplicitAny: Conflict with IHasher type
      digest: (outputType) => wasm.digest(outputType, digestParam),
      save: () => wasm.save(),
      load: (data) => {
        wasm.load(data);
        return obj;
      },
      blockSize: 64,
      digestSize: outputSize
    };
    return obj;
  });
}
var mutex$h2 = new Mutex2();
var mutex$g2 = new Mutex2();
var polyBuffer2 = new Uint8Array(8);
var mutex$f2 = new Mutex2();
var mutex$e2 = new Mutex2();
var mutex$d2 = new Mutex2();
var mutex$c2 = new Mutex2();
var mutex$b2 = new Mutex2();
var mutex$a2 = new Mutex2();
var mutex$92 = new Mutex2();
var mutex$82 = new Mutex2();
var mutex$72 = new Mutex2();
var mutex$62 = new Mutex2();
var mutex$52 = new Mutex2();
var seedBuffer$22 = new Uint8Array(8);
var mutex$42 = new Mutex2();
var seedBuffer$12 = new Uint8Array(8);
var mutex$32 = new Mutex2();
var seedBuffer2 = new Uint8Array(8);
var mutex$22 = new Mutex2();
var mutex$12 = new Mutex2();
var mutex2 = new Mutex2();
var print2 = (() => {
  const colors = {
    red: { ansi: 196, css: "red" },
    orange: { ansi: 208, css: "orange" },
    green: { ansi: 46, css: "green" },
    blue: { ansi: 33, css: "blue" }
  };
  const printMessage = (msg, { ansi, css }) => {
    if (typeof process !== "undefined" && process.stdout?.write) {
      process.stdout.write(`\x1B[38;5;${ansi}m${msg}\x1B[0m`);
    } else if (typeof console !== "undefined") {
      console.log(`%c${msg}`, `color: ${css}`);
    }
  };
  const api = {};
  for (const [name, cfg] of Object.entries(colors)) {
    api[name] = (msg) => printMessage(msg, cfg);
  }
  return api;
})();
var cstring2 = (memory, ptr) => {
  if (!memory) return "";
  const mem = new Uint8Array(memory.buffer, ptr);
  let len = 0;
  while (mem[len] !== 0) {
    len++;
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(memory.buffer, ptr, len));
};
function createShimBase2(config = {}) {
  let wasmExports = null;
  let memory = null;
  const onAbort = config.onAbort || ((message) => {
    print2.red(message);
    if (typeof process !== "undefined" && process.exit) {
      process.exit(1);
    } else {
      throw new Error(message);
    }
  });
  const { randomBytesImpl: randomBytesImpl22 } = config;
  if (typeof randomBytesImpl22 !== "function") {
    throw new Error("A `randomBytesImpl` function must be provided in the shim configuration.");
  }
  const importObject = {
    env: {
      __lea_abort: (_line) => {
        const line = Number(_line);
        onAbort(`[ABORT] at line ${line}
`);
      },
      __lea_log: (ptr, len) => {
        if (!memory) return;
        const _len = Number(len);
        const mem = new Uint8Array(memory.buffer, ptr, _len);
        const m = new TextDecoder("utf-8").decode(mem);
        print2.orange(m);
      },
      __lea_ubsen: (_name, _filename, _line, _column) => {
        if (!memory) {
          onAbort(`[UBSEN] at unknown location (memory not bound)
`);
          return;
        }
        const name = cstring2(memory, _name);
        const filename = cstring2(memory, _filename);
        const line = Number(_line);
        const column = Number(_column);
        onAbort(`[UBSEN] ${name} at ${filename}:${line}:${column}
`);
      },
      __lea_randombytes: (ptr, len) => {
        const _len = Number(len);
        print2.blue(`[VM] __lea_randombytes requested ${_len} bytes
`);
        if (!memory) return;
        const randomBytes2 = randomBytesImpl22(_len);
        const mem = new Uint8Array(memory.buffer, ptr, _len);
        mem.set(randomBytes2);
      },
      __execution_limit: (gas_price, gas_limit) => {
        print2.blue(`[VM] __execution_limit called with gas_price=${gas_price}, gas_limit=${gas_limit}
`);
      },
      __address_add: (address_data, address_size) => {
        print2.blue(`[VM] __address_add called with address_data=${address_data}, address_size=${address_size}
`);
      },
      __execution_stack_add: (target_index, instruction_data, instruction_size) => {
        print2.blue(`[VM] __execution_stack_add called with target_index=${target_index}, instruction_data=${instruction_data}, instruction_size=${instruction_size}
`);
      },
      // Allow user-defined functions to be merged
      ...config.customEnv || {}
    }
  };
  const bindInstance = (instance) => {
    wasmExports = instance.exports;
    memory = wasmExports.memory;
    if (!memory) {
      console.warn("Warning: WebAssembly instance has no exported memory.");
    }
  };
  const copyToWasm = (data) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { memory: memory2, __lea_malloc } = wasmExports;
    const ptr = __lea_malloc(data.length);
    new Uint8Array(memory2.buffer, ptr, data.length).set(data);
    return ptr;
  };
  const readFromWasm = (ptr, length) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { memory: memory2 } = wasmExports;
    return new Uint8Array(memory2.buffer.slice(ptr, ptr + length));
  };
  const malloc = (length) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { __lea_malloc } = wasmExports;
    return __lea_malloc(length);
  };
  const reset = (length) => {
    if (!wasmExports) throw new Error("Wasm instance not bound. Call bindInstance first.");
    const { __lea_allocator_reset } = wasmExports;
    __lea_allocator_reset();
  };
  return {
    importObject,
    bindInstance,
    print: print2,
    utils: {
      copyToWasm,
      readFromWasm,
      malloc,
      reset
    }
  };
}
var randomBytesImpl2 = (len) => {
  const bytes = new Uint8Array(len);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error("No secure random bytes implementation found for this environment.");
};
function createShim2(config = {}) {
  return createShimBase2({
    ...config,
    randomBytesImpl: randomBytesImpl2
  });
}
var MSCTP_ERR_INVALID_HEADER = -1;
var MSCTP_ERR_INVALID_LENGTH = -2;
var MSCTP_ERR_OVERLONG_LEB128 = -3;
var MSCTP_ERR_MALFORMED_LEB128 = -4;
var MSCTP_ERR_SIZE_LIMIT_EXCEEDED = -5;
var MsctpError = class extends Error {
  constructor(message, code) {
    super(message);
    this.name = "MsctpError";
    this.code = code;
  }
};
var MSCTP_TT_SLEB128 = 0;
var MSCTP_TT_ULEB128 = 1;
var MSCTP_TT_SMALL_VECTOR = 2;
var MSCTP_TT_LARGE_VECTOR = 3;
var MSCTP_TT_MASK = 3;
var MSCTP_MAX_SMALL_VECTOR_SIZE = 63;
var MSCTP_MAX_LARGE_VECTOR_SIZE = 1048576;
function msctp_make_header(modifier, tt) {
  return modifier << 2 | tt & MSCTP_TT_MASK;
}
function msctp_get_tt(header) {
  return header & MSCTP_TT_MASK;
}
function msctp_get_modifier(header) {
  return header >> 2;
}
function _encode_raw_uleb128(value) {
  if (value < 0n) {
    return null;
  }
  if (value === 0n) {
    return new Uint8Array([0]);
  }
  const bytes = [];
  while (value > 0n) {
    let byte = Number(value & 0x7Fn);
    value >>= 7n;
    if (value !== 0n) {
      byte |= 128;
    }
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}
function _decode_raw_uleb128(data) {
  let value = 0n;
  let shift = 0n;
  let i = 0;
  let byte;
  while (true) {
    if (i >= data.length) {
      throw new MsctpError("Unterminated ULEB128 sequence", MSCTP_ERR_MALFORMED_LEB128);
    }
    byte = data[i];
    i++;
    value |= BigInt(byte & 127) << shift;
    if ((byte & 128) === 0) {
      break;
    }
    shift += 7n;
  }
  const encoded = _encode_raw_uleb128(value);
  if (encoded.length !== i) {
    throw new MsctpError("Overlong ULEB128 encoding", MSCTP_ERR_OVERLONG_LEB128);
  }
  return [value, i];
}
function _encode_raw_sleb128(value) {
  const bytes = [];
  let more = true;
  while (more) {
    let byte = Number(value & 0x7Fn);
    value >>= 7n;
    let signBit = (byte & 64) !== 0;
    if (value === 0n && !signBit || value === -1n && signBit) {
      more = false;
    } else {
      byte |= 128;
    }
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}
function _decode_raw_sleb128(data) {
  let value = 0n;
  let shift = 0n;
  let i = 0;
  let byte = 0;
  while (true) {
    if (i >= data.length) {
      throw new MsctpError("Unterminated SLEB128 sequence", MSCTP_ERR_MALFORMED_LEB128);
    }
    byte = data[i++];
    value |= BigInt(byte & 127) << shift;
    shift += 7n;
    if ((byte & 128) === 0) break;
  }
  if ((byte & 64) !== 0) {
    const mask = (1n << shift) - 1n;
    value = value & mask | ~mask;
  }
  const encoded = _encode_raw_sleb128(value);
  if (encoded.length !== i) {
    throw new MsctpError("Overlong SLEB128 encoding", MSCTP_ERR_OVERLONG_LEB128);
  }
  return [value, i];
}
var MsctpEncoder = class {
  constructor() {
    this.chunks = [];
  }
  /**
   * Appends an SLEB128-encoded integer to the buffer.
   * @param {bigint} value The integer to encode.
   */
  addSleb128(value) {
    const payload = _encode_raw_sleb128(value);
    if (!payload) return;
    const header = msctp_make_header(0, MSCTP_TT_SLEB128);
    const chunk = new Uint8Array(1 + payload.length);
    chunk[0] = header;
    chunk.set(payload, 1);
    this.chunks.push(chunk);
  }
  /**
   * Appends a ULEB128-encoded integer to the buffer.
   * @param {bigint} value The integer to encode.
   */
  addUleb128(value) {
    const payload = _encode_raw_uleb128(value);
    if (!payload) return;
    const header = msctp_make_header(0, MSCTP_TT_ULEB128);
    const chunk = new Uint8Array(1 + payload.length);
    chunk[0] = header;
    chunk.set(payload, 1);
    this.chunks.push(chunk);
  }
  /**
   * Appends a vector (byte array) to the buffer.
   * @param {Uint8Array} data The byte array to encode as a vector.
   */
  addVector(data) {
    if (!data) return;
    const len = data.length;
    if (len <= MSCTP_MAX_SMALL_VECTOR_SIZE) {
      const chunk = new Uint8Array(1 + len);
      chunk[0] = msctp_make_header(len, MSCTP_TT_SMALL_VECTOR);
      chunk.set(data, 1);
      this.chunks.push(chunk);
    } else if (len <= MSCTP_MAX_LARGE_VECTOR_SIZE) {
      const lenPayload = _encode_raw_uleb128(BigInt(len));
      if (!lenPayload) return;
      const chunk = new Uint8Array(1 + lenPayload.length + len);
      chunk[0] = msctp_make_header(0, MSCTP_TT_LARGE_VECTOR);
      chunk.set(lenPayload, 1);
      chunk.set(data, 1 + lenPayload.length);
      this.chunks.push(chunk);
    }
  }
  /**
   * Concatenates all encoded chunks into a single Uint8Array.
   * @returns {Uint8Array} The final encoded data.
   */
  build() {
    const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
};
var MsctpDecoder = class {
  /**
   * @param {Uint8Array} data The MSCTP data to decode.
   */
  constructor(data) {
    this.data = data;
    this.offset = 0;
  }
  /**
   * Checks if there is more data to read.
   * @returns {boolean} True if the cursor has not reached the end of the data.
   */
  hasNext() {
    return this.offset < this.data.length;
  }
  /**
   * Peeks at the type tag of the next MSCTP object without advancing the cursor.
   * @returns {number | null} The type tag, or null if at the end of the data.
   */
  peekType() {
    if (!this.hasNext()) {
      return null;
    }
    return msctp_get_tt(this.data[this.offset]);
  }
  /**
   * Reads the next object as an SLEB128-encoded integer.
   * @returns {bigint} The decoded integer.
   * @throws {MsctpError} If the next object is not a valid SLEB128.
   */
  readSleb128() {
    const header = this.data[this.offset];
    if (msctp_get_tt(header) !== MSCTP_TT_SLEB128 || msctp_get_modifier(header) !== 0) {
      throw new MsctpError("Invalid header for SLEB128", MSCTP_ERR_INVALID_HEADER);
    }
    const [value, bytesRead] = _decode_raw_sleb128(this.data.subarray(this.offset + 1));
    this.offset += bytesRead + 1;
    return value;
  }
  /**
   * Reads the next object as a ULEB128-encoded integer.
   * @returns {bigint} The decoded integer.
   * @throws {MsctpError} If the next object is not a valid ULEB128.
   */
  readUleb128() {
    const header = this.data[this.offset];
    if (msctp_get_tt(header) !== MSCTP_TT_ULEB128 || msctp_get_modifier(header) !== 0) {
      throw new MsctpError("Invalid header for ULEB128", MSCTP_ERR_INVALID_HEADER);
    }
    const [value, bytesRead] = _decode_raw_uleb128(this.data.subarray(this.offset + 1));
    this.offset += bytesRead + 1;
    return value;
  }
  /**
   * Reads the next object as a vector.
   * @returns {Uint8Array} The decoded vector payload.
   * @throws {MsctpError} If the next object is not a valid vector.
   */
  readVector() {
    const header = this.data[this.offset];
    const tt = msctp_get_tt(header);
    if (tt === MSCTP_TT_SMALL_VECTOR) {
      const len = msctp_get_modifier(header);
      const totalLen = 1 + len;
      if (this.data.length < this.offset + totalLen) {
        throw new MsctpError("Data buffer too small for SMALL_VECTOR length", MSCTP_ERR_INVALID_LENGTH);
      }
      const payload = this.data.subarray(this.offset + 1, this.offset + totalLen);
      this.offset += totalLen;
      return payload;
    } else if (tt === MSCTP_TT_LARGE_VECTOR) {
      if (msctp_get_modifier(header) !== 0) {
        throw new MsctpError("Invalid modifier for LARGE_VECTOR", MSCTP_ERR_INVALID_HEADER);
      }
      const [len, lenBytesRead] = _decode_raw_uleb128(this.data.subarray(this.offset + 1));
      if (len > MSCTP_MAX_LARGE_VECTOR_SIZE) {
        throw new MsctpError("LARGE_VECTOR size exceeds limit", MSCTP_ERR_SIZE_LIMIT_EXCEEDED);
      }
      const payloadOffset = 1 + lenBytesRead;
      const totalObjectSize = payloadOffset + Number(len);
      if (this.data.length < this.offset + totalObjectSize) {
        throw new MsctpError("Data buffer too small for declared LARGE_VECTOR payload size", MSCTP_ERR_INVALID_LENGTH);
      }
      const payload = this.data.subarray(this.offset + payloadOffset, this.offset + totalObjectSize);
      this.offset += totalObjectSize;
      return payload;
    } else {
      throw new MsctpError(`Invalid vector type tag: ${tt}`, MSCTP_ERR_INVALID_HEADER);
    }
  }
};
var CHARSET2 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var GENERATOR2 = [996825010, 642813549, 513874426, 1027748829, 705979059];
var BECH32M_CONST2 = 734539939;
var DATA_VERSION_BYTE2 = null;
var MIN_DATA_LENGTH_BYTES2 = 16;
var MAX_DATA_LENGTH_BYTES2 = 64;
var MAX_BECH32_LENGTH2 = 200;
var MIN_HRP_LENGTH2 = 1;
var MAX_HRP_LENGTH2 = 83;
var CHECKSUM_LENGTH2 = 6;
var MIN_BECH32_LENGTH2 = MIN_HRP_LENGTH2 + 1 + (DATA_VERSION_BYTE2 !== null ? 1 : 0) + Math.ceil(MIN_DATA_LENGTH_BYTES2 * 8 / 5) + CHECKSUM_LENGTH2;
var CHAR_MAP2 = {};
for (let i = 0; i < CHARSET2.length; i++) {
  const char = CHARSET2[i];
  if (char === void 0) continue;
  CHAR_MAP2[char] = i;
}
function polymod2(values) {
  let checksumState = 1;
  for (let index = 0; index < values.length; ++index) {
    const value = values[index];
    if (value === void 0) continue;
    const top = checksumState >> 25;
    checksumState = (checksumState & 33554431) << 5 ^ value;
    for (let i = 0; i < 5; ++i) {
      const genValue = GENERATOR2[i];
      if (top >> i & 1 && genValue !== void 0) {
        checksumState ^= genValue;
      }
    }
  }
  return checksumState;
}
function hrpExpand2(hrp) {
  const expanded = new Array(hrp.length * 2 + 1);
  let i = 0;
  for (let index = 0; index < hrp.length; ++index) expanded[i++] = hrp.charCodeAt(index) >> 5;
  expanded[i++] = 0;
  for (let index = 0; index < hrp.length; ++index) expanded[i++] = hrp.charCodeAt(index) & 31;
  return expanded;
}
function verifyChecksum(hrp, dataWithChecksum) {
  const expandedHrp = hrpExpand2(hrp);
  const combined = new Array(expandedHrp.length + dataWithChecksum.length);
  let k = 0;
  for (let i = 0; i < expandedHrp.length; i++) combined[k++] = expandedHrp[i];
  for (let i = 0; i < dataWithChecksum.length; i++) combined[k++] = dataWithChecksum[i];
  return polymod2(combined) === BECH32M_CONST2;
}
function createChecksum2(hrp, data5bitWithVersion) {
  const expandedHrp = hrpExpand2(hrp);
  const values = new Array(expandedHrp.length + data5bitWithVersion.length + CHECKSUM_LENGTH2);
  let k = 0;
  for (let i = 0; i < expandedHrp.length; i++) values[k++] = expandedHrp[i];
  for (let i = 0; i < data5bitWithVersion.length; i++) values[k++] = data5bitWithVersion[i];
  for (let i = 0; i < CHECKSUM_LENGTH2; i++) values[k++] = 0;
  const mod = polymod2(values) ^ BECH32M_CONST2;
  const checksum = new Array(CHECKSUM_LENGTH2);
  for (let i = 0; i < CHECKSUM_LENGTH2; ++i) {
    checksum[i] = mod >> 5 * (CHECKSUM_LENGTH2 - 1 - i) & 31;
  }
  return checksum;
}
function convertbits2(inputData, frombits, tobits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << tobits) - 1;
  const max_acc = (1 << frombits + tobits - 1) - 1;
  for (let index = 0; index < inputData.length; ++index) {
    const value = inputData[index];
    if (value === void 0 || value < 0 || value >> frombits !== 0) {
      throw new Error(`Invalid value in convertbits: ${value}`);
    }
    acc = (acc << frombits | value) & max_acc;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push(acc << tobits - bits & maxv);
    }
  } else if (bits >= frombits || acc << tobits - bits & maxv) {
    throw new Error("Invalid padding/conversion in convertbits");
  }
  return ret;
}
function _encodeBech32mData2(hrp, data5bit) {
  const data5bitWithVersion = DATA_VERSION_BYTE2 !== null ? [DATA_VERSION_BYTE2, ...data5bit] : [...data5bit];
  const checksum = createChecksum2(hrp, data5bitWithVersion);
  const combined = new Array(data5bitWithVersion.length + checksum.length);
  let k = 0;
  for (let i = 0; i < data5bitWithVersion.length; i++) combined[k++] = data5bitWithVersion[i];
  for (let i = 0; i < checksum.length; i++) combined[k++] = checksum[i];
  let ret = hrp + "1";
  for (let index = 0; index < combined.length; ++index) {
    const charIndex = combined[index];
    if (charIndex === void 0) throw new Error("Undefined index in combined data");
    ret += CHARSET2.charAt(charIndex);
  }
  return ret;
}
function _decodeBech32mDataAndValidate(bechString) {
  if (typeof bechString !== "string") throw new Error("Input must be a string.");
  let has_lower = false, has_upper = false;
  for (let index = 0; index < bechString.length; ++index) {
    const charCode = bechString.charCodeAt(index);
    if (charCode < 33 || charCode > 126) throw new Error(`Invalid character: ${bechString[index]}`);
    if (charCode >= 97 && charCode <= 122) has_lower = true;
    else if (charCode >= 65 && charCode <= 90) has_upper = true;
  }
  if (has_lower && has_upper) throw new Error("Mixed case detected.");
  const lowerBechString = bechString.toLowerCase();
  const sepPos = lowerBechString.lastIndexOf("1");
  if (sepPos < MIN_HRP_LENGTH2 || sepPos + 1 + CHECKSUM_LENGTH2 > lowerBechString.length || lowerBechString.length > MAX_BECH32_LENGTH2 || lowerBechString.length < MIN_BECH32_LENGTH2) {
    throw new Error(`Invalid structure or length (min: ${MIN_BECH32_LENGTH2}, max: ${MAX_BECH32_LENGTH2}, got: ${lowerBechString.length})`);
  }
  const hrp = lowerBechString.substring(0, sepPos);
  const data5bitWithVersionAndChecksum = [];
  for (let index = sepPos + 1; index < lowerBechString.length; ++index) {
    const char = lowerBechString.charAt(index);
    const charValue = CHAR_MAP2[char];
    if (charValue === void 0) throw new Error(`Invalid data character: ${char}`);
    data5bitWithVersionAndChecksum.push(charValue);
  }
  if (!verifyChecksum(hrp, data5bitWithVersionAndChecksum)) {
    throw new Error("Checksum verification failed.");
  }
  const expectedMinDataPartLen = (DATA_VERSION_BYTE2 !== null ? 1 : 0) + Math.ceil(MIN_DATA_LENGTH_BYTES2 * 8 / 5) + CHECKSUM_LENGTH2;
  if (data5bitWithVersionAndChecksum.length < expectedMinDataPartLen) {
    throw new Error(`Decoded data part too short (${data5bitWithVersionAndChecksum.length} < ${expectedMinDataPartLen}).`);
  }
  let version = null;
  if (DATA_VERSION_BYTE2 !== null) {
    const firstVal = data5bitWithVersionAndChecksum[0];
    version = firstVal === void 0 ? null : firstVal;
    if (version === null || version !== DATA_VERSION_BYTE2) {
      throw new Error(`Unsupported version: expected ${DATA_VERSION_BYTE2}, got ${version}`);
    }
  }
  return { hrp, data5bitWithVersionAndChecksum, version };
}
function decode(expectedHrp, bech32mString) {
  const decodedParts = _decodeBech32mDataAndValidate(bech32mString);
  if (decodedParts.hrp !== expectedHrp) {
    throw new Error(`Mismatched HRP: expected '${expectedHrp}', got '${decodedParts.hrp}'`);
  }
  const dataStartIndex = DATA_VERSION_BYTE2 !== null ? 1 : 0;
  const dataEndIndex = decodedParts.data5bitWithVersionAndChecksum.length - CHECKSUM_LENGTH2;
  const data5bit = decodedParts.data5bitWithVersionAndChecksum.slice(dataStartIndex, dataEndIndex);
  const dataBytes = convertbits2(data5bit, 5, 8, false);
  if (dataBytes.length < MIN_DATA_LENGTH_BYTES2 || dataBytes.length > MAX_DATA_LENGTH_BYTES2) {
    throw new Error(`Invalid decoded data length: ${dataBytes.length} bytes (must be between ${MIN_DATA_LENGTH_BYTES2} and ${MAX_DATA_LENGTH_BYTES2})`);
  }
  return new Uint8Array(dataBytes);
}
function encode2(hrp, dataBytes) {
  if (typeof hrp !== "string" || hrp.length < MIN_HRP_LENGTH2 || hrp.length > MAX_HRP_LENGTH2) {
    throw new Error(`Invalid HRP length: ${hrp?.length}`);
  }
  for (let i = 0; i < hrp.length; ++i) {
    const charCode = hrp.charCodeAt(i);
    if (charCode < 33 || charCode > 126) throw new Error(`Invalid HRP character code: ${charCode}`);
    if (charCode >= 65 && charCode <= 90) throw new Error(`Invalid HRP character case: ${hrp[i]}`);
  }
  if (!dataBytes || typeof dataBytes.length !== "number") throw new Error("Invalid dataBytes type.");
  if (dataBytes.length < MIN_DATA_LENGTH_BYTES2 || dataBytes.length > MAX_DATA_LENGTH_BYTES2) {
    throw new Error(`Invalid dataBytes length: ${dataBytes.length} (must be between ${MIN_DATA_LENGTH_BYTES2} and ${MAX_DATA_LENGTH_BYTES2})`);
  }
  const dataBytesArray = dataBytes instanceof Uint8Array ? dataBytes : Uint8Array.from(dataBytes);
  for (let i = 0; i < dataBytesArray.length; ++i) {
    const byte = dataBytesArray[i];
    if (byte === void 0 || typeof byte !== "number" || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error(`Invalid data byte at index ${i}: ${byte}`);
    }
  }
  const data5bit = convertbits2(dataBytesArray, 8, 5, true);
  const encodedString = _encodeBech32mData2(hrp, data5bit);
  if (encodedString.length > MAX_BECH32_LENGTH2) {
    throw new Error(`Internal error: Generated string exceeds max length (${encodedString.length})`);
  }
  return encodedString;
}
var ADDRESS_HRP3 = "lea";
var MAX_TRANSACTION_SIZE = 1024 * 1024;
var ENCODER_INIT_SIZE = MAX_TRANSACTION_SIZE / 2;
var ed25519_default2 = __toBinary2("AGFzbQEAAAABWA5gAX8AYAJ/fgBgAAF/YAAAYAF/AX9gAn9/AX9gA39/fwBgA39/fwF/YAR/f39/AX9gAn9/AGAEf39/fwBgBX9/f39/AX9gBX9/f39/AGAHf39/f39/fwACKwIDZW52C19fbGVhX2Fib3J0AAADZW52EV9fbGVhX3JhbmRvbWJ5dGVzAAEDIyICAgMEBQYHAgIIBgkJCQoCAgsFBgkGCAwJCQkGBQkFDQYABAUBcAEBAQUDAQASBgkBfwFB0KXEAAsHvQENBm1lbW9yeQIADF9fbGVhX21hbGxvYwAFFV9fbGVhX2FsbG9jYXRvcl9yZXNldAAEE19fbGVhX2dldF9oZWFwX2Jhc2UAAhJfX2xlYV9nZXRfaGVhcF90b3AAAwZrZXlnZW4ABhBrZXlnZW5fZnJvbV9zZWVkAAgEc2lnbgALBnZlcmlmeQATCnNlZWRfYnl0ZXMACghwa19ieXRlcwAJCHNrX2J5dGVzABIPc2lnbmF0dXJlX2J5dGVzABEK/qYCIggAQdClgIAACwsAQQAoAsClgIAACzMBAX9BACEAA0AgAEHQpYCAAGpCADcDACAAQQhqIgBBgIDAAEcNAAtBAEEANgLApYCAAAs+AQF/AkBBgIDAAEEAKALApYCAACIBayAATw0AQRUQgICAgAAAAAtBACABIABqNgLApYCAACABQdClgIAAags4AQF/I4CAgIAAQSBrIgIkgICAgAAgAkIgEIGAgIAAIAEgACACEIeAgIAAIAJBIGokgICAgABBAAvPDwEafyOAgICAAEGgAmsiAySAgICAACADIAItAAA6AAAgAyACLwABOwABIAMgAigAAzYAAyADIAItAAciBDoAByADIAItAAgiBToACCADIAItAAkiBjoACSADIAItAAoiBzoACiADIAItAAsiCDoACyADIAItAAwiCToADCADIAItAA0iCjoADSADIAItAA4iCzoADiADIAItAA8iDDoADyADIAItABAiDToAECADIAItABEiDjoAESADIAItABIiDzoAEiADIAItABMiEDoAEyADIAItABQiEToAFCADIAItABUiEjoAFSADIAItABYiEzoAFiADIAItABciFDoAFyADIAItABgiFToAGCADIAItABkiFjoAGSADIAItABoiFzoAGiADIAItABsiGDoAGyADIAItABwiGToAHCADIAItAB0iGjoAHSADIAItAB4iGzoAHiADIAItAB8iHDoAHyACQQA6AAAgAkEAOgABIAJBADoAAiACQQA6AAMgAkEAOgAEIAJBADoABSACQQA6AAYgAkEAOgAHIAJBADoACCACQQA6AAkgAkEAOgAKIAJBADoACyACQQA6AAwgAkEAOgANIAJBADoADiACQQA6AA8gAkEAOgAQIAJBADoAESACQQA6ABIgAkEAOgATIAJBADoAFCACQQA6ABUgAkEAOgAWIAJBADoAFyACQQA6ABggAkEAOgAZIAJBADoAGiACQQA6ABsgAkEAOgAcIAJBADoAHSACQQA6AB4gAkEAOgAfIAAgAy0AADoAACAAIAMtAAE6AAEgACADLQACOgACIAAgAy0AAzoAAyAAIAMtAAQ6AAQgACADLQAFOgAFIAAgHDoAHyAAIBs6AB4gACAaOgAdIAAgGToAHCAAIBg6ABsgACAXOgAaIAAgFjoAGSAAIBU6ABggACAUOgAXIAAgEzoAFiAAIBI6ABUgACAROgAUIAAgEDoAEyAAIA86ABIgACAOOgARIAAgDToAECAAIAw6AA8gACALOgAOIAAgCjoADSAAIAk6AAwgACAIOgALIAAgBzoACiAAIAY6AAkgACAFOgAIIAAgBDoAByAAIAMtAAY6AAYgA0GQAmpCADcDACADQYACakIANwMAIANB+AFqQgA3AwAgA0HwAWpCADcDACADQegBakIANwMAIANB4AFqQgA3AwAgA0HYAWpCADcDACADQdABakIANwMAIANByAFqQgA3AwAgA0HAAWpCADcDACADQbgBakIANwMAIANBsAFqQgA3AwAgA0GoAWpCADcDACADQaABakIANwMAIANBmAFqQgA3AwAgA0GQAWpCADcDACADQQA2ApgCIANCADcDiAIgA0L5wvibkaOz8NsANwOAASADQuv6htq/tfbBHzcDeCADQp/Y+dnCkdqCm383A3AgA0LRhZrv+s+Uh9EANwNoIANC8e30+KWn/aelfzcDYCADQqvw0/Sv7ry3PDcDWCADQrvOqqbY0Ouzu383A1AgA0KIkvOd/8z5hOoANwNIIANCADcDiAEgA0HIAGogA0EgEIyAgIAAIANByABqIAMQjYCAgAAgAyADLQAAQfgBcToAACADIAMtAB9BP3FBwAByOgAfIAEgAxCPgICAACAAIAEtAAA6ACAgACABLQABOgAhIAAgAS0AAjoAIiAAIAEtAAM6ACMgACABLQAEOgAkIAAgAS0ABToAJSAAIAEtAAY6ACYgACABLQAHOgAnIAAgAS0ACDoAKCAAIAEtAAk6ACkgACABLQAKOgAqIAAgAS0ACzoAKyAAIAEtAAw6ACwgACABLQANOgAtIAAgAS0ADjoALiAAIAEtAA86AC8gACABLQAQOgAwIAAgAS0AEToAMSAAIAEtABI6ADIgACABLQATOgAzIAAgAS0AFDoANCAAIAEtABU6ADUgACABLQAWOgA2IAAgAS0AFzoANyAAIAEtABg6ADggACABLQAZOgA5IAAgAS0AGjoAOiAAIAEtABs6ADsgACABLQAcOgA8IAAgAS0AHToAPSAAIAEtAB46AD4gACABLQAfOgA/IANBADoAACADQQA6AAEgA0EAOgACIANBADoAAyADQQA6AAQgA0EAOgAFIANBADoABiADQQA6AAcgA0EAOgAIIANBADoACSADQQA6AAogA0EAOgALIANBADoADCADQQA6AA0gA0EAOgAOIANBADoADyADQQA6ABAgA0EAOgARIANBADoAEiADQQA6ABMgA0EAOgAUIANBADoAFSADQQA6ABYgA0EAOgAXIANBADoAGCADQQA6ABkgA0EAOgAaIANBADoAGyADQQA6ABwgA0EAOgAdIANBADoAHiADQQA6AB8gA0EAOgAgIANBADoAISADQQA6ACIgA0EAOgAjIANBADoAJCADQQA6ACUgA0EAOgAmIANBADoAJyADQQA6ACggA0EAOgApIANBADoAKiADQQA6ACsgA0EAOgAsIANBADoALSADQQA6AC4gA0EAOgAvIANBADoAMCADQQA6ADEgA0EAOgAyIANBADoAMyADQQA6ADQgA0EAOgA1IANBADoANiADQQA6ADcgA0EAOgA4IANBADoAOSADQQA6ADogA0EAOgA7IANBADoAPCADQQA6AD0gA0EAOgA+IANBADoAPyADQaACaiSAgICAAAt0AQF/I4CAgIAAQSBrIgMkgICAgAAgAyACLQAAOgAAIAMgAigAATYAASADIAIpAAU3AAUgAyACKQANNwANIAMgAikAFTcAFSADIAIvAB07AB0gAyACLQAfOgAfIAEgACADEIeAgIAAIANBIGokgICAgABBAAsEAEEgCwQAQSALwQ8BEX8jgICAgABBwANrIgQkgICAgAAgBEHwAmoiBUIANwMAIARB4AJqIgZCADcDACAEQdgCaiIHQgA3AwAgBEHQAmoiCEIANwMAIARByAJqIglCADcDACAEQcACaiIKQgA3AwAgBEG4AmoiC0IANwMAIARBsAJqIgxCADcDACAEQagCaiINQgA3AwAgBEGgAmoiDkIANwMAIARBmAJqIg9CADcDACAEQZACaiIQQgA3AwAgBEGIAmoiEUIANwMAIARBgAJqIhJCADcDACAEQfgBaiITQgA3AwAgBEHwAWoiFEIANwMAIARBADYC+AIgBEIANwPoAiAEQvnC+JuRo7Pw2wA3A+ABIARC6/qG2r+19sEfNwPYASAEQp/Y+dnCkdqCm383A9ABIARC0YWa7/rPlIfRADcDyAEgBELx7fT4paf9p6V/NwPAASAEQqvw0/Sv7ry3PDcDuAEgBEK7zqqm2NDrs7t/NwOwASAEQoiS853/zPmE6gA3A6gBIARCADcD6AEgBEGoAWogA0EgEIyAgIAAIARBqAFqIARB4ABqEI2AgIAAIAQgBC0AYEH4AXE6AGAgBCAELQB/QT9xQcAAcjoAfyAFQgA3AwAgBkIANwMAIAdCADcDACAIQgA3AwAgCUIANwMAIApCADcDACALQgA3AwAgDEIANwMAIA1CADcDACAOQgA3AwAgD0IANwMAIBBCADcDACARQgA3AwAgEkIANwMAIBNCADcDACAUQgA3AwAgBEEANgL4AiAEQgA3A+gCIARC+cL4m5Gjs/DbADcD4AEgBELr+obav7X2wR83A9gBIARCn9j52cKR2oKbfzcD0AEgBELRhZrv+s+Uh9EANwPIASAEQvHt9Pilp/2npX83A8ABIARCq/DT9K/uvLc8NwO4ASAEQrvOqqbY0Ouzu383A7ABIARCiJLznf/M+YTqADcDqAEgBEIANwPoASAEQagBaiAEQeAAakEgakEgEIyAgIAAIARBqAFqIAEgAhCMgICAACAEQagBaiAEQYADahCNgICAACAEQcAAaiAEQYADahCOgICAACAEIARBwABqEI+AgIAAIAVCADcDACAGQgA3AwAgB0IANwMAIAhCADcDACAJQgA3AwAgCkIANwMAIAtCADcDACAMQgA3AwAgDUIANwMAIA5CADcDACAPQgA3AwAgEEIANwMAIBFCADcDACASQgA3AwAgE0IANwMAIBRCADcDACAEQQA2AvgCIARCADcD6AIgBEL5wvibkaOz8NsANwPgASAEQuv6htq/tfbBHzcD2AEgBEKf2PnZwpHagpt/NwPQASAEQtGFmu/6z5SH0QA3A8gBIARC8e30+KWn/aelfzcDwAEgBEKr8NP0r+68tzw3A7gBIARCu86qptjQ67O7fzcDsAEgBEKIkvOd/8z5hOoANwOoASAEQgA3A+gBIARBqAFqIARBIBCMgICAACAEQagBaiADQSBqQSAQjICAgAAgBEGoAWogASACEIyAgIAAIARBqAFqIARBgANqEI2AgIAAIARBIGogBEGAA2oQjoCAgAAgACAELQAAOgAAIAAgBCkAATcAASAAIAQpAAk3AAkgACAEKQARNwARIAAgBCgAGTYAGSAAIAQvAB07AB0gACAELQAfOgAfIABBIGogBEEgaiAEQeAAaiAEQcAAahCQgICAACAEQQA6AGAgBEEAOgBhIARBADoAYiAEQQA6AGMgBEEAOgBkIARBADoAZSAEQQA6AGYgBEEAOgBnIARBADoAaCAEQQA6AGkgBEEAOgBqIARBADoAayAEQQA6AGwgBEEAOgBtIARBADoAbiAEQQA6AG8gBEEAOgBwIARBADoAcSAEQQA6AHIgBEEAOgBzIARBADoAdCAEQQA6AHUgBEEAOgB2IARBADoAdyAEQQA6AHggBEEAOgB5IARBADoAeiAEQQA6AHsgBEEAOgB8IARBADoAfSAEQQA6AH4gBEEAOgB/IARBADoAgAEgBEEAOgCBASAEQQA6AIIBIARBADoAgwEgBEEAOgCEASAEQQA6AIUBIARBADoAhgEgBEEAOgCHASAEQQA6AIgBIARBADoAiQEgBEEAOgCKASAEQQA6AIsBIARBADoAjAEgBEEAOgCNASAEQQA6AI4BIARBADoAjwEgBEEAOgCQASAEQQA6AJEBIARBADoAkgEgBEEAOgCTASAEQQA6AJQBIARBADoAlQEgBEEAOgCWASAEQQA6AJcBIARBADoAmAEgBEEAOgCZASAEQQA6AJoBIARBADoAmwEgBEEAOgCcASAEQQA6AJ0BIARBADoAngEgBEEAOgCfASAEQQA6AEAgBEEAOgBBIARBADoAQiAEQQA6AEMgBEEA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IAJByAJqIAJB8ANqIAJBwANqQcCRgIAAIAJBoARqIAMiARChgICAACACQQhqIAJByAJqIAJB8ANqIAJBwANqQYCZgIAAIAJBoARqIAFBgAFqEKGAgIAAIAFBf2ohAyABDQALIAJBADoA8AMgAkEAOgDxAyACQQA6APIDIAJBADoA8wMgAkEAOgD0AyACQQA6APUDIAJBADoA9gMgAkEAOgD3AyACQQA6APgDIAJBADoA+QMgAkEAOgD6AyACQQA6APsDIAJBADoA/AMgAkEAOgD9AyACQQA6AP4DIAJBADoA/wMgAkEAOgCABCACQQA6AIEEIAJBADoAggQgAkEAOgCDBCACQQA6AIQEIAJBADoAhQQgAkEAOgCGBCACQQA6AIcEIAJBADoAiAQgAkEAOgCJBCACQQA6AIoEIAJBADoAiwQgAkEAOgCMBCACQQA6AI0EIAJBADoAjgQgAkEAOgCPBCACQQA6AJAEIAJBADoAkQQgAkEAOgCSBCACQQA6AJMEIAJBADoAlAQgAkEAOgCVBCACQQA6AJYEIAJBADoAlwRBACEDA0AgAkGoAWogA2oiAUEAOgAAIAFBAWpBADoAACABQQJqQQA6AAAgAUEDakEAOgAAIAFBBGpBADoAACABQQVqQQA6AAAgAUEGakEAOgAAIAFBB2pBADoAACADQQhqIgNBoAFHDQALIAJBADoAwAMgAkEAOgDBAyACQQA6AMIDIAJBADoAwwMgAkEAOgDEAyACQQA6AMUDIAJBADoAxgMgAkEAOgDHAyACQQA6AMgDIAJBADoAyQMgAkEAOgDKAyACQQA6AMsDIAJBADoAzAMgAkEAOgDNAyACQQA6AM4DIAJBADoAzwMgAkEAOgDQAyACQQA6ANEDIAJBADoA0gMgAkEAOgDTAyACQQA6ANQDIAJBADoA1QMgAkEAOgDWAyACQQA6ANcDIAJBADoA2AMgAkEAOgDZAyACQQA6ANoDIAJBADoA2wMgAkEAOgDcAyACQQA6AN0DIAJBADoA3gMgAkEAOgDfAyACQQA6AOADIAJBADoA4QMgAkEAOgDiAyACQQA6AOMDIAJBADoA5AMgAkEAOgDlAyACQQA6AOYDIAJBADoA5wNBACEDA0AgAkHIAmogA2oiAUEAOgAAIAFBAWpBADoAACABQQJqQQA6AAAgAUEDakEAOgAAIAFB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OgAcIARBADoAHSAEQQA6AB4gBEEAOgAfIARBADoAICAEQQA6ACEgBEEAOgAiIARBADoAIyAEQQA6ACQgBEEAOgAlIARBADoAJiAEQQA6ACcgBEEAOgAoIARBADoAKSAEQQA6ACogBEEAOgArIARBADoALCAEQQA6AC0gBEEAOgAuIARBADoALyAEQQA6ADAgBEEAOgAxIARBADoAMiAEQQA6ADMgBEEAOgA0IARBADoANSAEQQA6ADYgBEEAOgA3IARBADoAOCAEQQA6ADkgBEEAOgA6IARBADoAOyAEQQA6ADwgBEEAOgA9IARBADoAPiAEQQA6AD8gBEEAOgBwIARBADoAcSAEQQA6AHIgBEEAOgBzIARBADoAdCAEQQA6AHUgBEEAOgB2IARBADoAdyAEQQA6AHggBEEAOgB5IARBADoAeiAEQQA6AHsgBEEAOgB8IARBADoAfSAEQQA6AH4gBEEAOgB/IARBADoAgAEgBEEAOgCBASAEQQA6AIIBIARBADoAgwEgBEEAOgCEASAEQQA6AIUBIARBADoAhgEgBEEAOgCHASAEQQA6AIgBIARBADoAiQEgBEEAOgCKASAEQQA6AIsBIARBADoAjAEgBEEAOgCNASAEQQA6AI4BIARBADoAjwEgBEEAOgBgIARBADoAXyAEQQA6AF4gBEEAOgBdIARBADoAXCAEQQA6AFsgBEEAOgBaIARBADoAWSAEQQA6AFggBEEAOgBXIARBADoAViAEQQA6AFUgBEEAOgBUIARBADoAUyAEQQA6AFIgBEEAOgBRIARBADoAUCAEQQA6AE8gBEEAOgBOIARBADoATSAEQQA6AEwgBEEAOgBLIARBADoASiAEQQA6AEkgBEEAOgBIIARBADoARyAEQQA6AEYgBEEAOgBFIARBADoARCAEQQA6AEMgBEEAOgBCIARBADoAQSAEQZABaiSAgICAAAsFAEHAAAsFAEHAAAukFgIBfwh+I4CAgIAAQdAIayIFJICAgIAAAkAgAUHAAEcNACAFQfgDakIANwMAIAVB6ANqQgA3AwAgBUHgA2pCADcDACAFQdgDakIANwMAIAVB0ANqQgA3AwAgBUHIA2pCADcDACAFQcADakIANwMAIAVBuANqQgA3AwAgBUGwA2pCADcDACAFQagDakIANwMAIAVBoANqQgA3AwAgBUGYA2pC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AgAiM2oiNDYCACAyIDMgG2siGzYCACAvIDAgGmsiGjYCACAsIC0gGWsiGTYCACApICogGGsiGDYCACAmICcgJWsiHDYCACACICMgImsiIjYCKCACQcgAaiIjICMoAgAiIyACKAIgIiVrIiY2AgAgAkHEAGoiJyAnKAIAIicgAigCHCIpayIqNgIAIB0gAigCGCIsIAJBwABqIi0oAgAiL2oiMDYCACAeICkgJ2oiHTYCACAfICUgI2oiHjYCACAgIAIoAiQiHyACQcwAaiIjKAIAIiVqIic2AgAgIyAlIB9rIh82AgAgLSAvICxrIiA2AgAgAiAAKAJ4ICRrNgIAIAIgAEH8AGooAgAgKGs2AgQgAiAAQYABaigCACArazYCCCACIABBhAFqKAIAIC5rNgIMIAIgAEGIAWooAgAgMWs2AhAgAiAAQYwBaigCACA0azYCFCACIABBkAFqKAIAIDBrNgIYIAIgAEGUAWooAgAgHWs2AhwgAiAAQZgBaigCACAeazYCICACIABBnAFqKAIAICdrNgIkIAIgAigCUCAiazYCUCAQIBAoAgAgHGs2AgAgDSANKAIAIBhrNgIAIBUgFSgCACAZazYCACAGIAYoAgAgGms2AgAgCSAJKAIAIBtrNgIAIAUgBSgCACAgazYCACAUIBQoAgAgKms2AgAgFiAWKAIAICZrNgIAIBcgFygCACAfazYCACAAIAIgBBCdgICAACAAQShqIAEgAxCdgICAACAAQdAAaiADIAQQnYCAgAAgISACIAEQnYCAgAAL2AQBCX8gACABKAIAIAEoAihqNgIAIAAgASgCBCABQSxqIgIoAgBqNgIEIAAgASgCCCABQTBqIgMoAgBqNgIIIAAgASgCDCABQTRqIgQoAgBqNgIMIAAgASgCECABQThqIgUoAgBqNgIQIAAgASgCFCABQTxqIgYoAgBqNgIUIAAgASgCGCABQcAAaiIHKAIAajYCGCAAIAEoAhwgAUHEAGoiCCgCAGo2AhwgACABKAIgIAFByABqIgkoAgBqNgIgIAAgASgCJCABQcwAaiIKKAIAajYCJCAAIAEoAiggASgCAGs2AiggAEEsaiACKAIAIAEoAgRrNgIAIABBMGogAygCACABKAIIazYCACAAQTRqIAQoAgAgASgCDGs2AgAgAEE4aiAFKAIAIAEoAhBrNgIAIABBPGogBigCACABKAIUazYCACAAQcAAaiAHKAIAIAEoAhhrNgIAIABBxABqIAgoAgAgASgCHGs2AgAgAEHIAGogCSgCACABKAIgazYCACAAQcwAaiAKKAIAIAEoAiRrNgIAIAAgASgCUDYCUCAAQdQAaiABQdQAaigCADYCACAAQdgAaiABQdgAaigCADYCACAAQdwAaiABQdwAaigCADYCACAAQeAAaiABQeAAaigCADYCACAAQeQAaiABQeQAaigCADYCACAAQegAaiABQegAaigCADYCACAAQewAaiABQewAaigCADYCACAAQfAAaiABQfAAaigCADYCACAAQfQAaiABQfQAaigCADYCACAAQfgAaiABQfgAakHwj4CAABCdgICAAAvwCgETfyOAgICAAEHgAGsiAySAgICAACADIAEoAgAiBCABKAIoIgVqNgIwIAMgASgCBCIGIAFBLGooAgAiB2o2AjQgAyABKAIIIgggAUEwaigCACIJajYCOCADIAEoAgwiCiABQTRqKAIAIgtqNgI8IAMgASgCECIMIAFBOGooAgAiDWo2AkAgAyABKAIUIg4gAUE8aigCACIPajYCRCADIA8gDms2AhQgAyANIAxrNgIQIAMgCyAKazYCDCADIAkgCGs2AgggAyAHIAZrNgIEIAMgBSAEazYCACADIAEoAhgiBCABQcAAaigCACIFajYCSCADIAEoAhwiBiABQcQAaigCACIHajYCTCADIAEoAiAiCCABQcgAaigCACIJajYCUCADIAEoAiQiCiABQcwAaigCACILajYCVCADIAsgCms2AiQgAyAJIAhrNgIgIAMgByAGazYCHCADIAUgBGs2AhggA0EwaiADQTBqIAIQnYCAgAAgAyADIAJBKGoQnYCAgAAgACADKAIAIgQgAygCMCIFajYCKCAAQSxqIAMoAgQiBiADKAI0IgdqNgIAIABBMGogAygCCCIIIAMoAjgiCWo2AgAgAEE0aiADKAIMIgogAygCPCILajYCACAAQThqIAMoAhAiDCADKAJAIg1qNgIAIABBPGogAygCFCIOIAMoAkQiD2o2AgAgAEHAAGogAygCGCIQIAMoAkgiEWo2AgAgAEHEAGogAygCHCISIAMoAkwiE2o2AgAgAEHIAGogAygCICIUIAMoAlAiFWo2AgAgACAPIA5rNgIUIAAgDSAMazYCECAAIAsgCms2AgwgACAJIAhrNgIIIAAgByAGazYCBCAAIAUgBGs2AgAgAEHMAGogAygCJCIEIAMoAlQiBWo2AgAgACAFIARrNgIkIAAgFSAUazYCICAAIBMgEms2AhwgACARIBBrNgIYIAAgASgCUEEBdDYCUCAAQdQAaiIFIAFB1ABqKAIAQQF0NgIAIABB2ABqIgYgAUHYAGooAgBBAXQ2AgAgAEHcAGoiByABQdwAaigCAEEBdDYCACAAQeAAaiIIIAFB4ABqKAIAQQF0NgIAIABB5ABqIgkgAUHkAGooAgBBAXQ2AgAgAEHoAGoiCiABQegAaigCAEEBdDYCACAAQewAaiILIAFB7ABqKAIAQQF0NgIAIABB8ABqIgwgAUHwAGooAgBBAXQ2AgAgAEH0AGoiDSABQfQAaigCAEEBdDYCACAAQdAAaiIEIAQgAkHQAGoQnYCAgAAgAEH4AGoiDiABQfgAaiACQfgAahCdgICAACADIAAoAngiASAAKAJQIgJqNgIwIAMgAEH8AGooAgAiDyAFKAIAIgVqNgI0IAMgAEGAAWooAgAiECAGKAIAIgZqNgI4IAMgAEGEAWooAgAiESAHKAIAIgdqNgI8IAMgAEGIAWooAgAiEiAIKAIAIghqNgJAIAMgAEGMAWooAgAiEyAJKAIAIglqNgJEIAMgCSATazYCFCADIAggEms2AhAgAyAHIBFrNgIMIAMgBiAQazYCCCADIAUgD2s2AgQgAyACIAFrNgIAIAMgAEGQAWooAgAiASAKKAIAIgJqNgJIIAMgAEGUAWooAgAiBSALKAIAIgZqNgJMIAMgAEGYAWooAgAiByAMKAIAIghqNgJQIAMgAEGcAWooAgAiCSANKAIAIgpqNgJUIAMgCiAJazYCJCADIAggB2s2AiAgAyAGIAVrNgIcIAMgAiABazYCGCAOIAAgAEEoaiIBEJ2AgIAAIAAgACADEJ2AgIAAIAEgASADQTBqEJ2AgIAAIAQgA0EwaiADEJ2AgIAAIANB4ABqJICAgIAAC44EAQx/AkAgAC0AAyIEIAJHDQAgAyACQQN2ai0AACACQQdxdkEBcSEFAkACQCACDQBBACEGDAELIAMgAkF/aiIGQQN2ai0AACAGQQdxdkEBcSEGCwJAAkAgBSAGRw0AIARBf2ohAQwBC0EAIQdBACAFIAJBAWoiBiABIAYgAUgbIghBf2oiCXRrIQYCQCAIQQJIDQBBACEKAkACQCAIQQJHDQBBACELDAELIAlBAXEhDCACIAhrIQ0gCUF+cSELQQAhAQNAQQAhBQJAIA0gAWoiDkEBaiIPQQBIDQAgAyAPQQN2ai0AACAPQQdxdkEBcSEFCyAFIAF0IAZqIQ9BACEFAkAgDkECaiIGQQBIDQAgAyAGQQN2ai0AACAGQQdxdkEBcSEFCyAFIAFBAWp0IA9qIQYgAUECaiIBIAtHDQALIAxFDQELAkAgCyACIAlraiIBQQBIDQAgAyABQQN2ai0AACABQQdxdkEBcSEKCyAKIAt0IAZqIQYLAkAgAiAIayIBQQBIDQAgAyABQQN2ai0AACABQQdxdkEBcSEHCyAAIAcgBmoiBSAFQQAgBWtxIgVBzAFxQQBHQQF0IAVBqgFxQQBHciAFQfABcUEAR0ECdHIiBXU6AAIgACABIAVqQQFqOwEAIAQgCGshAQsgACABOgADC0EAIQECQCAALgEAIAJHDQAgACwAAiEBCyABC5QLARF/IAMgASgCACABKAIoajYCACADIAEoAgQgAUEsaiIFKAIAajYCBCADIAEoAgggAUEwaiIGKAIAajYCCCADIAEoAgwgAUE0aiIHKAIAajYCDCADIAEoAhAgAUE4aiIIKAIAajYCECADIAEoAhQgAUE8aiIJKAIAajYCFCADIAEoAhggAUHAAGoiCigCAGo2AhggAyABKAIcIAFBxABqIgsoAgBqNgIcIAMgASgCICABQcgAaiIMKAIAajYCICADIAEoAiQgAUHMAGoiDSgCAGo2AiQgBCABKAIoIAEoAgBrNgIAIAQgBSgCACABKAIEazYCBCAEIAYoAgAgASgCCGs2AgggBCAHKAIAIAEoAgxrNgIMIAQgCCgCACABKAIQazYCECAEIAkoAgAgASgCFGs2AhQgBCAKKAIAIAEoAhhrNgIYIAQgCygCACABKAIcazYCHCAEIAwoAgAgASgCIGs2AiAgBCANKAIAIAEoAiRrNgIkIAMgAyACEJ2AgIAAIAQgBCACQShqEJ2AgIAAIAAgBCgCACADKAIAajYCKCAAQSxqIAQoAgQgAygCBGo2AgAgAEEwaiAEKAIIIAMoAghqNgIAIABBNGogBCgCDCADKAIMajYCACAAQThqIAQoAhAgAygCEGo2AgAgAEE8aiAEKAIUIAMoAhRqNgIAIABBwABqIAQoAhggAygCGGo2AgAgAEHEAGogBCgCHCADKAIcajYCACAAQcgAaiAEKAIgIAMoAiBqNgIAIABBzABqIAQoAiQgAygCJGo2AgAgACADKAIAIAQoAgBrNgIAIAAgAygCBCAEKAIEazYCBCAAIAMoAgggBCgCCGs2AgggACADKAIMIAQoAgxrNgIMIAAgAygCECAEKAIQazYCECAAIAMoAhQgBCgCFGs2AhQgACADKAIYIAQoAhhrNgIYIAAgAygCHCAEKAIcazYCHCAAIAMoAiAgBCgCIGs2AiAgACADKAIkIAQoAiRrNgIkIAAgASgCUEEBdDYCUCAAQdQAaiIFIAFB1ABqKAIAQQF0NgIAIABB2ABqIgYgAUHYAGooAgBBAXQ2AgAgAEHcAGoiByABQdwAaigCAEEBdDYCACAAQeAAaiIIIAFB4ABqKAIAQQF0NgIAIABB5ABqIgkgAUHkAGooAgBBAXQ2AgAgAEHoAGoiCiABQegAaigCAEEBdDYCACAAQewAaiILIAFB7ABqKAIAQQF0NgIAIABB8ABqIgwgAUHwAGooAgBBAXQ2AgAgAEH0AGoiDSABQfQAaigCAEEBdDYCACAAQfgAaiIOIAFB+ABqIAJB0ABqEJ2AgIAAIAMgACgCeCAAKAJQajYCACADIABB/ABqIgEoAgAgBSgCAGo2AgQgAyAAQYABaiICKAIAIAYoAgBqNgIIIAMgAEGEAWoiDygCACAHKAIAajYCDCADIABBiAFqIhAoAgAgCCgCAGo2AhAgAyAAQYwBaiIRKAIAIAkoAgBqNgIUIAMgAEGQAWoiEigCACAKKAIAajYCGCADIABBlAFqIhMoAgAgCygCAGo2AhwgAyAAQZgBaiIUKAIAIAwoAgBqNgIgIAMgAEGcAWoiFSgCACANKAIAajYCJCAEIAAoAlAgACgCeGs2AgAgBCAFKAIAIAEoAgBrNgIEIAQgBigCACACKAIAazYCCCAEIAcoAgAgDygCAGs2AgwgBCAIKAIAIBAoAgBrNgIQIAQgCSgCACARKAIAazYCFCAEIAooAgAgEigCAGs2AhggBCALKAIAIBMoAgBrNgIcIAQgDCgCACAUKAIAazYCICAEIA0oAgAgFSgCAGs2AiQgDiAAIABBKGoiARCdgICAACAAIAAgBBCdgICAACABIAEgAxCdgICAACAAQdAAaiADIAQQnYCAgAALtwwBAn8jgICAgABBsAFrIgIkgICAgAAgAkHgAGogAUHQAGoiAxCcgICAACACQeAAaiACQeAAahCegICAABogAkHgAGogAkHgAGoQnICAgAAgAkEwaiACQeAAaiADEJ2AgIAAIAJBADoAYCACQQA6AGEgAkEAOgBiIAJBADoAYyACQQA6AGQgAkEAOgBlIAJBADoAZiACQQA6AGcgAkEAOgBoIAJBADoAaSACQQA6AGogAkEAOgBrIAJBADoAbCACQQA6AG0gAkEAOgBuIAJBADoAbyACQQA6AHAgAkEAOgBxIAJBADoAciACQQA6AHMgAkEAOgB0IAJBADoAdSACQQA6AHYgAkEAOgB3IAJBADoAeCACQQA6AHkgAkEAOgB6IAJBADoAeyACQQA6AHwgAkEAOgB9IAJBADoAfiACQQA6AH8gAkEAOgCAASACQQA6AIEBIAJBADoAggEgAkEAOgCDASACQQA6AIQBIAJBADoAhQEgAkEAOgCGASACQQA6AIcBIAJB4ABqIAEgAkEwahCdgICAACACIAFBKGogAkEwahCdgICAACAAIAIQn4CAgAAgAkGQAWogAkHgAGoQn4CAgAAgAi0AkAEhASACQQA6AJABIAJBADoAkQEgAkEAOgCSASACQQA6AJMBIAJBADoAlAEgAkEAOgCVASACQQA6AJYBIAJBADoAlwEgAkEAOgCYASACQQA6AJkBIAJBADoAmgEgAkEAOgCbASACQQA6AJwBIAJBADoAnQEgAkEAOgCeASACQQA6AJ8BIAJBADoAoAEgAkEAOgChASACQQA6AKIBIAJBADoAowEgAkEAOgCkASACQQA6AKUBIAJBADoApgEgAkEAOgCnASACQQA6AKgBIAJBADoAqQEgAkEAOgCqASACQQA6AKsBIAJBADoArAEgAkEAOgCtASACQQA6AK4BIAJBADoArwEgACAALQAfIAFBB3RzOgAfIAJBADoAMCACQQA6ADEgAkEAOgAyIAJBADoAMyACQQA6ADQgAkEAOgA1IAJBADoANiACQQA6ADcgAkEAOgA4IAJBADoAOSACQQA6ADogAkEAOgA7IAJBADoAPCACQQA6AD0gAkEAOgA+IAJBADoAPyACQQA6AEAgAkEAOgBBIAJBADoAQiACQQA6AEMgAkEAOgBEIAJBADoARSACQQA6AEYgAkEAOgBHIAJBADoASCACQQA6AEkgAkEAOgBKIAJBADoASyACQQA6AEwgAkEAOgBNIAJBADoATiACQQA6AE8gAkEAOgBQIAJBADoAUSACQQA6AFIgAkEAOgBTIAJBADoAVCACQQA6AFUgAkEAOgBWIAJBADoAVyACQQA6AGAgAkEAOgBhIAJBADoAYiACQQA6AGMgAkEAOgBkIAJBADoAZSACQQA6AGYgAkEAOgBnIAJBADoAaCACQQA6AGkgAkEAOgBqIAJBADoAayACQQA6AGwgAkEAOgBtIAJBADoAbiACQQA6AG8gAkEAOgBwIAJBADoAcSACQQA6AHIgAkEAOgBzIAJBADoAdCACQQA6AHUgAkEAOgB2IAJBADoAdyACQQA6AHggAkEAOgB5IAJBADoAeiACQQA6AHsgAkEAOgB8IAJBADoAfSACQQA6AH4gAkEAOgB/IAJBADoAgAEgAkEAOgCBASACQQA6AIIBIAJBADoAgwEgAkEAOgCEASACQQA6AIUBIAJBADoAhgEgAkEAOgCHASACQQA6AAAgAkEAOgABIAJBADoAAiACQQA6AAMgAkEAOgAEIAJBADoABSACQQA6AAYgAkEAOgAHIAJBADoACCACQQA6AAkgAkEAOgAKIAJBADoACyACQQA6AAwgAkEAOgANIAJBADoADiACQQA6AA8gAkEAOgAQIAJBADoAESACQQA6ABIgAkEAOgATIAJBADoAFCACQQA6ABUgAkEAOgAWIAJBADoAFyACQQA6ABggAkEAOgAZIAJBADoAGiACQQA6ABsgAkEAOgAcIAJBADoAHSACQQA6AB4gAkEAOgAfIAJBADoAICACQQA6ACEgAkEAOgAiIAJBADoAIyACQQA6ACQgAkEAOgAlIAJBADoAJiACQQA6ACcgAkGwAWokgICAgAAL6xAFAn8VfgZ/An4Bf0EAIQIjgICAgABB8ABrIgNBAEHkAPwLACABNQI8IQQgATUCOCEFIAE1AjQhBiABNQIwIQcgATUCLCEIIAE1AighCSABNQIkIQogATUCICELIAE1AhwhDCABNQIYIQ0gATUCFCEOIAE1AhAhDyABNQIMIRAgATUCCCERIAE1AgQhEiABNQIAIRNCACEUQgAhFUIAIRZCACEXQgAhGEEAIRlBACEaQQAhG0EAIRxBACEdAkADQCADIAJqIh4gEyACQaCQgIAAajUCACIffiAdrXwiID4CACAeQQRqIh0gIEIgiCAcrXwgEiAffnwiID4CACAeQQhqIhwgIEIgiCAbrXwgESAffnwiID4CACAeQQxqIhsgIEIgiCAarXwgECAffnwiID4CACAeQRBqIhogIEIgiCAZrXwgDyAffnwiID4CACAeQRRqIiEgIEIgiCAYQv////8Pg3wgDiAffnwiGD4CACAeQRhqIBhCIIggF0L/////D4N8IA0gH358Ihg+AgAgHkEcaiAYQiCIIBZC/////w+DfCAMIB9+fCIXPgIAIB5BIGogF0IgiCAVQv////8Pg3wgCyAffnwiFj4CACAeQSRqIBZCIIggFEL/////D4N8IAogH358IhU+AgAgHkEoaiIZIBVCIIggGTUCAHwgCSAffnwiFD4CACAeQSxqIhkgFEIgiCAZNQIAfCAIIB9+fCIgPgIAIB5BMGoiGSAgQiCIIBk1AgB8IAcgH358IiA+AgAgHkE0aiIZICBCIIggGTUCAHwgBiAffnwiID4CACAeQThqIhkgIEIgiCAZNQIAfCAFIB9+fCIgPgIAIB5BPGoiHiAgQiCIIB41AgB8IAQgH358NwIAIAJBIEYNASACQQRqIQIgISgCACEZIBooAgAhGiAbKAIAIRsgHCgCACEcIB0oAgAhHQwACwsgACABKAIcIAE1AgAgAygCQCIerSIfQu2n1+cFfiIVQoCAgIBwhH0iF0IgiCABNQIEfCADNQJEIhRC7afX5wV+IBVCIIggH0KaxsnABX58IhZC/////w+DfCIYQn+FQv////8Pg3wiIEIgiCABNQIIfCADNQJIIhVC7afX5wV+IBhCIIggFkIgiCAfQta53pcKfnwiGEL/////D4N8IBRCmsbJwAV+fCIEQv////8Pg3wiBUJ/hUL/////D4N8IgZCIIggATUCDHwgAzUCTCIWQu2n1+cFfiAFQiCIIARCIIggGEIgiCAfQt7z+6YBfnwiGEL/////D4N8IBRC1rnelwp+fCIEQv////8Pg3wgFUKaxsnABX58IgVC/////w+DfCIHQn+FQv////8Pg3wiCEIgiCABNQIQfCADNQJQIh9C7afX5wV+IAdCIIggBUIgiCAEQiCIIBhCIIh8IBRC3vP7pgF+fCIYQv////8Pg3wgFULWud6XCn58IgRC/////w+DfCAWQprGycAFfnwiBUL/////D4N8IgdCf4VC/////w+DfCIJQiCIIAE1AhR8IAM1AlQiFELtp9fnBX4gB0IgiCAFQiCIIARCIIggGEIgiHwgFULe8/umAX58IhVC/////w+DfCAWQta53pcKfnwiGEL/////D4N8IB9CmsbJwAV+fCIEQv////8Pg3wiBUJ/hUL/////D4N8IgdCIIggATUCGHwgAzUCWCIKQu2n1+cFfiAFQiCIIARCIIggGEIgiCAVQiCIfCAWQt7z+6YBfnwiFUL/////D4N8IB9C1rnelwp+fCIWQv////8Pg3wgFEKaxsnABX58IhhC/////w+DfCIEQn+FQv////8Pg3wiBUIgiKdqIAMoAlxB7afX5wVsIARCIIggGEIgiCAWQiCIIB5BHHQgFUIgiKdqrXwgH0Le8/umAX58fCAUQta53pcKfnx8IApCmsbJwAV+fKdqQX9zaiICrSAFQv////8PgyIEIAdC/////w+DIhggCUL/////D4MiBSAIQv////8PgyIWIAZC/////w+DIhUgIEL/////D4MiFCAXQv////8PgyIfQpPYqJgKfEIgiHxC5bm2vwp8QiCIfEKpxqHoBXxCIIh8QqGMhNkOfEIgiHxC/////w98QiCIfEL/////D3xCIIh8Qv////8PfEIgiHxC/////w58QiCIIhcgH3xBACAXp2siHkGS2KiYenGtfCIfPAAAIAAgH0IYiDwAAyAAIB9CEIg8AAIgACAfQgiIPAABIAAgFCAeQeW5tr96ca18IB9CIIh8IhQ8AAQgACAUQhiIPAAHIAAgFEIQiDwABiAAIBRCCIg8AAUgACAVIB5Bqcah6AVxrXwgFEIgiHwiFTwACCAAIBVCGIg8AAsgACAVQhCIPAAKIAAgFUIIiDwACSAAIBYgHkGhjITZfnGtfCAVQiCIfCIWPAAMIAAgFkIYiDwADyAAIBZCEIg8AA4gACAWQgiIPAANIAAgBSAerSIgfCAWQiCIfCIXPAAQIAAgF0IYiDwAEyAAIBdCEIg8ABIgACAXQgiIPAARIAAgGCAgfCAXQiCIfCIYPAAUIAAgGEIYiDwAFyAAIBhCEIg8ABYgACAYQgiIPAAVIAAgBCAgfCAYQiCIfCIgPAAYIAAgIEIYiDwAGyAAICBCEIg8ABogACAgQgiIPAAZIAMgHz4CACADIBQ+AgQgAyAVPgIIIAMgFj4CDCADIBc+AhAgAyAYPgIUIAMgID4CGCADIB5B/////35xIAJqICBCIIinajYCHCAAIAMoAhw2ABxBACECA0AgAyACaiIeQQA6AAAgHkEBakEAOgAAIB5BAmpBADoAACAeQQNqQQA6AAAgHkEEakEAOgAAIAJBBWoiAkHkAEcNAAsL4wYOAX8CfgF/AX4BfwJ+AX8BfgF/AX4BfwF+AX8SfiAAIAEoAgwiAkEBdKwiAyACrCIEfiABKAIQIgWsIgYgASgCCCIHQQF0rCIIfnwgASgCFCICQQF0rCIJIAEoAgQiCkEBdKwiC358IAEoAhgiDKwiDSABKAIAIg5BAXSsIg9+fCABKAIgIhBBE2ysIhEgEKwiEn58IAEoAiQiEEEmbKwiEyABKAIcIgFBAXSsIhR+fCAGIAt+IAggBH58IAKsIhUgD358IBEgFH58IBMgDX58IAMgC34gB6wiFiAWfnwgBiAPfnwgAUEmbKwiFyABrCIYfnwgESAMQQF0rH58IBMgCX58IhlCgICAEHwiGkIah3wiG0KAgIAIfCIcQhmHfCIdIB1CgICAEHwiHkKAgIDgD4N9PgIYIAAgFiAPfiALIAqsIh9+fCAMQRNsrCIdIA1+fCAXIAl+fCARIAVBAXSsIiB+fCATIAN+fCAdIAl+IA8gH358IBcgBn58IBEgA358IBMgFn58IAJBJmysIBV+IA6sIh8gH358IB0gIH58IBcgA358IBEgCH58IBMgC358Ih1CgICAEHwiH0Iah3wiIEKAgIAIfCIhQhmHfCIiICJCgICAEHwiIkKAgIDgD4N9PgIIIAAgFSAIfiADIAZ+fCANIAt+fCAYIA9+fCATIBJ+fCAeQhqHfCIVIBVCgICACHwiFUKAgIDwD4N9PgIcIAAgBCAPfiALIBZ+fCAXIA1+fCARIAl+fCATIAZ+fCAiQhqHfCIRIBFCgICACHwiEUKAgIDwD4N9PgIMIAAgDSAIfiAGIAZ+fCAJIAN+fCAUIAt+fCASIA9+fCATIBCsIhZ+fCAVQhmHfCITIBNCgICAEHwiE0KAgIDgD4N9PgIgIAAgGyAcQoCAgPAPg30gEUIZhyAZIBpCgICAYIN9fCIRQoCAgBB8IhdCGoh8PgIUIAAgESAXQoCAgOAPg30+AhAgACAJIAZ+IA0gA358IBggCH58IBIgC358IBYgD358IBNCGod8IgYgBkKAgIAIfCIGQoCAgPAPg30+AiQgACAgICFCgICA8A+DfSAGQhmHQhN+IB0gH0KAgIBgg318IgZCgICAEHwiC0IaiHw+AgQgACAGIAtCgICA4A+DfT4CAAvJCRgBfwF+AX8DfgF/An4BfwF+AX8BfgF/An4BfwF+AX8BfgF/An4BfwF+AX8BfgF/F34gACACKAIEIgOsIgQgASgCFCIFQQF0rCIGfiACNAIAIgcgATQCGCIIfnwgAigCCCIJrCIKIAE0AhAiC358IAIoAgwiDKwiDSABKAIMIg5BAXSsIg9+fCACKAIQIhCsIhEgATQCCCISfnwgAigCFCITrCIUIAEoAgQiFUEBdKwiFn58IAIoAhgiF6wiGCABNAIAIhl+fCACKAIcIhpBE2ysIhsgASgCJCIcQQF0rCIdfnwgAigCICIeQRNsrCIfIAE0AiAiIH58IAIoAiQiAkETbKwiISABKAIcIgFBAXSsIiJ+fCAEIAt+IAcgBawiI358IAogDqwiJH58IA0gEn58IBEgFawiJX58IBQgGX58IBdBE2ysIiYgHKwiJ358IBsgIH58IB8gAawiKH58ICEgCH58IAQgD34gByALfnwgCiASfnwgDSAWfnwgESAZfnwgE0ETbKwiKSAdfnwgJiAgfnwgGyAifnwgHyAIfnwgISAGfnwiKkKAgIAQfCIrQhqHfCIsQoCAgAh8Ii1CGYd8Ii4gLkKAgIAQfCIvQoCAgOAPg30+AhggACAEIBZ+IAcgEn58IAogGX58IAxBE2ysIjAgHX58ICAgEEETbKwiLn58ICkgIn58ICYgCH58IBsgBn58IB8gC358ICEgD358IAQgGX4gByAlfnwgCUETbKwiMSAnfnwgMCAgfnwgLiAofnwgKSAIfnwgJiAjfnwgGyALfnwgHyAkfnwgISASfnwgA0ETbKwgHX4gByAZfnwgMSAgfnwgMCAifnwgLiAIfnwgKSAGfnwgJiALfnwgGyAPfnwgHyASfnwgISAWfnwiMUKAgIAQfCIyQhqHfCIzQoCAgAh8IjRCGYd8IjAgMEKAgIAQfCI1QoCAgOAPg30+AgggACAEIAh+IAcgKH58IAogI358IA0gC358IBEgJH58IBQgEn58IBggJX58IBkgGqwiMH58IB8gJ358ICEgIH58IC9CGod8Ii8gL0KAgIAIfCIvQoCAgPAPg30+AhwgACAEIBJ+IAcgJH58IAogJX58IA0gGX58IC4gJ358ICkgIH58ICYgKH58IBsgCH58IB8gI358ICEgC358IDVCGod8Ih8gH0KAgIAIfCIfQoCAgPAPg30+AgwgACAEICJ+IAcgIH58IAogCH58IA0gBn58IBEgC358IBQgD358IBggEn58IDAgFn58IBkgHqwiG358ICEgHX58IC9CGYd8IiEgIUKAgIAQfCIhQoCAgOAPg30+AiAgACAsIC1CgICA8A+DfSAfQhmHICogK0KAgIBgg318Ih9CgICAEHwiJkIaiHw+AhQgACAfICZCgICA4A+DfT4CECAAIAQgIH4gByAnfnwgCiAofnwgDSAIfnwgESAjfnwgFCALfnwgGCAkfnwgMCASfnwgGyAlfnwgGSACrH58ICFCGod8IgcgB0KAgIAIfCIHQoCAgPAPg30+AiQgACAzIDRCgICA8A+DfSAHQhmHQhN+IDEgMkKAgIBgg318IgdCgICAEHwiCEIaiHw+AgQgACAHIAhCgICA4A+DfT4CAAuHIAEFfyOAgICAAEGQAWsiAiSAgICAACACQeAAaiABEJyAgIAAIAJBMGogAkHgAGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogASACQTBqEJ2AgIAAIAJB4ABqIAJB4ABqIAJBMGoQnYCAgAAgAkHgAGogAkHgAGoQnICAgAAgAkHgAGogAkEwaiACQeAAahCdgICAACACQTBqIAJB4ABqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQeAAaiACQTBqIAJB4ABqEJ2AgIAAIAJBMGogAkHgAGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqIAJB4ABqEJ2AgIAAIAIgAkEwahCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAiACEJyAgIAAIAIgAhCcgICAACACIAIQnICAgAAgAkEwaiACIAJBMGoQnYCAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJB4ABqIAJBMGogAkHgAGoQnYCAgAAgAkEwaiACQeAAahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqIAJB4ABqEJ2AgIAAIAIgAkEwahCcgICAAEHjACEDA0AgAiACEJyAgIAAIANBf2oiAw0ACyACQTBqIAIgAkEwahCdgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJBMGogAkEwahCcgICAACACQTBqIAJBMGoQnICAgAAgAkEwaiACQTBqEJyAgIAAIAJB4ABqIAJBMGogAkHgAGoQnYCAgAAgAkHgAGogAkHgAGoQnICAgAAgAkHgAGogAkHgAGoQnICAgAAgAkHgAGogAkHgAGogARCdgICAACACQTBqIAJB4ABqEJyAgIAAIAJBMGogAkEwaiABEJ2AgIAAIAJCADcDICACQgA3AxggAkIANwMQIAJCADcDCCACQgA3AwAgASACEKCAgIAAIQQgAkIANwMgIAJCADcDGCACQgA3AxAgAkIANwMIIAJCATcDACACQTBqIAIQoICAgAAhBSACQQAgAigCAGs2AgAgAkEAIAIoAgRrNgIEIAJBACACKAIIazYCCCACQQAgAigCDGs2AgwgAkEAIAIoAhBrNgIQIAJBACACKAIUazYCFCACQQAgAigCGGs2AhggAkEAIAIoAhxrNgIcIAJBACACKAIgazYCICACQQAgAigCJGs2AiQgAkEwaiACEKCAgIAAIQEgAkLih+z/7+38qH83AyAgAkLh5v6L4NKmDzcDGCACQqDni/qfi4oCNwMQIAJC4s7D+5/QpWU3AwggAkLQvsWP0MXNPDcDACACQTBqIAIQoICAgAAhAyAAIAJB4ABqQcCPgIAAEJ2AgIAAIAAgAigCYCAAKAIAIgZzIAMgAXJBf2oiA3EgBnM2AgAgACACKAJkIAAoAgQiBnMgA3EgBnM2AgQgACACKAJoIAAoAggiBnMgA3EgBnM2AgggACACKAJsIAAoAgwiBnMgA3EgBnM2AgwgACACKAJwIAAoAhAiBnMg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aigCACABKAJ0IgZzIAVxIAZzNgJ0IAhBAWohCCAHQfgAaiIHQcAHRw0ACyACQQAgDms2AgAgAkEAIAEoAlRrNgIEIAJBACABKAJYazYCCCACQQAgASgCXGs2AgwgAkEAIAEoAmBrNgIQIAJBACABKAJkazYCFCACQQAgASgCaGs2AhggAkEAIAEoAmxrNgIcIAJBACABKAJwazYCICACQQAgASgCdGs2AiQgCiACIAlBAXMiBhCigICAACABIAsgBhCigICAACAAIAAgASACIAMQmYCAgAALjwMBAn8gACABKAIAIAAoAgAiA3NBACACayICcSIEIANzNgIAIAEgASgCACAEczYCACAAIAEoAgQgACgCBCIDcyACcSIEIANzNgIEIAEgASgCBCAEczYCBCAAIAEoAgggACgCCCIDcyACcSIEIANzNgIIIAEgASgCCCAEczYCCCAAIAEoAgwgACgCDCIDcyACcSIEIANzNgIMIAEgASgCDCAEczYCDCAAIAEoAhAgACgCECIDcyACcSIEIANzNgIQIAEgASgCECAEczYCECAAIAEoAhQgACgCFCIDcyACcSIEIANzNgIUIAEgASgCFCAEczYCFCAAIAEoAhggACgCGCIDcyACcSIEIANzNgIYIAEgASgCGCAEczYCGCAAIAEoAhwgACgCHCIDcyACcSIEIANzNgIcIAEgASgCHCAEczYCHCAAIAEoAiAgACgCICIDcyACcSIEIANzNgIgIAEgASgCICAEczYCICAAIAEoAiQgACgCJCIDcyACcSICIANzNgIkIAEgASgCJCACczYCJAv+BAQCfxJ+BH8BfiAAQcAAaiEBQQAhAiAAKQMAIgMhBCAAKQMIIgUhBiAAKQMQIgchCCAAKQMYIgkhCiAAKQMgIgshDCAAKQMoIg0hDiAAKQM4Ig8hECAAKQMwIhEhEgNAIBIhEyAIIRQgBiEIIAQiBkIkiSAGQh6JhSAGQhmJhSAIIBSFIAaDIAggFIOFfCAOIhIgDCIOgyAQfCATIA5Cf4WDfCAOQjKJIA5CLomFIA5CF4mFfCACQcCggIAAaikDAHwgASACaikDAHwiEHwhBCAQIAp8IQwgFCEKIBMhECACQQhqIgJBgAFHDQALIABBwABqIRVBwKGAgAAhFkEBIRcDQEEOIQEgFSECIBYhGANAIBIhECAIIQog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");
var falcon512_default2 = __toBinary2("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IgENAAtBgGAhAQNAIAFBsL7CgABqIgIgAisDAEQAAAAAgADIQKI5AwAgAUG4vsKAAGoiAiACKwMARAAAAACAAMhAojkDACABQcC+woAAaiICIAIrAwBEAAAAAIAAyECiOQMAIAFByL7CgABqIgIgAisDAEQAAAAAgADIQKI5AwAgAUEgaiIBDQALQQAhAQNAIAFBsP7BgABqIgIgAisDACABQbC+woAAaisDACIOojkDACABQbCOwoAAaiICIA4gAisDAKI5AwAgAUG4/sGAAGoiAiACKwMAIAFBuL7CgABqKwMAIg6iOQMAIAFBuI7CgABqIgIgDiACKwMAojkDACABQRBqIgFBgBBHDQALQQAhAQNAIAFBsJ7CgABqIgIgAisDACABQbC+woAAaisDACIOojkDACABQbCuwoAAaiICIA4gAisDAKI5AwAgAUG4nsKAAGoiAiACKwMAIAFBuL7CgABqKwMAIg6iOQMAIAFBuK7CgABqIgIgDiACKwMAojkDACABQRBqIgFBgBBHDQALQbD+wYAAQQkQjICAgABBsJ7CgABBCRCMgICAAEQAAAAAAAAAACEOQYAMIQEDQCAOIAFBsPLBgABqKwMAIg8gD6KgIAFBsJLCgABqKwMAIg4gDqKgIAFBuPLBgABqKwMAIg4gDqKgIAFBuJLCgABqKwMAIg4gDqKgIQ4gAUEQaiIBQYAsRw0ACyAORKyt2F+abdBAY0UNAEGw/sGAAEGwhsKAABCKgICAAEUNAEEAIQFBgIXCgABBCUEAEI+AgIAAQYCFwoAAQeoAQeoAQQJBAEHQi8KAABCQgICAAEECQQJBAkECQQAoAqiIwoAAIgJrIgMgAmxrIANsIgMgAmxrIANsIgMgAmxrIANsIgMgAmxBfmogA2whA0ECQQJBAkECQQAoAoCFwoAAIgJrIgQgAmxrIARsIgQgAmxrIARsIgQgAmxrIARsIgQgAmxBfmogBGwhBAJAA0AgAUGgksKAAGogAjoAACABQaGSwoAAaiABQYGFwoAAai0AADoAACABQaKSwoAAaiABQYKFwoAAai0AADoAACABQaOSwoAAaiABQYOFwoAAai0AADoAACABQaQDRg0BIAFBhIXCgABqLQAAIQIgAUEEaiEBDAALCyAEQf////8HcSELQQAhAQNAIAFByJXCgABqIAFBqIjCgABqLQAAOgAAIAFByZXCgABqIAFBqYjCgABqLQAAOgAAIAFBypXCgABqIAFBqojCgABqLQAAOgAAIAFBy5XCgABqIAFBq4jCgABqLQAAOgAAIAFBBGoiAUGoA0cNAAtBACEBQQBBATYC2IHCgAADQCABQdyBwoAAakIANwIAIAFBCGoiAUGgA0cNAAtBzBIhAQNAIAFBsPLBgABqQQA6AAAgAUEBaiIBQdASRw0AC0EAIQEDQCABQbD+wYAAakIANwMAIAFBCGoiAUGoA0cNAAtBACEBA0AgAUHQi8KAAGogAUGoiMKAAGotAAA6AAAgAUHRi8KAAGogAUGpiMKAAGotAAA6AAAgAUHSi8KAAGogAUGqiMKAAGotAAA6AAAgAUHTi8KAAGogAUGriMKAAGotAAA6AAAgAUEEaiIBQagDRw0AC0EAIQEDQCABQfiOwoAAaiABQYCFwoAAai0AADoAACABQfmOwoAAaiABQYGFwoAAai0AADoAACABQfqOwoAAaiABQYKFwoAAai0AADoAACABQfuOwoAAaiABQYOFwoAAai0AADoAACABQQRqIgFBqANHDQALQQBBACgC+I7CgABBf2o2AviOwoAAIANB/////wdxIRVByjMhCgNAQX8hCUEAIQJBfyEFQQAhCEEAIQNBACENQQAhBANAIAJB7JjCgABqKAIAIgYgAkHElcKAAGooAgAiB3JB/////wdqQR92QX9qIAkiAXEhCSAGIARzIAVxIARzIQQgASAGIA0iDHNxIAxzIQ0gByADcyAFcSADcyEDIAEgByAIIgZzcSAGcyEIIAEhBSACQXxqIgJB2HxHDQALIAwgAUF/cyICca1CH4YgDSABcSAEcq18IRYgBiACca1CH4YgCCABcSADcq18IRdBACEBQgAhGEIBIRlCACEaQgEhG0EAKALIlcKAACIIIQJBACgCoJLCgAAiDSEDA0AgAiADIAJBACADIAF2QQFxIgUgAiABdnEiBiAWIBd9IhwgF4UgFyAWhYMgHIVCP4inIgdxIgRrcWsiA0EAIAYgB0F/c3EiBmtxayICQQAgBCAFQQFzciIFa3EgAmohAiAZIBogGUIAIAStfSIcg30iGkIAIAatfSIdg30iGUIAIAWtIh59Ih+DIBl8IRkgGCAbIBggHIN9IhsgHYN9IhggH4MgGHwhGCAWIBcgFiAcg30iFyAdg30iFkIBiCAWhSAeQn98IhyDIBaFIRYgAyAFQX9qcSADaiEDIBogHIMgGnwhGiAbIByDIBt8IRsgF0IBiCAXhSAfgyAXhSEXIAFBAWoiAUEfRw0ACyAZIAitIhd+IBggDa0iHH58Qh+HIRYgGiAXfiAbIBx+fEIfhyEXQdx8IQEDQCABQeyYwoAAaiAYIAFByJXCgABqNQIAIh1+IBZ8IBkgAUHwmMKAAGo1AgAiFn58IhynQf////8HcTYCACABQcSVwoAAaiAbIB1+IBd8IBogFn58Ih2nQf////8HcTYCACAcQh+HIRYgHUIfhyEXIAFBBGoiAQ0AC0EAIBY+AuyYwoAAQQAgFz4CxJXCgABBACAXQj+IpyICa0EBdiEDQdh8IQEDQCABQciVwoAAaiIEIAQoAgAgA3MgAmoiAkH/////B3E2AgAgAUHMlcKAAGoiBCAEKAIAIANzIAJBH3ZqIgJB/////wdxNgIAIAJBH3YhAiABQQhqIgENAAtBACAWQj+IpyICa0EBdiEDQdh8IQEDQCABQfCYwoAAaiIEIAQoAgAgA3MgAmoiAkH/////B3E2AgAgAUH0mMKAAGoiBCAEKAIAIANzIAJBH3ZqIgJB/////wdxNgIAIAJBH3YhAiABQQhqIgENAAtB2IHCgABB0IvCgABBqIjCgAAgFSAbIB1CP4ciFiAbQgGGg30iFyAaIBYgGkIBhoN9IhYgGCAcQj+HIhogGEIBhoN9IhggGSAaIBlCAYaDfSIZEJGAgIAAQbD+wYAAQfiOwoAAQYCFwoAAIAsgFyAWIBggGRCRgICAACAKQWJqIgpBHUsNAAtBACgCoJLCgABBAXMhAkHgfCEBA0AgAUHQlcKAAGooAgAgAUHMlcKAAGooAgAgAUHIlcKAAGooAgAgAUHElcKAAGooAgAgAnJycnIhAiABQRBqIgENAAtBACgCgIXCgABBACgCxJXCgAAgAnJFcUEAKAKoiMKAAHFFDQBCACEWQdh8IQEDQCABQdiBwoAAaiICIAI1AgBCgeAAfiAWfCIWp0H/////B3E2AgAgAUHcgcKAAGoiAiACNQIAQoHgAH4gFkIfiHwiF6dB/////wdxNgIAIBdCH4ghFiABQQhqIgENAAsgF0L/////B1YNAEIAIRZB2HwhAQNAIAFBgIXCgABqIgIgAjUCAEKB4AB+IBZ8IhanQf////8HcTYCACABQYSFwoAAaiICIAI1AgBCgeAAfiAWQh+IfCIXp0H/////B3E2AgAgF0IfiCEWIAFBCGoiAQ0ACyAXQv////8HVg0AQQkhIANAAkAgIEECSw0AQQAhDUEAIQIDQCACQQxsQYCLgYAAaigCACIBQQBBACABQQF0ayABQX1sIgMgA0EASButIhYgFn4iGCABQQIgAUECIAFBAiABQQIgAWsiA2xrIANsIgNsayADbCIDbGsgA2wiA2xBfmogA2xB/////wdxrSIWfkL/////B4MgAa0iF34gGHxCH4inIgMgAyABayIDIANBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyIDIAMgAWsiAyADQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAyADIAFrIgMgA0EASButIhggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgMgAyABayIDIANBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyIDIAMgAWsiAyADQQBIGyIDQQFxa3EgA2pBAXatIhhBgICAgHggAWutfiIZIBZ+Qv////8HgyAXfiAZfEIfiKciAyADIAFrIgMgA0EASBshBEEAIAFrIgNBACADQQBKGyEFIAJBAnRBsPLBgABqIQhBACECA0AgCCACaiIGQYAcaiACQbT+wYAAaigCACIDIAMgAWsiByAHQQBIGyAFaiIHIAcgAWsiByAHQQBIG60gGH4iGSAWfkL/////B4MgF34gGXxCH4inIgcgByABayIHIAdBAEgbIAJBsP7BgABqKAIAIgcgByABayIHIAdBAEgbaiIHIAcgAWsiByAHQQBIGyAEQQAgA0EedmtxayIDQR91IAFxIANqNgIAIAZBgCxqIAJBtIbCgABqKAIAIgMgAyABayIGIAZBAEgbIAVqIgYgBiABayIGIAZBAEgbrSAYfiIZIBZ+Qv////8HgyAXfiAZfEIfiKciBiAGIAFrIgYgBkEASBsgAkGwhsKAAGooAgAiBiAGIAFrIgYgBkEASBtqIgYgBiABayIGIAZBAEgbIARBACADQR52a3FrIgNBH3UgAXEgA2o2AgAgAkEIaiICQYAIRw0AC0EBIQIgDUEBcSEBQQEhDSABRQ0AC0EAIQEDQCABQbD+wYAAaiABQbCOwoAAai0AADoAACABQbH+wYAAaiABQbGOwoAAai0AADoAACABQbL+wYAAaiABQbKOwoAAai0AADoAACABQbP+wYAAaiABQbOOwoAAai0AADoAACABQQRqIgFBgBBHDQALQQAhAQNAIAFBsI7CgABqIAFBsJ7CgABqLQAAOgAAIAFBsY7CgABqIAFBsZ7CgABqLQAAOgAAIAFBso7CgABqIAFBsp7CgABqLQAAOgAAIAFBs47CgABqIAFBs57CgABqLQAAOgAAIAFBBGoiAUGAEEcNAAtBACEVQQEhIQNAIBUhIkGwrsKAAEGwvsKAAEEJIBVBDGwiAUGEi4GAAGooAgAgAUGAi4GAAGooAgAiASABQQIgAUECIAFBAiABQQIgAWsiAmxrIAJsIgJsayACbCICbGsgAmwiAmxBfmogAmxB/////wdxIiMQkoCAgABBACABQQF0ayABQX1sIgIgAkEASButIhYgFn4iGCAjrSIWfkL/////B4MgAa0iF34gGHxCH4inIgIgAiABayICIAJBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyICIAIgAWsiAiACQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAiACIAFrIgIgAkEASButIhggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgIgAiABayICIAJBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyICIAIgAWsiAiACQQBIGyIGQQFxIQdBgHwhAkGw1sKAACEDA0AgA0GAcGogAkGw9sGAAGosAAAiBEEfdSABcSAEajYCACADIAJBsPrBgABqLAAAIgRBH3UgAXEgBGo2AgAgA0EEaiEDIAJBAWoiBCACTyEFIAQhAiAFDQALIAFBACAHa3EgBmohJEEBIQxBgAQhAgNAIAJBAXYhCwJAIAxFDQAgAkECdCEKIAtBAnQhCEEAIQlBsMbCgAAhBwNAIAcgCGohDSAJIAxqQQJ0QbCuwoAAajUCACEZQQAhAgNAIAcgAmoiAyANIAJqIgQ1AgAgGX4iGCAWfkL/////B4MgF34gGHxCH4inIgUgBSABayIFIAVBAEgbIgUgAygCACIDaiIGIAYgAWsiBiAGQQBIGzYCACAEIAMgBWsiA0EfdSABcSADajYCACAIIAJBBGoiAkcNAAsgByAKaiEHIAlBAWoiCSAMRw0ACwsgCyECIAxBAXQiDEGABEkNAAtBASEMQYAEIQIDQCACQQF2IQsCQCAMRQ0AIAJBAnQhCiALQQJ0IQhBACEJQbDWwoAAIQcDQCAHIAhqIQ0gCSAMakECdEGwrsKAAGo1AgAhGUEAIQIDQCAHIAJqIgMgDSACaiIENQIAIBl+IhggFn5C/////weDIBd+IBh8Qh+IpyIFIAUgAWsiBSAFQQBIGyIFIAMoAgAiA2oiBiAGIAFrIgYgBkEASBs2AgAgBCADIAVrIgNBH3UgAXEgA2o2AgAgCCACQQRqIgJHDQALIAcgCmohByAJQQFqIgkgDEcNAAsLIAshAiAMQQF0IgxBgARJDQALICRBAXatIRpBgNQAIQNBtMbCgAAhAgNAIANBsPLBgABqIAI1AgAgAkF8ajUCAH4iGCAWfkL/////B4MgF34gGHxCH4inIgQgBCABayIEIARBAEgbrSAafiIYIBZ+Qv////8HgyAXfiAYfEIfiKciBCAEIAFrIgQgBEEASBs2AgAgAkEIaiECIANBBGoiA0GA3ABHDQALQYDkACEDQbTWwoAAIQIDQCADQbDywYAAaiACNQIAIAJBfGo1AgB+IhggFn5C/////weDIBd+IBh8Qh+IpyIEIAQgAWsiBCAEQQBIG60gGn4iGCAWfkL/////B4MgF34gGHxCH4inIgQgBCABayIEIARBAEgbNgIAIAJBCGohAiADQQRqIgNBgOwARw0AC0EAIQIDQCACQbC2woAAaiACQbC+woAAai0AADoAACACQbG2woAAaiACQbG+woAAai0AADoAACACQbK2woAAaiACQbK+woAAai0AADoAACACQbO2woAAaiACQbO+woAAai0AADoAACACQQRqIgJBgAhHDQALQQAhAgNAIAJBsL7CgABqIAJBsMbCgABqLQAAOgAAIAJBsb7CgABqIAJBscbCgABqLQAAOgAAIAJBsr7CgABqIAJBssbCgABqLQAAOgAAIAJBs77CgABqIAJBs8bCgABqLQAAOgAAIAJBBGoiAkGACEcNAAtBACECA0AgAkGwxsKAAGogAkGw1sKAAGotAAA6AAAgAkGxxsKAAGogAkGx1sKAAGotAAA6AAAgAkGyxsKAAGogAkGy1sKAAGotAAA6AAAgAkGzxsKAAGogAkGz1sKAAGotAAA6AAAgAkEEaiICQYAIRw0ACyAVQQJ0IgtBsI7CgABqISRBACECIAtBsP7BgABqIiUhAwNAIAJBsM7CgABqIAMoAgA2AgAgAkGw0sKAAGogA0GAEGooAgA2AgAgAkG0zsKAAGogA0EIaigCADYCACACQbTSwoAAaiADQYgQaigCADYCACACQbjOwoAAaiADQRBqKAIANgIAIAJBuNLCgABqIANBkBBqKAIANgIAIAJBvM7CgABqIANBGGooAgA2AgAgAkG80sKAAGogA0GYEGooAgA2AgAgA0EgaiEDIAJBEGoiAkGABEcNAAtBASEMQYABIQIDQCACQQF2IRUCQCAMRQ0AIAJBAnQhCiAVQQJ0IQhBACEJQbDOwoAAIQcDQCAHIAhqIQ0gCSAMakECdEGwrsKAAGo1AgAhGUEAIQIDQCAHIAJqIgMgDSACaiIENQIAIBl+IhggFn5C/////weDIBd+IBh8Qh+IpyIFIAUgAWsiBSAFQQBIGyIFIAMoAgAiA2oiBiAGIAFrIgYgBkEASBs2AgAgBCADIAVrIgNBH3UgAXEgA2o2AgAgCCACQQRqIgJHDQALIAcgCmohByAJQQFqIgkgDEcNAAsLIBUhAiAMQQF0IgxBgAFJDQALQQEhDEGAASECA0AgAkEBdiEVAkAgDEUNACACQQJ0IQogFUECdCEIQQAhCUGw0sKAACEHA0AgByAIaiENIAkgDGpBAnRBsK7CgABqNQIAIRlBACECA0AgByACaiIDIA0gAmoiBDUCACAZfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciBSAFIAFrIgUgBUEASBsiBSADKAIAIgNqIgYgBiABayIGIAZBAEgbNgIAIAQgAyAFayIDQR91IAFxIANqNgIAIAggAkEEaiICRw0ACyAHIApqIQcgCUEBaiIJIAxHDQALCyAVIQIgDEEBdCIMQYABSQ0AC0EAIQNBACECA0AgAkG0xsKAAGo1AgAhGCACQbDGwoAAajUCACEZIANBsM7CgABqNQIAIRsgAkG0vsKAAGo1AgAhHCALQbiOwoAAaiADQbDSwoAAajUCACAafiIdIBZ+Qv////8HgyAXfiAdfEIfiKciBCAEIAFrIgQgBEEASButIh0gAkGwvsKAAGo1AgB+Ih8gFn5C/////weDIBd+IB98Qh+IpyIEIAQgAWsiBCAEQQBIGzYCACALQbCOwoAAaiAdIBx+IhwgFn5C/////weDIBd+IBx8Qh+IpyIEIAQgAWsiBCAEQQBIGzYCACALQbj+wYAAaiAZIBsgGn4iGyAWfkL/////B4MgF34gG3xCH4inIgQgBCABayIEIARBAEgbrSIbfiIZIBZ+Qv////8HgyAXfiAZfEIfiKciBCAEIAFrIgQgBEEASBs2AgAgC0Gw/sGAAGogGyAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciBCAEIAFrIgQgBEEASBs2AgAgC0EQaiELIANBBGohAyACQQhqIgJBgAhHDQALICVBAkGwtsKAAEEIIAEgIxCTgICAACAkQQJBsLbCgABBCCABICMQk4CAgAACQCAhQQFxRQ0AQbC+woAAQQFBsLbCgABBCCABICMQk4CAgABBsMbCgABBAUGwtsKAAEEIIAEgIxCTgICAAEEAIQEDQCABQbCewoAAaiABQbC+woAAaigCADYCACABQbCmwoAAaiABQbDGwoAAaigCADYCACABQbSewoAAaiABQbS+woAAaigCADYCACABQbSmwoAAaiABQbTGwoAAaigCADYCACABQbiewoAAaiABQbi+woAAaigCADYCACABQbimwoAAaiABQbjGwoAAaigCADYCACABQbyewoAAaiABQby+woAAaigCADYCACABQbymwoAAaiABQbzGwoAAaigCADYCACABQRBqIgFBgAhHDQALC0EBIRVBACEhICJBAXFFDQALQbD+wYAAQQJBAkGABEEBQbCuwoAAEJCAgIAAQQBBgbD//wc2ArCuwoAAQYAsIQEDQCABQbDywYAAaiICIAIoAgAiAiACQf/PAGpB/////wdxIAJB/6eAgHxqQQBIGzYCACABQbTywYAAaiICIAIoAgAiAiACQf/PAGpB/////wdxIAJB/6eAgHxqQQBIGzYCACABQQhqIgFBgDxHDQALQYBwIQEDQCABQbC+woAAakEAIAFBtI7CgABqKAIAIgRBHnZrIgJBAXYiBSABQbCOwoAAaigCAHMgAkEBcWoiA0EfdiAFIARzaiIEQf////8HcSAEQQF0IAJxa7dEAAAAAAAA4EGiIANB/////wdxIANBAXQgAnFrt6A5AwAgAUEIaiIBDQALQYBwIQED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cSADckGAf2pBgX5JDQMgAkGxosKAAGogAzoAACABQQhqIQEgAkECaiICDQALQbC+woAAQbD+wYAAQQlBxdratgFBgbD//wdB/6//zQcQkoCAgABBgHAhAUGxnsKAACECA0AgAUGwjsKAAGogAkF/aiwAACIDQR91QYGw//8HcSADajYCACABQbSOwoAAaiACLAAAIgNBH3VBgbD//wdxIANqNgIAIAJBAmohAiABQQhqIgENAAtBACEBQbCuwoAAIQIDQCACQYBgaiABQbDywYAAaiwAACIDQR91QYGw//8HcSADajYCACACQYBwaiABQbD2wYAAaiwAACIDQR91QYGw//8HcSADajYCACACIAFBsPrBgABqLAAAIgNBH3VBgbD//wdxIANqNgIAIAJBBGohAiABQQFqIgFBgARHDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGwjsKAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGwnsKAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGwrsKAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQQEhCUGABCEBA0AgAUEBdiEKAkAgCUUNACABQQJ0IQwgCkECdCEHQQAhDUGw/sGAACEGA0AgBiAHaiEIIA0gCWpBAnRBsL7CgABqNQIAIRdBACEBA0AgBiABaiICIAggAWoiAzUCACAXfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyIEIARB/8+AgHhqIgQgBEEASBsiBCACKAIAIgJqIgUgBUH/z4CAeGoiBSAFQQBIGzYCACADIAIgBGsiAkEfdUGBsP//B3EgAmo2AgAgByABQQRqIgFHDQALIAYgDGohBiANQQFqIg0gCUcNAAsLIAohASAJQQF0IglBgARJDQALQYBwIQEDQCABQbCOwoAAajUCACABQbCewoAAajUCAH4iFkL/r//NB35C/////weDQoGw//8HfiAWfEIfiKciAiACQf/PgIB4aiICIAJBAEgbIAFBsL7CgABqNQIAIAFBsK7CgABqNQIAfiIWQv+v/80HfkL/////B4NCgbD//wd+IBZ8Qh+IpyICIAJB/8+AgHhqIgIgAkEASBtrIgJBH3VBgbD//wdxIAJqQcyI/pEHRw0DIAFBBGoiAQ0ACw8LICBBAnRBgLyBgABqKAIAIiFBAUEKICBrIid0IihBAXYiKWxBAnQiASABakGw/sGAAGoiAiAgQX9qIipBARCPgICAACAqQQJ0IgNBsLyBgABqKAIAIisgJ3QiLEECdCItQbD+wYAAaiIuIC1qIi8gAiAoIANBgLyBgABqKAIAIjBsQQN0EIaAgIAAGiAvIDAgJ3QiMUECdCIyaiIzIDJqIg1BsP7BgAAgKEECdCI0QXhxICFsEIaAgIAAGiAhIChBAXQiNUEEamwgMUEDdCI2aiAsQQN0IjdqQaz+wYAAaiElIDYgN2oiOCAhQQJ0IgVqQaz+wYAAaiE5IA0gAWohOiArQQEgK0EBSxshOyApQQEgKUEBSxshPCAhQX9qIRVBACEkA0AgJEEMbEGAi4GAAGooAgAiAUEAQQAgAUEBdGsgAUF9bCICIAJBAEgbrSIWIBZ+IhggAUECIAFBAiABQQIgAUECIAFrIgJsayACbCICbGsgAmwiAmxrIAJsIgJsQX5qIAJsQf////8Hca0iFn5C/////weDIAGtIhd+IBh8Qh+IpyICIAIgAWsiAiACQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAiACIAFrIgIgAkEASButIhggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgIgAiABayICIAJBAEgbrSIYIBh+IhggFn5C/////weDIBd+IBh8Qh+IpyICIAIgAWsiAiACQQBIG60iGCAYfiIYIBZ+Qv////8HgyAXfiAYfEIfiKciAiACIAFrIgIgAkEASBsiAkEBcWtxIAJqQQF2IQhBgICAgHggAWshCwJAIBVFDQBBACECQQEhAyAIIQQDQAJAAkAgAyAVcQ0AIAStIRgMAQsgBK0iGCALrX4iGSAWfkL/////B4MgF34gGXxCH4inIgMgAyABayIDIANBAEgbIQsLIBggGH4iGCAWfkL/////B4MgF34gGHxCH4inIgMgAyABayIDIANBAEgbIQRBAiACdCEDIAJBAWohAiADIBVNDQALCyAkQQJ0IgJBsP7BgABqIQYgLiACaiEHIAitIRhBACEjICUhCCA5IQkgDSEMIDohCgNAIAkhAiAhIQRBACEDA0AgA60gGH4iGSAWfkL/////B4MgF34gGXxCH4inIgMgAyABayIDIANBAEgbIAIoAgAiAyADIAFrIgMgA0EASBtqIgMgAyABayIDIANBAEgbIQMgAkF8aiECIARBf2oiBA0AC0EAIQQgBiADIAtBACAMIBVBAnQiImooAgBBHnZrcWsiAkEfdSABcSACajYCACAIIQIgISEDA0AgBK0gGH4iGSAWfkL/////B4MgF34gGXxCH4inIgQgBCABayIEIARBAEgbIAIoAgAiBCAEIAFrIgQgBEEASBtqIgQgBCABayIEIARBAEgbIQQgAkF8aiECIANBf2oiAw0ACyAHIAQgC0EAIAogImooAgBBHnZrcWsiAkEf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ACEPRAAAAAAAAPA/IQ4CQAJAIAlBAUcNAEEAIQEMAQsgDSEBIAohBQNAIA8gDiABQXxqKAIAIARzIAJqIgJB/////wdxIAJBAXQgA3Frt6KgIA5EAAAAAAAA4EGiIg4gASgCACAEcyACQR92aiICQf////8HcSACQQF0IANxa7eioCEPIAJBH3YhAiABQQhqIQEgDkQAAAAAAADgQaIhDiAFQX5qIgUNAAsgCiEBCwJAIAtFDQAgDyAOIAcgAUECdGooAgAgBHMgAmoiAUH/////B3EgAUEBdCADcWu3oqAhDwsgDCAIQQN0aiAPOQMAIA0gOWohDSAHIDlqIQcgCEEBaiIIIChHDQALCyAlICQgMRshCyA3ICcQi4CAgAAgDCAnEIuAgIAAICpBA3QiAUHkvIGAAGooAgBBBmwiBCABQeC8gYAAaigCACIFaiFRIDAgCWshQCA+IAZqIQMgNyEBIDwhAgNAIAEgQ2pEAAAAAAAA8D8gASsDACIOIA6iIAEgBmorAwAiDiAOoqAgASA+aisDACIOIA6iIAEgA2orAwAiDiAOoqCgozkDACABQQhqIQEgAkF/aiICDQALICEgBmogRWpBsP7BgABqIQEgKSECA0AgASABKwMAmjkDACABQQhqIQEgAkEBaiICIChJDQALICEgPmoiAyAGaiBFakGw/sGAAGohASApIQIDQCABIAErAwCaOQMAIAFBCGohASACQQFqIgIgKEkNAAsgLCAiaiAhaiAoQRRsaiBEIClqQQN0IgFqQbD+wYAAaiICICEgKEEYbGogAWpBsP7BgABqIgcgAiAHSxsiJCAGaiElICRBOGohOyAiICFqIENqIAFqQbD+wYAAaiFVIEMgBmohDCAtQbT+wYAAaiFZIChBeHEhLCAoQQdxIVIgQyApQQR0aiEKICEgQ2oiASBFakGw8sGAAGohOiADIEVqQbD+wYAAaiFWICtBH2wiWCAFayAEaiEyIAEgBmogRWoiAUGw/sGAAGohTSABQej+wYAAaiFaICshMQNAQQAgMUEKIDFBCkkbIglrITYCQAJAIAkNAEEAIQICQCBQQQdJDQBBACECIFohAQNAIAFCADcDACABQXhqQgA3AwAgAUFwakIANwMAIAFBaGpCADcDACABQWBqQgA3AwAgAUFYakIANwMAIAFBUGpCADcDACABQUhq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iKciCyALIAxrIgsgC0EASButIhIgEn4iEiATfkL/////B4MgDX4gEnxCH4inIgsgCyAMayILIAtBAEgbrSISIBJ+IhIgE35C/////weDIA1+IBJ8Qh+IpyILIAsgDGsiCyALQQBIG60iEiASfiISIBN+Qv////8HgyANfiASfEIfiKciCyALIAxrIgsgC0EASBsiC0EBcWtxIAtqQQF2rSEUIAAhFSAHIRYDQCAVIApBAnRqIhcoAgAhGCAWIQsgCCEZQQAhGgNAIBqtIBR+IhIgE35C/////weDIA1+IBJ8Qh+IpyIaIBogDGsiGiAaQQBIGyALKAIAIhogGiAMayIaIBpBAEgbaiIaIBogDGsiGiAaQQBIGyEaIAtBfGohCyAZQQFqIhsgGU8hHCAbIRkgHA0AC0EAIRsgGCAaayILQR91IAxxIAtqrSAQfiISIBN+Qv////8HgyANfiASfEIfiKciCyALIAxrIgsgC0EASButIR1CACESAkAgCUUNAEEAIQtBACEbA0AgFSALaiIZIBJC/////w+DIBk1AgB8IAUgC2oiGjUCACAdfnwiEqdB/////wdxNgIAIBlBBGoiGSASQh+IQv////8PgyAZNQIAfCAaQQRqNQIAIB1+fCISp0H/////B3E2AgAgEkIfiCESIAtBCGohCyAOIBtBAmoiG0cNAAsLAkAgD0UNACAVIBtBAnQiC2oiGSASQv////8PgyAZNQIAfCAFIAtqNQIAIB1+fCISp0H/////B3E2AgAgEkIfiCESCyAXIBI+AgAgFiAGaiEWIBUgBmohFSARQQFqIhEgA0cNAAsLQgAhEkEAIQsCQCAJRQ0AIAUhDANAIAwgDDUCACANfiASQv////8Pg3wiEqdB/////wdxNgIAIAxBBGoiGSAZNQIAIA1+IBJCH4hC/////w+DfCISp0H/////B3E2AgAgEkIfiCESIAxBCGohDCAOIAtBAmoiC0cNAAsLAkAgD0UNACAFIAtBAnRqIgwgDDUCACANfiASQv////8Pg3wiEqdB/////wdxNgIAIBJCH4ghEgsgBSAKQQJ0aiASPgIAIAdBBGohByAIQX9qIQggCUEBaiEJIApBAWoiCiABRw0ACwsCQCAERQ0AIANFDQACQCABRQ0AIAJBAnQhBiABQX5xIRYgAUEBcSEXIAFBAnRBfGohGEEAIREDQCAYIQwgASEZQQAhC0EAIRoDQEEAIAUgDGooAgAiG0EBdiAaQR50ciAAIAxqKAIAayIaa0EfdiAaQR91ciALQQFxQX9qcSALciELIAxBfGohDCAbQQFxIRogGUF/aiIZDQALQQAhGkEAIRsCQCABQQFGDQBBACEMQQAhGkEAIRsDQCAAIAxqIhkgGSgCACIcIAUgDGoiFSgCAGsgG2oiG0H/////B3EgHCALQQBIIg4bNgIAIBlBBGoiGSAZKAIAIhkgFUEEaigCAGsgG0EfdWoiG0H/////B3EgGSAOGzYCACAbQR91IRsgDEEIaiEMIBYgGkECaiIaRw0ACwsCQCAXRQ0AIAAgGkECdCIMaiIZIBkoAgAiGSAFIAxqKAIAayAbakH/////B3EgGSALQQBIGzYCAAsgACAGaiEAIBFBAWoiESADRw0ADAILCyADQQdxIQwCQCADQX9qQQdJDQAgA0F4aiIZQQN2QQFqIhpBB3EhCwJAIBlBOEkNACAaQfj///8DcSEZA0AgGUF4aiIZDQALCyALRQ0AA0AgC0F/aiILDQALCyAMRQ0AA0AgDEF/aiIMDQALCwvmBQUBfwF+AX8GfgN/IAAoAgAiCK0iCSAGfiABKAIAIgqtIgsgB358IAI1AgAiDCAKIAenbCAIIAanbGogA2xB/////wdxrSINfnxCH4chDiAJIAR+IAsgBX58IAwgCiAFp2wgCCAEp2xqIANsQf////8Hca0iD358Qh+HIQkgAkEEaiEKQQAhAwNAIAAgA2oiCCAIQQRqNQIAIgsgBH4gCXwgASADaiIIQQRqNQIAIgkgBX58IAogA2o1AgAiDCAPfnwiEKdB/////wdxNgIAIAggCyAGfiAOfCAJIAd+fCAMIA1+fCIOp0H/////B3E2AgAgDkIfhyEOIBBCH4chCSADQQRqIgNBpANHDQALIAAgCT4CpAMgASAOPgKkAyAJQj+IIQlBACEDQQAhCANAIAAgA2oiCkEEaigCACAKKAIAIAhqIAIgA2oiCCgCAGtBH3VqIAhBBGooAgBrIhFBH3UhCCADQQhqIgNBqANHDQALQQAhA0EAIAmnIgprQQF2IRJBACARQX9zQR92IApyayERA0AgACADaiIIIAgoAgAgCiACIANqIhMoAgAgEnMgEXFqayIKQf////8HcTYCACAIQQRqIgggCCgCACAKQR92IBNBBGooAgAgEnMgEXFqayIIQf////8HcTYCACAIQR92IQogA0EIaiIDQagDRw0ACyAOQj+IIQ5BACEDQQAhAANAIAEgA2oiCEEEaigCACAIKAIAIABqIAIgA2oiACgCAGtBH3VqIABBBGooAgBrIhJBH3UhACADQQhqIgNBqANHDQALQQAhA0EAIA6nIghrQQF2IQpBACASQX9zQR92IAhyayESA0AgASADaiIAIAAoAgAgCCACIANqIhEoAgAgCnMgEnFqayIIQf////8HcTYCACAAQQRqIgAgACgCACAIQR92IBFBBGooAgAgCnMgEnFqayIAQf////8HcTYCACAAQR92IQggA0EIaiIDQagDRw0ACwubBwUBfwR+AX8BfgF/QQBBACAEQQF0ayAEQX1sIgYgBkEASButIgcgB34iCCAFrSIHfkL/////B4MgBK0iCX4gCHxCH4inIgUgBSAEayIFIAVBAEgbrSIIIAh+IgggB35C/////weDIAl+IAh8Qh+IpyIFIAUgBGsiBSAFQQBIG60iCCAIfiIIIAd+Qv////8HgyAJfiAIfEIfiKciBSAFIARrIgUgBUEASButIgggCH4iCCAHfkL/////B4MgCX4gCHxCH4inIgUgBSAEayIFIAVBAEgbrSIIIAh+IgggB35C/////weDIAl+IAh8Qh+IpyIFIAUgBGsiBSAFQQBIGyIFQQFxayAEcSAFakEBdq0iCiADrX4iCCAHfkL/////B4MgCX4gCHxCH4inIgMgAyAEayIDIANBAEgbIQMCQCACQQlLDQACQAJAIAJBAXENACACIQUMAQsgA60iCCAIfiIIIAd+Qv////8HgyAJfiAIfEIfiKciAyADIARrIgMgA0EASBshAyACQQFqIQULIAJBCUYNACAFQXZqIQUDQCADrSIIIAh+IgggB35C/////weDIAl+IAh8Qh+IpyIDIAMgBGsiAyADQQBIG60iCCAIfiIIIAd+Qv////8HgyAJfiAIfEIfiKciAyADIARrIgMgA0EASBshAyAFQQJqIgUNAAsLIARBfmohCyADrSEIQR4hA0GAgICAeCAEayIFIQYDQCAGrSIMIAx+IgwgB35C/////weDIAl+IAx8Qh+IpyIGIAYgBGsiBiAGQQBIGyIGrSAIfiIMIAd+Qv//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jAGMA0wATAJMAUwDzADMAswBzAMsACwCLAEsA6wArAKsAawDbABsAmwBbAPsAOwC7AHsAxwAHAIcARwDnACcApwBnANcAFwCXAFcA9wA3ALcAdwDPAA8AjwBPAO8ALwCvAG8A3wAfAJ8AXwD/AD8AvwB/AMCAAICAgECA4IAggKCAYIDQgBCAkIBQgPCAMICwgHCAyIAIgIiASIDogCiAqIBogNiAGICYgFiA+IA4gLiAeIDEgASAhIBEgOSAJICkgGSA1IAUgJSAVID0gDSAtIB0gMyADICMgEyA7IAsgKyAbIDcgByAnIBcgPyAPIC8gHyAwoACgIKAQoDigCKAooBigNKAEoCSgFKA8oAygLKAcoDKgAqAioBKgOqAKoCqgGqA2oAagJqAWoD6gDqAuoB6gMaABoCGgEaA5oAmgKaAZoDWgBaAloBWgPaANoC2gHaAzoAOgI6AToDugC6AroBugN6AHoCegF6A/oA+gL6AfoDBgAGAgYBBgOGAIYChgGGA0YARgJGAUYDxgDGAsYBxgMmACYCJgEmA6YApgKmAaYDZgBmAmYBZgPmAOYC5gHmAxYAFgIWARYDlgCWApYBlgNWAFYCVgFWA9YA1gLWAdYDNgA2AjYBNgO2ALYCtgG2A3YAdgJ2AXYD9gD2AvYB9gMOAA4CDgEOA44AjgKOAY4DTgBOAk4BTgPOAM4CzgHOAy4ALgIuAS4DrgCuAq4BrgNuAG4CbgFuA+4A7gLuAe4DHgAeAh4BHgOeAJ4CngGeA14AXgJeAV4D3gDeAt4B3gM+AD4CPgE+A74AvgK+Ab4DfgB+An4BfgP+AP4C/gH+AwEAAQIBAQEDgQCBAoEBgQNBAEECQQFBA8EAwQLBAcEDIQAhAiEBIQOhAKECoQGhA2EAYQJhAWED4QDhAuEB4QMRABECEQERA5EAkQKRAZEDUQBRAlEBUQPRANEC0QHRAzEAMQIxATEDsQCxArEBsQNxAHECcQFxA/EA8QLxAfEDCQAJAgkBCQOJAIkCiQGJA0kASQJJAUkDyQDJAskByQMpACkCKQEpA6kAqQKpAakDaQBpAmkBaQPpAOkC6QHpAxkAGQIZARkDmQCZApkBmQNZAFkCWQFZA9kA2QLZAdkDOQA5AjkBOQO5ALkCuQG5A3kAeQJ5AXkD+QD5AvkB+QMFAAUCBQEFA4UAhQKFAYUD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");
var PkmiCryptoHandler = class _PkmiCryptoHandler {
  constructor() {
    this.keyset = null;
    this.ed25519 = null;
    this.falcon512 = null;
    this.addressBech32m = null;
    this.addressUint8 = null;
    this.initialized = false;
  }
  async init() {
    if (this.initialized) return;
    this.ed25519 = await this._instantiateWasm(ed25519_default2);
    this.falcon512 = await this._instantiateWasm(falcon512_default2);
    this.initialized = true;
  }
  static validateKeysetArray(array) {
    if (!Array.isArray(array)) throw new Error("Keyset must be an array");
    const [edSk, edPk] = array[0] || [];
    if (!Array.isArray(array[0]) || array[0].length !== 2)
      throw new Error("ed25519 keyset must be [sk, pk]");
    if (!Array.isArray(edSk) || edSk.some((n) => typeof n !== "number"))
      throw new Error("ed25519 secret key must be numbers");
    if (!Array.isArray(edPk) || edPk.some((n) => typeof n !== "number"))
      throw new Error("ed25519 public key must be numbers");
    const [falconSk, falconPk] = array[1] || [];
    if (!Array.isArray(array[1]) || array[1].length !== 2)
      throw new Error("falcon512 keyset must be [sk, pk]");
    if (!Array.isArray(falconSk) || falconSk.some((n) => typeof n !== "number"))
      throw new Error("falcon512 secret key must be numbers");
    if (!Array.isArray(falconPk) || falconPk.some((n) => typeof n !== "number"))
      throw new Error("falcon512 public key must be numbers");
  }
  static async generateAddress(keyset) {
    if (!keyset?.ed25519?.pk || !keyset?.falcon512?.pk) {
      throw new Error("Keyset must include ed25519 and falcon512 public keys");
    }
    const blake3 = await createBLAKE32();
    blake3.init();
    blake3.update(keyset.ed25519.pk);
    blake3.update(keyset.falcon512.pk);
    const addressHash = blake3.digest("binary");
    return {
      addressBech32m: encode2(ADDRESS_HRP3, addressHash),
      addressUint8: addressHash
    };
  }
  async loadKeysetFromObject(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error('Invalid key file: expected an object with a "keyset" field');
    }
    const { keyset, address: providedBech32, addressHex: providedHexRaw } = input;
    _PkmiCryptoHandler.validateKeysetArray(keyset);
    const [ed25519Sk, ed25519Pk] = keyset[0];
    const [falconSk, falconPk] = keyset[1];
    const parsed = {
      ed25519: {
        sk: Uint8Array.from(ed25519Sk),
        pk: Uint8Array.from(ed25519Pk)
      },
      falcon512: {
        sk: Uint8Array.from(falconSk),
        pk: Uint8Array.from(falconPk)
      }
    };
    const address = await _PkmiCryptoHandler.generateAddress(parsed);
    const providedHex = typeof providedHexRaw === "string" ? providedHexRaw.toLowerCase() : void 0;
    if (providedBech32 && providedBech32.toLowerCase() !== address.addressBech32m.toLowerCase()) {
      throw new Error("Provided bech32m address does not match derived address from keys");
    }
    if (providedHex) {
      const derivedHex = Array.from(address.addressUint8).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (providedHex !== derivedHex) {
        throw new Error("Provided addressHex does not match derived address from keys");
      }
    }
    this.addressBech32m = address.addressBech32m;
    this.addressUint8 = address.addressUint8;
    this.keyset = { ...parsed, ...address };
    return this.keyset;
  }
  pubset() {
    if (!this.keyset) {
      throw new Error("Keyset not loaded. Cannot generate public key set.");
    }
    const encoder = new MsctpEncoder();
    encoder.addUleb128(0n);
    encoder.addVector(this.keyset.ed25519.pk);
    encoder.addUleb128(1n);
    encoder.addVector(this.keyset.falcon512.pk);
    return encoder.build();
  }
  get address() {
    if (!this.addressUint8)
      throw new Error("Keyset must be loaded first");
    return {
      bech32m: this.addressBech32m,
      raw: this.addressUint8
    };
  }
  async _instantiateWasm(wasmBytes) {
    const { importObject, bindInstance, utils } = createShim2();
    const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
    bindInstance(instance);
    return { instance, ...utils };
  }
  async signWith(signer, sk, message) {
    const { sign, sk_bytes, signature_bytes } = signer.instance.exports;
    if (sk_bytes() !== sk.length) throw new Error("Invalid secret key");
    const skPtr = signer.copyToWasm(sk);
    const msgPtr = signer.copyToWasm(message);
    const sigBytes = signature_bytes();
    const sigPtr = signer.malloc(sigBytes);
    const length = sign(sigPtr, msgPtr, message.length, skPtr);
    if (length < 0) throw new Error("Signing failed in WASM module");
    const signature = signer.readFromWasm(sigPtr, length);
    signer.reset();
    return signature;
  }
  async signMessage(message) {
    if (!this.initialized) throw new Error("Handler not initialized. Call init() first.");
    if (!this.keyset) throw new Error("Keyset not loaded.");
    const edSig = await this.signWith(this.ed25519, this.keyset.ed25519.sk, message);
    const falSig = await this.signWith(this.falcon512, this.keyset.falcon512.sk, message);
    return {
      ed25519: edSig,
      falcon512: falSig
    };
  }
  async verifyWith(verifier, pk, signature, message) {
    const { verify, pk_bytes, signature_bytes } = verifier.instance.exports;
    if (pk_bytes() !== pk.length) {
      throw new Error("Invalid public key");
    }
    const pkPtr = verifier.copyToWasm(pk);
    const sigPtr = verifier.copyToWasm(signature);
    const msgPtr = verifier.copyToWasm(message);
    const result = verify(sigPtr, signature.length, msgPtr, message.length, pkPtr);
    verifier.reset();
    if (result === 0) {
      return true;
    } else {
      return false;
    }
  }
  async verifyMessage(message, signatures) {
    if (!this.initialized) throw new Error("Handler not initialized. Call init() first.");
    if (!this.keyset) throw new Error("Keyset not loaded.");
    const edPk = this.keyset.ed25519.pk;
    const falPk = this.keyset.falcon512.pk;
    const edResult = await this.verifyWith(this.ed25519, edPk, signatures.ed25519, message);
    const falResult = await this.verifyWith(this.falcon512, falPk, signatures.falcon512, message);
    return {
      ed25519: edResult,
      falcon512: falResult
    };
  }
};
function hexToBytes2(hex) {
  if (typeof hex !== "string") {
    throw new TypeError("hexToBytes: expected string, got " + typeof hex);
  }
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const j = i * 2;
    bytes[i] = parseInt(hex.slice(j, j + 2), 16);
  }
  return bytes;
}
function bytesToHex(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}
function compareByteArrays(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}
function decodeAddress(addressStr) {
  if (addressStr.startsWith("lea1")) {
    return decode("lea", addressStr);
  }
  return hexToBytes2(addressStr);
}
function _resolveConstants(obj, constants) {
  if (obj instanceof Uint8Array) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => _resolveConstants(item, constants));
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === "signers") {
        newObj[key] = val;
      } else {
        newObj[key] = _resolveConstants(val, constants);
      }
    }
    return newObj;
  }
  if (typeof obj === "string") {
    return obj.replace(/\$const\(([^)]+)\)/g, (match, key) => {
      if (constants[key] === void 0) throw new Error(`Constant '${key}' not found.`);
      return _resolveConstants(constants[key], constants);
    });
  }
  return obj;
}
function _buildAliasMap(signers, constants) {
  const aliasMap = /* @__PURE__ */ new Map();
  if (signers) {
    for (const [name, signer] of Object.entries(signers)) {
      aliasMap.set(name, signer.address.bech32m);
    }
  }
  if (constants) {
    for (const [name, value] of Object.entries(constants)) {
      aliasMap.set(name, value);
    }
  }
  return aliasMap;
}
function _collectLiteralAddressStrings(obj, aliasMap, addressSet) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => _collectLiteralAddressStrings(item, aliasMap, addressSet));
    return;
  }
  if (typeof obj === "object" && obj !== null) {
    for (const val of Object.values(obj)) {
      _collectLiteralAddressStrings(val, aliasMap, addressSet);
    }
    return;
  }
  if (typeof obj === "string") {
    const addrMatch = obj.match(/^\$addr\((.+)\)$/);
    if (addrMatch) {
      const key = addrMatch[1];
      const literalAddress = aliasMap.get(key) || key;
      addressSet.add(literalAddress);
    }
  }
}
function _createCanonicalAddressListAndIndexMap(literalAddressSet, constResolvedManifest, originalSigners) {
  const feePayerAlias = constResolvedManifest.feePayer;
  const hasSigners = Object.keys(originalSigners).length > 0;
  if (!hasSigners) {
    const nonSignerLiterals2 = [...literalAddressSet];
    const nonSignerBytes2 = nonSignerLiterals2.map(decodeAddress).sort(compareByteArrays);
    const literalAddressIndexMap2 = /* @__PURE__ */ new Map();
    const addressMapByHex2 = new Map(nonSignerBytes2.map((bytes, i) => [bytesToHex(bytes), i]));
    for (const literalAddress of literalAddressSet) {
      const hex = bytesToHex(decodeAddress(literalAddress));
      const index = addressMapByHex2.get(hex);
      if (index !== void 0) {
        literalAddressIndexMap2.set(literalAddress, index);
      }
    }
    return { finalAddressList: nonSignerBytes2, literalAddressIndexMap: literalAddressIndexMap2 };
  }
  if (!feePayerAlias) throw new Error("Signed manifest must have a 'feePayer' field.");
  const feePayerSigner = originalSigners[feePayerAlias];
  if (!feePayerSigner) throw new Error(`Fee payer '${feePayerAlias}' not found in signers object.`);
  const feePayerLiteralAddress = feePayerSigner.address.bech32m;
  const feePayerBytes = feePayerSigner.address.raw;
  const signerLiteralAddresses = new Set(Object.values(originalSigners).map((s) => s.address.bech32m));
  const otherSignerLiterals = [...signerLiteralAddresses].filter((addr) => addr !== feePayerLiteralAddress);
  const otherSignerBytes = otherSignerLiterals.map(decodeAddress).sort(compareByteArrays);
  const nonSignerLiterals = [...literalAddressSet].filter((addr) => !signerLiteralAddresses.has(addr));
  const nonSignerBytes = nonSignerLiterals.map(decodeAddress).sort(compareByteArrays);
  const finalAddressListBytes = [feePayerBytes, ...otherSignerBytes, ...nonSignerBytes];
  const literalAddressIndexMap = /* @__PURE__ */ new Map();
  const addressMapByHex = new Map(finalAddressListBytes.map((bytes, i) => [bytesToHex(bytes), i]));
  const allKnownLiterals = /* @__PURE__ */ new Set([...literalAddressSet, ...signerLiteralAddresses]);
  for (const literalAddress of allKnownLiterals) {
    const hex = bytesToHex(decodeAddress(literalAddress));
    const index = addressMapByHex.get(hex);
    if (index !== void 0) {
      literalAddressIndexMap.set(literalAddress, index);
    }
  }
  return { finalAddressList: finalAddressListBytes, literalAddressIndexMap };
}
function _resolveToIndices(obj, aliasMap, literalAddressIndexMap) {
  if (obj instanceof Uint8Array) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => _resolveToIndices(item, aliasMap, literalAddressIndexMap));
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
      newObj[key] = _resolveToIndices(val, aliasMap, literalAddressIndexMap);
    }
    return newObj;
  }
  if (typeof obj === "string") {
    const addrMatch = obj.match(/^\$addr\((.+)\)$/);
    if (addrMatch) {
      const key = addrMatch[1];
      const literalAddress = aliasMap.get(key) || key;
      const index = literalAddressIndexMap.get(literalAddress);
      if (index === void 0) {
        throw new Error(`Logic error: Could not find final index for address: ${literalAddress}`);
      }
      return index;
    }
  }
  return obj;
}
var PUBSET_REGEX = /^\$pubset\(([^)]+)\)$/;
async function _resolvePubsets(obj, signers) {
  if (obj instanceof Uint8Array) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return await Promise.all(obj.map((item) => _resolvePubsets(item, signers)));
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
      newObj[key] = await _resolvePubsets(val, signers);
    }
    return newObj;
  }
  if (typeof obj === "string") {
    const pubsetMatch = obj.match(PUBSET_REGEX);
    if (pubsetMatch) {
      const signerName = pubsetMatch[1];
      const signer = signers[signerName];
      if (!signer) {
        throw new Error(`Signer '${signerName}' referenced in $pubset not found.`);
      }
      return await signer.pubset();
    }
  }
  return obj;
}
async function resolveManifest(input) {
  const { pod, constants = {}, signers = {}, ...template } = input;
  const podBytes = pod ? decodeAddress(pod) : new Uint8Array(32).fill(17);
  if (podBytes.length !== 32) {
    throw new Error(`Pod must be a 32-byte address, but got ${podBytes.length} bytes.`);
  }
  const constResolvedManifest = _resolveConstants(template, constants);
  const pubsetResolvedManifest = await _resolvePubsets(constResolvedManifest, signers);
  const aliasMap = _buildAliasMap(signers, constants);
  const literalAddressSet = /* @__PURE__ */ new Set();
  _collectLiteralAddressStrings(pubsetResolvedManifest, aliasMap, literalAddressSet);
  const { finalAddressList, literalAddressIndexMap } = _createCanonicalAddressListAndIndexMap(
    literalAddressSet,
    pubsetResolvedManifest,
    signers
  );
  const resolvedBody = _resolveToIndices(pubsetResolvedManifest, aliasMap, literalAddressIndexMap);
  const resolvedManifest = {
    pod: podBytes,
    version: template.version,
    sequence: template.sequence,
    gasLimit: template.gasLimit,
    gasPrice: template.gasPrice,
    invocations: resolvedBody.invocations,
    signers,
    addresses: finalAddressList,
    // Expose maps for tooling
    _maps: {
      alias: aliasMap,
      literal: literalAddressIndexMap
    }
  };
  if (Object.keys(signers).length > 0) {
    resolvedManifest.feePayer = 0;
  }
  return resolvedManifest;
}
var checkBigInt = (val) => {
  try {
    return BigInt(val);
  } catch (e) {
    throw new Error(`Cannot convert value '${val}' to BigInt.`);
  }
};
var hexToBytes22 = (hex) => {
  if (typeof hex !== "string") throw new Error("Input must be a string");
  if (hex.length % 2 !== 0) throw new Error("Hex string must have an even number of characters");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};
function encodeInstructions(instructions) {
  const instructionEncoder = new MsctpEncoder();
  for (const instruction of instructions) {
    const keys = Object.keys(instruction).filter((k) => k !== "comment");
    if (keys.length !== 1) throw new Error(`Each instruction must have exactly one operational key. Found: ${keys.join(", ")}`);
    const key = keys[0];
    const value = instruction[key];
    switch (key) {
      case "vector":
        if (typeof value === "string") instructionEncoder.addVector(hexToBytes22(value));
        else if (value instanceof Uint8Array) instructionEncoder.addVector(value);
        else throw new Error(`Invalid type for 'vector': expected Uint8Array or hex string`);
        break;
      case "uleb":
      case "uleb128":
        instructionEncoder.addUleb128(checkBigInt(value));
        break;
      case "sleb":
      case "sleb128":
        instructionEncoder.addSleb128(checkBigInt(value));
        break;
      case "INLINE":
        if (!(value instanceof Uint8Array)) throw new Error(`Invalid type for 'INLINE': expected Uint8Array`);
        instructionEncoder.chunks.push(value);
        break;
      default:
        throw new Error(`Unsupported instruction type: ${key}. MSCTP only supports uleb128, sleb128, vector, and INLINE.`);
    }
  }
  return instructionEncoder.build();
}
function encodePreSignaturePayload(encoder, resolvedManifest) {
  const finalAddressList = resolvedManifest.addresses;
  encoder.addUleb128(1n);
  encoder.addUleb128(BigInt(resolvedManifest.sequence));
  const addressVector = new Uint8Array(finalAddressList.reduce((acc, val) => acc + val.length, 0));
  let offset = 0;
  for (const addr of finalAddressList) {
    addressVector.set(addr, offset);
    offset += addr.length;
  }
  encoder.addVector(addressVector);
  encoder.addUleb128(BigInt(resolvedManifest.gasLimit));
  encoder.addUleb128(BigInt(resolvedManifest.gasPrice));
  for (const invocation of resolvedManifest.invocations) {
    encoder.addUleb128(BigInt(invocation.targetAddress));
    const instructionsBytes = encodeInstructions(invocation.instructions);
    encoder.addVector(instructionsBytes);
  }
}
function appendSignatures(encoder, signatures) {
  for (const sig of signatures) {
    encoder.addVector(sig.ed25519);
    encoder.addVector(sig.falcon512);
  }
}
function bytesToHex2(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}
var SCHEMA_REGEX = /^(uleb|sleb|vector)\((\d+)\)$/;
async function parseResultSchema(manifest) {
  if (!manifest.resultSchema) {
    return /* @__PURE__ */ new Map();
  }
  const fakeManifestForResolving = {
    constants: manifest.constants,
    invocations: Object.keys(manifest.resultSchema).map((programId) => ({
      targetAddress: programId,
      instructions: []
    }))
  };
  const resolved = await resolveManifest(fakeManifestForResolving);
  const parsedSchema = /* @__PURE__ */ new Map();
  for (const programIdKey in manifest.resultSchema) {
    const match = programIdKey.match(/\(([^)]+)\)/);
    const alias = match ? match[1] : programIdKey;
    let literalAddress = resolved._maps.alias.get(alias) || alias;
    const literalMatch = literalAddress.match(/\(([^)]+)\)/);
    if (literalMatch) {
      literalAddress = literalMatch[1];
    }
    const addressIndex = resolved._maps.literal.get(literalAddress);
    if (addressIndex === void 0) {
      console.warn(`[WARN] Could not resolve address for schema key: ${programIdKey}`);
      continue;
    }
    const programIdHex = bytesToHex2(resolved.addresses[addressIndex]);
    const fieldMap = /* @__PURE__ */ new Map();
    const schemaFields = manifest.resultSchema[programIdKey];
    for (const fieldName in schemaFields) {
      const schemaValue = schemaFields[fieldName];
      const match2 = schemaValue.match(SCHEMA_REGEX);
      if (!match2) {
        throw new Error(`[ERROR] Invalid resultSchema format for field '${fieldName}': "${schemaValue}". Expected "type(key)".`);
      }
      const type = match2[1];
      const key = parseInt(match2[2], 10);
      fieldMap.set(key, { name: fieldName, type });
    }
    parsedSchema.set(programIdHex, fieldMap);
  }
  return parsedSchema;
}
async function decodeExecutionResult(resultBuffer, manifest) {
  const schema = await parseResultSchema(manifest);
  if (schema.size === 0 && resultBuffer.length > 0) {
    console.warn("[WARN] No resultSchema found in manifest. Returning raw decoded data.");
  }
  const decoder = new MsctpDecoder(resultBuffer);
  const results = /* @__PURE__ */ new Map();
  while (decoder.hasNext()) {
    const programId = decoder.readVector();
    const programIdHex = bytesToHex2(programId);
    const entryCount = Number(decoder.readUleb128());
    const programSchema = schema.get(programIdHex);
    const decodedObject = {};
    for (let i = 0; i < entryCount; i++) {
      const key = Number(decoder.readUleb128());
      const typeId = decoder.peekType();
      let value;
      let fieldName = `key_${key}`;
      let type = "unknown";
      if (programSchema && programSchema.has(key)) {
        const schemaEntry = programSchema.get(key);
        fieldName = schemaEntry.name;
        type = schemaEntry.type;
      }
      if (typeId === MSCTP_TT_ULEB128) {
        if (type !== "uleb" && programSchema) {
          console.warn(`[WARN] Type mismatch for ${fieldName}: schema says '${type}', but found 'uleb'.`);
        }
        value = decoder.readUleb128();
      } else if (typeId === MSCTP_TT_SLEB128) {
        if (type !== "sleb" && programSchema) {
          console.warn(`[WARN] Type mismatch for ${fieldName}: schema says '${type}', but found 'sleb'.`);
        }
        value = decoder.readSleb128();
      } else if (typeId === MSCTP_TT_SMALL_VECTOR || typeId === MSCTP_TT_LARGE_VECTOR) {
        if (type !== "vector" && programSchema) {
          console.warn(`[WARN] Type mismatch for ${fieldName}: schema says '${type}', but found 'vector'.`);
        }
        value = decoder.readVector();
      } else {
        throw new Error(`[ERROR] Unsupported MSCTP type ID ${typeId} in result stream.`);
      }
      decodedObject[fieldName] = value;
    }
    results.set(programIdHex, decodedObject);
  }
  return results;
}
var DOMAIN_TX_LINK_V1 = new Uint8Array([
  84,
  88,
  45,
  76,
  73,
  78,
  75,
  45,
  86,
  49,
  // "TX-LINK-V1"
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // padding
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // padding
  0,
  0
]);
async function computeTxLinkHash(oldHash, newHash) {
  if (!(oldHash instanceof Uint8Array) || oldHash.length !== 32) {
    throw new Error("oldHash must be a 32-byte Uint8Array");
  }
  if (!(newHash instanceof Uint8Array) || newHash.length !== 32) {
    throw new Error("newHash must be a 32-byte Uint8Array");
  }
  const blake3 = await createBLAKE32();
  blake3.init();
  blake3.update(DOMAIN_TX_LINK_V1);
  blake3.update(oldHash);
  blake3.update(newHash);
  return blake3.digest("binary");
}
function toHexString(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function createTransaction(manifest, signerKeys, options = {}) {
  const addressToHandlerMap = /* @__PURE__ */ new Map();
  manifest.signers = {};
  for (const signerName in signerKeys) {
    const handler = new PkmiCryptoHandler();
    await handler.init();
    await handler.loadKeysetFromObject(signerKeys[signerName]);
    const address = handler.address.raw;
    addressToHandlerMap.set(address.toString("hex"), handler);
    manifest.signers[signerName] = handler;
  }
  const resolvedManifest = await resolveManifest(manifest);
  const { pod, addresses: finalAddressList } = resolvedManifest;
  const sctpEncoder = new MsctpEncoder();
  encodePreSignaturePayload(sctpEncoder, resolvedManifest);
  const preSigPayloadBytes = sctpEncoder.build();
  const hasher = await createBLAKE32();
  hasher.init();
  hasher.update(pod);
  hasher.update(preSigPayloadBytes);
  const txHash = hasher.digest("binary");
  const txId = toHexString(txHash);
  console.log(`[INFO] Base Transaction Hash: ${txId}`);
  let messageToSign = txHash;
  let linkId = null;
  const hasPrevOption = options && Object.prototype.hasOwnProperty.call(options, "prevTxHash");
  const prev = hasPrevOption ? options.prevTxHash : void 0;
  if (prev !== void 0) {
    if (!(prev instanceof Uint8Array) || prev.length !== 32) {
      throw new Error("options.prevTxHash must be a 32-byte Uint8Array");
    }
    const prevHex = toHexString(prev);
    if (!isAllZero(prev)) {
      console.log(`[INFO] prevTxHash provided (used for chaining): ${prevHex}`);
      const linkHash = await computeTxLinkHash(prev, txHash);
      linkId = toHexString(linkHash);
      console.log(`[INFO] Link Hash (for signing): ${linkId}`);
      messageToSign = linkHash;
    } else {
      console.warn(`[WARN] prevTxHash provided but all zeros (${prevHex}); skipping chaining and signing base tx hash.`);
    }
  } else {
    console.log("[INFO] No prevTxHash provided; signing base tx hash.");
  }
  const signatures = [];
  const signerCount = finalAddressList.length - (finalAddressList.length - Object.keys(manifest.signers).length);
  for (let i = 0; i < signerCount; i++) {
    const signerAddress = finalAddressList[i];
    const handler = addressToHandlerMap.get(signerAddress.toString("hex"));
    if (!handler) {
      throw new Error(`[ERROR] Logic error: Could not find a handler for signing address: ${signerAddress.toString("hex")}`);
    }
    const signaturePair = await handler.signMessage(messageToSign);
    signatures.push(signaturePair);
  }
  appendSignatures(sctpEncoder, signatures);
  const finalSctpPayload = sctpEncoder.build();
  const tx = new Uint8Array(pod.length + finalSctpPayload.length);
  tx.set(pod, 0);
  tx.set(finalSctpPayload, pod.length);
  return { tx, txId, linkId };
}
function isAllZero(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) return false;
  }
  return true;
}

// manifests/sign_timestamp.json
var sign_timestamp_default = {
  comment: "This LTM simply acts as a wrapper for our internal server authentication.",
  sequence: 1,
  feePayer: "publisher",
  gasLimit: 0,
  gasPrice: 0,
  signers: [],
  constants: {
    timestamp: "1"
  },
  invocations: [
    {
      targetAddress: "$addr(publisher)",
      instructions: [
        {
          comment: "Timestamp",
          uleb: "$const(timestamp)"
        },
        {
          INLINE: "$pubset(publisher)"
        }
      ]
    }
  ]
};

// src/utils.js
function areUint8ArraysEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length || !(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function combineUint8Arrays(arrays) {
  return new Uint8Array(arrays.reduce((acc, val) => (acc.push(...val), acc), []));
}
function uint8ArrayToBase64(uint8Array) {
  let binary = "";
  const len = uint8Array.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// src/wallet.js
var WalletImpl = class {
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
    if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
      throw new Error("Account index must be a non-negative integer.");
    }
    const { keyset, address } = await this.deriveAccount(index);
    return {
      keyset,
      address
    };
  }
  async signTimestamp(signTimestamp, accountIndex = 0) {
    console.log("signTimestamp:", signTimestamp);
    const account = await this.getAccount(accountIndex);
    const signers = { publisher: account };
    sign_timestamp_default.constants.timestamp = String(signTimestamp);
    const tx = await createTransaction(sign_timestamp_default, signers);
    return uint8ArrayToBase64(tx);
  }
};
var Wallet = {
  /**
   * Creates a wallet from a BIP-39 mnemonic phrase.
   * @param {string} mnemonic - The seed phrase.
   * @param {string} [passphrase] - Optional BIP-39 passphrase.
   */
  fromMnemonic: async (mnemonic, passphrase) => {
    const seed = await mnemonicToSeed(mnemonic, passphrase);
    const masterKey = await HDKey.fromMasterSeed(seed);
    return new WalletImpl(masterKey);
  }
};

// src/connection.js
var ConnectionImpl = class {
  constructor(cluster = "devnet") {
    this.url = this._resolveClusterUrl(cluster);
  }
  _resolveClusterUrl(cluster) {
    if (typeof cluster === "string" && /^https?:\/\//i.test(cluster)) return cluster;
    const clusterUrls = {
      "mainnet-beta": "https://api.mainnet-beta.getlea.org",
      devnet: "https://api.devnet.getlea.org",
      testnet: "https://api.testnet.getlea.org",
      local: "http://127.0.0.1:60000",
      localhost: "http://localhost:60000"
    };
    if (!clusterUrls[cluster]) throw new Error(`Unknown cluster: ${cluster}`);
    return clusterUrls[cluster];
  }
  /**
   * Sends a transaction and returns a result object:
   * {
   *   ok: boolean,               // response.ok
   *   status: number,            // HTTP status
   *   decoded: any | null,       // decoded body (if any and decode succeeded)
   *   raw: Uint8Array,           // raw body (possibly length 0)
   *   decodeError: Error | null, // error thrown during decode (if any)
   *   responseHeaders: Headers   // fetch Headers instance
   * }
   *
   * - Network failures still throw (so you can distinguish transport vs. server error).
   * - Server errors (non-2xx) return ok:false but still try to decode.
   */
  async sendTransaction(txObject) {
    const { tx: { tx, txId }, decode: decode2 } = txObject;
    if (!(tx instanceof Uint8Array)) {
      throw new Error("sendTransaction expects tx to be a Uint8Array");
    }
    if (typeof decode2 !== "function") {
      throw new Error("sendTransaction expects a decode(resultBuffer) function");
    }
    const response = await fetch(`${this.url}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Connection": "close"
      },
      body: tx
    });
    const arrayBuffer = await response.arrayBuffer();
    const raw = new Uint8Array(arrayBuffer);
    let decoded = null;
    let decodeError = null;
    if (raw.length > 0) {
      try {
        decoded = await decode2(raw);
      } catch (e) {
        decodeError = e instanceof Error ? e : new Error(String(e));
      }
    }
    return {
      ok: response.ok,
      status: response.status,
      decoded,
      raw,
      decodeError,
      responseHeaders: response.headers,
      txId,
      executionStatus: Number(response.headers.get("x-execution-status") ?? void 0),
      abortCode: Number(response.headers.get("x-abort-code") ?? void 0)
    };
  }
};
var Connection = (cluster = "devnet") => new ConnectionImpl(cluster);

// manifests/transfer.json
var transfer_default = {
  comment: "transfers lea coins from 1 to another account",
  sequence: 1,
  feePayer: "publisher",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    receiver: "$addr(0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef)",
    amount: "4000"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "lea transfer tokens ",
          uleb: 4
        },
        {
          comment: "sender account",
          uleb: "$addr(publisher)"
        },
        {
          comment: "receiver account",
          uleb: "$const(receiver)"
        },
        {
          comment: "amount",
          uleb: "$const(amount)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)",
      sender: "vector(1)",
      receiver: "vector(2)",
      amount: "uleb(3)",
      newSenderBalance: "uleb(4)",
      newReceiverBalance: "uleb(5)"
    }
  }
};

// manifests/mint.json
var mint_default = {
  comment: "Mints new LEA coins to a specified account.",
  sequence: 1,
  feePayer: "minter",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    recipient: "$addr(0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef)",
    amount: "10000"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "Mint LEA Coins",
          uleb: 2
        },
        {
          comment: "Delegate mint authority",
          uleb: "$addr(minter)"
        },
        {
          comment: "Recipient account",
          uleb: "$const(recipient)"
        },
        {
          comment: "Amount to mint",
          uleb: "$const(amount)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)",
      mintAmount: "uleb(1)",
      receiver: "vector(2)",
      newReceiverBalance: "uleb(3)"
    }
  }
};

// manifests/burn.json
var burn_default = {
  comment: "Burns a specified amount of LEA coins from the owner's account.",
  sequence: 1,
  feePayer: "burner",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    owner: "$addr(burner)",
    amount: "500"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "Burn LEA tokens",
          uleb: 3
        },
        {
          comment: "Owner account",
          uleb: "$const(owner)"
        },
        {
          comment: "Amount to burn",
          uleb: "$const(amount)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)"
    }
  }
};

// manifests/publish_keyset.json
var publish_keyset_default = {
  comment: "Publishes the public keys of the feePayer to the contract.",
  sequence: 1,
  feePayer: "publisher",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          uleb: 1
        },
        {
          INLINE: "$pubset(publisher)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)"
    }
  }
};

// manifests/mint_whitelist.json
var mint_whitelist_default = {
  comment: "Mint Whitelist Transaction",
  sequence: 1,
  feePayer: "authority",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    whitelistAddress: "$addr(lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d)",
    amount: "1000"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          uleb: 5
        },
        {
          uleb: "$addr(authority)"
        },
        {
          uleb: "$const(whitelistAddress)"
        },
        {
          uleb: "$const(amount)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)"
    }
  }
};

// manifests/get_allowed_mint.json
var get_allowed_mint_default = {
  comment: "Retrieves the allowed minting amount for a specific account.",
  sequence: 1,
  feePayer: "",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    address: "$addr(lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d)"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "get allowed minting amount",
          uleb: 7
        },
        {
          comment: "account ot get the allowed mint for",
          uleb: "$const(address)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)",
      allowedMint: "uleb(0)"
    }
  }
};

// manifests/get_balance.json
var get_balance_default = {
  comment: "Read lea account balance",
  sequence: 1,
  feePayer: "",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    address: "$addr(lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d)"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "get lea account balance",
          uleb: 8
        },
        {
          comment: "address to get the allowed mint for",
          uleb: "$const(address)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)",
      balance: "uleb(0)"
    }
  }
};

// manifests/get_current_supply.json
var get_current_supply_default = {
  comment: "Retrieves the current total supply of LEA coins.",
  sequence: 1,
  feePayer: "",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "Get current LEA supply",
          uleb: 6
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)",
      currentSupply: "uleb(0)"
    }
  }
};

// manifests/get_last_tx_hash.json
var get_last_tx_hash_default = {
  comment: "Reads the last signed transaction hash for a given address",
  sequence: 1,
  feePayer: "",
  gasLimit: 5e8,
  gasPrice: 0,
  signers: [],
  constants: {
    contractAddress: "$addr(1111111111111111111111111111111111111111111111111111111111111111)",
    address: "$addr(lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d)"
  },
  invocations: [
    {
      targetAddress: "$const(contractAddress)",
      instructions: [
        {
          comment: "get lea account last tx hash",
          uleb: 9
        },
        {
          comment: "address to get the last tx hash for",
          uleb: "$const(address)"
        }
      ]
    }
  ],
  resultSchema: {
    "$const(contractAddress)": {
      command: "uleb(127)",
      lastTxHash: "vector(0)"
    }
  }
};

// src/system-program.js
var clone = (x) => typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x));
var withConstants = (manifest, constants) => {
  const m = clone(manifest);
  m.constants = { ...m.constants || {}, ...constants };
  return m;
};
async function buildTxAndDecoder(baseManifest, constants = {}, signers = {}, options = {}) {
  const manifestUsed = Object.keys(constants).length ? withConstants(baseManifest, constants) : clone(baseManifest);
  const tx = await createTransaction(manifestUsed, signers, options);
  const decode2 = async (resultBuffer) => {
    return decodeExecutionResult(resultBuffer, manifestUsed);
  };
  return { tx, decode: decode2 };
}
var SystemProgram = {
  transfer: async (fromKeyset, toAddress, amount, options = {}) => {
    const signers = { publisher: fromKeyset };
    const constants = { receiver: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(transfer_default, constants, signers, options);
  },
  mint: async (fromKeyset, toAddress, amount, options = {}) => {
    const signers = { minter: fromKeyset };
    const constants = { recipient: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(mint_default, constants, signers, options);
  },
  burn: async (fromKeyset, amount, options = {}) => {
    const signers = { burner: fromKeyset };
    const constants = { amount: String(amount) };
    return buildTxAndDecoder(burn_default, constants, signers, options);
  },
  publishKeyset: async (fromKeyset, options = {}) => {
    const signers = { publisher: fromKeyset };
    return buildTxAndDecoder(publish_keyset_default, {}, signers, options);
  },
  mintWhitelist: async (fromKeyset, toAddress, amount, options = {}) => {
    const signers = { authority: fromKeyset };
    const constants = { whitelistAddress: `$addr(${toAddress})`, amount: String(amount) };
    return buildTxAndDecoder(mint_whitelist_default, constants, signers, options);
  },
  getAllowedMint: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(get_allowed_mint_default, constants, {});
  },
  getBalance: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(get_balance_default, constants, {});
  },
  getLastTxHash: async (toAddress) => {
    const constants = { address: `$addr(${toAddress})` };
    return buildTxAndDecoder(get_last_tx_hash_default, constants, {});
  },
  getCurrentSupply: async () => {
    return buildTxAndDecoder(get_current_supply_default, {}, {});
  }
};

// src/base-pod.js
var BASE_POD_HEX = "1111111111111111111111111111111111111111111111111111111111111111";
function normalizeAddress(addr, ctx) {
  if (typeof addr === "string") return addr;
  if (addr && typeof addr === "object" && typeof addr.address === "string") return addr.address;
  throw new Error(`${ctx}: invalid address input (must be string or { address })`);
}
function ensureOk(resp, ctx) {
  if (!resp || typeof resp !== "object") throw new Error(`${ctx}: missing/invalid response object`);
  if (!resp.ok) {
    const status = resp.status ?? "unknown";
    const more = resp.decoded ?? resp.raw;
    throw new Error(`${ctx}: RPC returned not ok (status=${status})${more ? ` | details=${JSON.stringify(more)}` : ""}`);
  }
  if (resp.decodeError) {
    throw new Error(`${ctx}: failed to decode response | details=${JSON.stringify(resp.decodeError)}`);
  }
  if (resp.executionStatus !== 0 || resp.abortCode !== 0) {
    throw new Error(`${ctx}: on-chain execution failed (executionStatus=${resp.executionStatus}, abortCode=${resp.abortCode})`);
  }
}
var TxId = class extends String {
  constructor(value, result) {
    super(value);
    this.result = result;
  }
};
async function sendBuiltTx(connection, txObject, ctx) {
  let resp;
  try {
    resp = await connection.sendTransaction(txObject);
  } catch (e) {
    throw new Error(`${ctx}: sendTransaction failed | cause=${e?.message || e}`);
  }
  ensureOk(resp, ctx);
  const txId = resp.txId;
  const decoded = resp.decoded;
  let baseEntry = void 0;
  if (decoded && typeof decoded.get === "function") {
    baseEntry = decoded.get(BASE_POD_HEX);
  }
  if (!txId) throw new Error(`${ctx}: missing txId in successful response`);
  return new TxId(txId, baseEntry);
}
async function buildAndSend(connection, ctx, builder) {
  let txObject;
  try {
    txObject = await builder();
  } catch (e) {
    throw new Error(`${ctx}: failed to build tx | cause=${e?.message || e}`);
  }
  return sendBuiltTx(connection, txObject, ctx);
}
function getBaseEntry(decoded, ctx) {
  if (!decoded || typeof decoded.get !== "function") {
    throw new Error(`${ctx}: decoded payload has unexpected shape (expected Map-like with .get)`);
  }
  const baseEntry = decoded.get(BASE_POD_HEX);
  if (!baseEntry) {
    throw new Error(`${ctx}: no entry for BASE_POD_HEX=${BASE_POD_HEX}`);
  }
  return baseEntry;
}
async function fetchPrevTxHashFromNetwork(connection, address) {
  try {
    const tx = await SystemProgram.getLastTxHash(address);
    const res = await connection.sendTransaction(tx);
    const exec = res?.executionStatus;
    const abort = res?.abortCode;
    if (!res?.ok || typeof exec === "number" && exec !== 0 || typeof abort === "number" && abort !== 0) {
      return void 0;
    }
    const decoded = res.decoded;
    if (decoded && typeof decoded.get === "function") {
      const baseEntry = decoded.get(BASE_POD_HEX);
      const last = baseEntry?.lastTxHash;
      if (last instanceof Uint8Array && last.length === 32) return last;
      if (Array.isArray(last) && last.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
        const bytes = new Uint8Array(last);
        if (bytes.length === 32) return bytes;
      }
    }
    return void 0;
  } catch (_) {
    return void 0;
  }
}
async function publishKeyset(connection, account) {
  const publishKeysetObject = await SystemProgram.publishKeyset(account);
  const publishKeysetResponse = await connection.sendTransaction(publishKeysetObject);
  if (!publishKeysetResponse.ok) {
    console.log(`Transaction Id: ${publishKeysetResponse.txId}`);
    console.error("[error] publishKeyset failed:", publishKeysetResponse.status, publishKeysetResponse.decoded || publishKeysetResponse.raw);
  } else if (publishKeysetResponse.decodeError) {
    console.warn("[warn] Decoding publishKeyset failed:", publishKeysetResponse.decodeError);
  } else {
    console.log("[log] Keyset published successfully:", publishKeysetResponse.decoded);
  }
}
async function maybeGetPrevHash(connection, fromAddress, fromAcccount) {
  let prevTxHash;
  try {
    prevTxHash = await fetchPrevTxHashFromNetwork(connection, fromAddress);
  } catch (e) {
    throw new Error(`prevTxHash: failed to fetch | cause=${e?.message || e}`);
  }
  if (prevTxHash === void 0) {
    try {
      await publishKeyset(connection, fromAcccount);
    } catch (e) {
      throw new Error(`prevTxHash: failed to publish keyset for first tx | cause=${e?.message || e}`);
    }
    try {
      prevTxHash = await fetchPrevTxHashFromNetwork(connection, fromAddress);
    } catch (e) {
      throw new Error(`prevTxHash: failed to refetch after publish | cause=${e?.message || e}`);
    }
  }
  return prevTxHash;
}
async function runWithPrevHash({ connection, fromAcccount, opName, build }) {
  if (!connection) throw new Error(`${opName}: 'connection' is required`);
  if (!fromAcccount) throw new Error(`${opName}: 'fromAcccount' is required`);
  const fromAddress = normalizeAddress(fromAcccount, `${opName} (fromAcccount)`);
  const prevTxHash = await maybeGetPrevHash(connection, fromAddress, fromAcccount);
  return buildAndSend(connection, opName, () => build(prevTxHash));
}
async function basePodGetBalance(connection, address) {
  if (!connection) throw new Error("basePodGetBalance: 'connection' is required");
  if (typeof BASE_POD_HEX === "undefined") throw new Error("basePodGetBalance: 'BASE_POD_HEX' is not defined");
  const resolvedAddress = normalizeAddress(address, "basePodGetBalance");
  const getBalanceObject = await SystemProgram.getBalance(resolvedAddress);
  let getBalanceResponse;
  try {
    getBalanceResponse = await connection.sendTransaction(getBalanceObject);
  } catch (e) {
    throw new Error(`basePodGetBalance: sendTransaction failed | cause=${e?.message || e}`);
  }
  ensureOk(getBalanceResponse, "basePodGetBalance");
  const baseEntry = getBaseEntry(getBalanceResponse.decoded, "basePodGetBalance");
  const balance = baseEntry.balance;
  if (typeof balance === "bigint") return balance;
  if (typeof balance === "number") return BigInt(balance);
  throw new Error("basePodGetBalance: balance field missing or invalid");
}
async function basePodTransfer(connection, fromAcccount, toAddress, amount) {
  if (amount === void 0 || amount === null) throw new Error("basePodTransfer: 'amount' is required");
  const resolvedTo = normalizeAddress(toAddress, "basePodTransfer (toAddress)");
  return runWithPrevHash({
    connection,
    fromAcccount,
    opName: "basePodTransfer",
    build: (prevTxHash) => SystemProgram.transfer(fromAcccount, resolvedTo, amount, { prevTxHash })
  });
}
async function basePodMint(connection, fromAcccount, toAddress, amount) {
  if (amount === void 0 || amount === null) throw new Error("basePodMint: 'amount' is required");
  const resolvedTo = normalizeAddress(toAddress, "basePodMint (toAddress)");
  return runWithPrevHash({
    connection,
    fromAcccount,
    opName: "basePodMint",
    build: (prevTxHash) => SystemProgram.mint(fromAcccount, resolvedTo, amount, { prevTxHash })
  });
}
async function basePodBurn(connection, fromAcccount, amount) {
  if (amount === void 0 || amount === null) throw new Error("basePodBurn: 'amount' is required");
  return runWithPrevHash({
    connection,
    fromAcccount,
    opName: "basePodBurn",
    build: (prevTxHash) => SystemProgram.burn(fromAcccount, amount, { prevTxHash })
  });
}
async function basePodGetCurrentSupply(connection) {
  if (!connection) throw new Error("basePodGetCurrentSupply: 'connection' is required");
  if (typeof BASE_POD_HEX === "undefined") throw new Error("basePodGetCurrentSupply: 'BASE_POD_HEX' is not defined");
  const getCurrentSupplyObject = await SystemProgram.getCurrentSupply();
  let getCurrentSupplyResponse;
  try {
    getCurrentSupplyResponse = await connection.sendTransaction(getCurrentSupplyObject);
  } catch (e) {
    throw new Error(`basePodGetCurrentSupply: sendTransaction failed | cause=${e?.message || e}`);
  }
  ensureOk(getCurrentSupplyResponse, "basePodGetCurrentSupply");
  const baseEntry = getBaseEntry(getCurrentSupplyResponse.decoded, "basePodGetCurrentSupply");
  const currentSupply = baseEntry.currentSupply;
  if (typeof currentSupply === "bigint") return currentSupply;
  if (typeof currentSupply === "number") return BigInt(currentSupply);
  throw new Error("basePodGetCurrentSupply: currentSupply field missing or invalid");
}
export {
  ADDRESS_HRP,
  BIP44_PURPOSE,
  Connection,
  LEA_COIN_TYPE,
  LEA_DERIVATION_BASE,
  LEA_SYSTEM_PROGRAM,
  SystemProgram,
  Wallet,
  areUint8ArraysEqual,
  base64ToUint8Array,
  basePodBurn,
  basePodGetBalance,
  basePodGetCurrentSupply,
  basePodMint,
  basePodTransfer,
  combineUint8Arrays,
  generateMnemonic,
  uint8ArrayToBase64
};
/*! Bundled license information:

hash-wasm/dist/index.esm.js:
  (*!
   * hash-wasm (https://www.npmjs.com/package/hash-wasm)
   * (c) Dani Biro
   * @license MIT
   *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@getlea/ltm/dist/ltm.web.mjs:
  (*! Bundled license information:
  
  hash-wasm/dist/index.esm.js:
    (*!
     * hash-wasm (https://www.npmjs.com/package/hash-wasm)
     * (c) Dani Biro
     * @license MIT
     *)
  *)
*/
//# sourceMappingURL=lea-wallet.web.js.map
