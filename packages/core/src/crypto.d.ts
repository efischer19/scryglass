/**
 * Minimal ambient type for the Web Crypto API subset used by the shuffle engine.
 * globalThis.crypto is available in Node.js 19+ and all modern browsers.
 * We declare only what we need to avoid pulling in the full DOM lib.
 */
declare global {
  // eslint-disable-next-line no-var
  var crypto: {
    getRandomValues<T extends ArrayBufferView>(array: T): T;
  };
}

export {};
