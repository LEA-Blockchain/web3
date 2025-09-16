class ConnectionImpl {
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
      localhost: "http://localhost:60000",
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
    const { tx: { tx, txId }, decode } = txObject;

    if (!(tx instanceof Uint8Array)) {
      throw new Error("sendTransaction expects tx to be a Uint8Array");
    }
    if (typeof decode !== "function") {
      throw new Error("sendTransaction expects a decode(resultBuffer) function");
    }

    const response = await fetch(`${this.url}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Connection": "close",
      },
      body: tx,
    });

    // Always read the body (even on non-2xx)
    const arrayBuffer = await response.arrayBuffer();
    const raw = new Uint8Array(arrayBuffer);

    let decoded = null;
    let decodeError = null;

    if (raw.length > 0) {
      try {
        decoded = await decode(raw);
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
      executionStatus: Number(response.headers.get("x-execution-status") ?? undefined),
      abortCode: Number(response.headers.get("x-abort-code") ?? undefined),
    };

  }
}

export const Connection = (cluster = "devnet") => new ConnectionImpl(cluster);
