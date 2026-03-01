"use client";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const normalizeToken = (token: string) => token.replace(/\s+/g, "");

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const encodeBase32 = (bytes: Uint8Array) => {
  let output = "";
  let bits = 0;
  let value = 0;
  bytes.forEach((byte) => {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  });
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
};

const decodeBase32 = (value: string) => {
  const clean = value.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    buffer = (buffer << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
};

const toCounterBuffer = (counter: number) => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  let value = counter;
  for (let index = 7; index >= 0; index -= 1) {
    view.setUint8(index, value & 0xff);
    value = Math.floor(value / 256);
  }
  return buffer;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return new Uint8Array(bytes).buffer as ArrayBuffer;
};

const signHmac = async (secret: Uint8Array, counter: number) => {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.subtle) {
    throw new Error("Crypto API not available.");
  }
  const key = await cryptoRef.subtle.importKey(
    "raw",
    toArrayBuffer(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await cryptoRef.subtle.sign(
    "HMAC",
    key,
    toCounterBuffer(counter)
  );
  return new Uint8Array(signature);
};

const truncateHmac = (hmac: Uint8Array, digits: number) => {
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(binary % mod).padStart(digits, "0");
};

export const generateTwoFactorSecret = (size = 20) => {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.getRandomValues) {
    throw new Error("Crypto API not available.");
  }
  const bytes = new Uint8Array(size);
  cryptoRef.getRandomValues(bytes);
  return encodeBase32(bytes);
};

export const buildOtpAuthUrl = ({
  secret,
  issuer,
  label,
}: {
  secret: string;
  issuer: string;
  label: string;
}) => {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(label);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
};

export const verifyTotp = async ({
  token,
  secret,
  window = 1,
  step = 30,
  digits = 6,
}: {
  token: string;
  secret: string;
  window?: number;
  step?: number;
  digits?: number;
}) => {
  const normalized = normalizeToken(token);
  if (!/^\d{6}$/.test(normalized)) return false;
  const secretBytes = decodeBase32(secret);
  const counter = Math.floor(Date.now() / 1000 / step);

  for (let offset = -window; offset <= window; offset += 1) {
    const hmac = await signHmac(secretBytes, counter + offset);
    const expected = truncateHmac(hmac, digits);
    if (timingSafeEqual(normalized, expected)) {
      return true;
    }
  }
  return false;
};
