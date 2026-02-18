"use client";

export type PasswordDigest = {
  version: 1;
  algorithm: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
  derivedKey: string;
  keyLength: number;
};

const DEFAULT_ITERATIONS = 150000;
const DEFAULT_KEY_LENGTH = 32;
const DEFAULT_HASH: PasswordDigest["hash"] = "SHA-256";

const encoder = new TextEncoder();

const requireCrypto = () => {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.subtle || !cryptoRef?.getRandomValues) {
    throw new Error("Secure crypto is not available.");
  }
  return cryptoRef;
};

const toBase64 = (value: ArrayBuffer | Uint8Array) => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const deriveKey = async (
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLength: number,
  hash: PasswordDigest["hash"] = DEFAULT_HASH
) => {
  const cryptoRef = requireCrypto();
  const keyMaterial = await cryptoRef.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await cryptoRef.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash,
    },
    keyMaterial,
    keyLength * 8
  );
  return new Uint8Array(bits);
};

export const createPasswordDigest = async (
  password: string,
  options?: Partial<Pick<PasswordDigest, "iterations" | "keyLength">>
): Promise<PasswordDigest> => {
  const cryptoRef = requireCrypto();
  const iterations = options?.iterations ?? DEFAULT_ITERATIONS;
  const keyLength = options?.keyLength ?? DEFAULT_KEY_LENGTH;
  const salt = cryptoRef.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKey(
    password,
    salt,
    iterations,
    keyLength,
    DEFAULT_HASH
  );

  return {
    version: 1,
    algorithm: "PBKDF2",
    hash: DEFAULT_HASH,
    iterations,
    salt: toBase64(salt),
    derivedKey: toBase64(derivedKey),
    keyLength,
  };
};

export const verifyPassword = async (
  password: string,
  digest: PasswordDigest
): Promise<boolean> => {
  if (!digest?.salt || !digest?.derivedKey) {
    return false;
  }
  if (digest.algorithm !== "PBKDF2") {
    return false;
  }
  const salt = fromBase64(digest.salt);
  const iterations = digest.iterations ?? DEFAULT_ITERATIONS;
  const keyLength = digest.keyLength ?? DEFAULT_KEY_LENGTH;
  const hash = digest.hash ?? DEFAULT_HASH;
  const derivedKey = await deriveKey(password, salt, iterations, keyLength, hash);
  return timingSafeEqual(toBase64(derivedKey), digest.derivedKey);
};

export const hasLegacyPassword = (payload: {
  password?: string;
  passwordDigest?: PasswordDigest;
}) => Boolean(payload.password && !payload.passwordDigest);
