import type { Card, CardHash } from './schemas/card.js';

export interface CardCommitment {
  card: Card;
  salt: string;
  cardHash: CardHash;
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function utf8Bytes(input: string): Uint8Array {
  const bytes: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const codeUnit = input.charCodeAt(i);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && i + 1 < input.length) {
      const nextCodeUnit = input.charCodeAt(i + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        const codePoint = 0x10000 + ((codeUnit - 0xd800) << 10) + (nextCodeUnit - 0xdc00);
        bytes.push(
          0xf0 | (codePoint >>> 18),
          0x80 | ((codePoint >>> 12) & 0x3f),
          0x80 | ((codePoint >>> 6) & 0x3f),
          0x80 | (codePoint & 0x3f),
        );
        i++;
        continue;
      }
    }

    if (codeUnit <= 0x7f) {
      bytes.push(codeUnit);
    } else if (codeUnit <= 0x7ff) {
      bytes.push(
        0xc0 | (codeUnit >>> 6),
        0x80 | (codeUnit & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (codeUnit >>> 12),
        0x80 | ((codeUnit >>> 6) & 0x3f),
        0x80 | (codeUnit & 0x3f),
      );
    }
  }

  return Uint8Array.from(bytes);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function serializeCard(card: Card): string {
  return [
    card.name,
    card.setCode,
    card.collectorNumber,
    card.cardType,
    card.tapped === true ? '1' : '0',
    card.faceDown === true ? '1' : '0',
  ].join('\u0000');
}

export function sha256Hex(input: string): string {
  const message = utf8Bytes(input);
  const bitLength = message.length * 8;
  const totalLength = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLength);
  padded.set(message);
  padded[message.length] = 0x80;

  let remainingBits = bitLength;
  for (let i = 0; i < 8; i++) {
    padded[totalLength - 1 - i] = remainingBits & 0xff;
    remainingBits = Math.floor(remainingBits / 256);
  }

  const words = new Uint32Array(64);
  const hash = new Uint32Array([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);
  const constants = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const base = offset + i * 4;
      words[i] = (
        (padded[base] << 24)
        | (padded[base + 1] << 16)
        | (padded[base + 2] << 8)
        | padded[base + 3]
      ) >>> 0;
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rotateRight(words[i - 15], 7) ^ rotateRight(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const s1 = rotateRight(words[i - 2], 17) ^ rotateRight(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let i = 0; i < 64; i++) {
      const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + sigma1 + choose + constants[i] + words[i]) >>> 0;
      const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sigma0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  for (let i = 0; i < hash.length; i++) {
    digest[i * 4] = hash[i] >>> 24;
    digest[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    digest[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    digest[i * 4 + 3] = hash[i] & 0xff;
  }

  return toHex(digest);
}

export function generateSalt(byteLength = 16): string {
  if (!Number.isInteger(byteLength) || byteLength <= 0) {
    throw new RangeError(`byteLength must be a positive integer, got ${byteLength}`);
  }

  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function hashCard(card: Card, salt: string): CardHash {
  return {
    hash: sha256Hex(`${salt}\u0001${serializeCard(card)}`),
  };
}

export function createCardCommitment(card: Card, salt = generateSalt()): CardCommitment {
  return {
    card,
    salt,
    cardHash: hashCard(card, salt),
  };
}

export function createCardCommitments(cards: readonly Card[]): CardCommitment[] {
  return cards.map(card => createCardCommitment(card));
}
