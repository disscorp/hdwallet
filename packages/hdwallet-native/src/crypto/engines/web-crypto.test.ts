/**
 * @jest-environment jsdom
 */
import CryptoHelper from "../CryptoHelper";
import { fromB64ToArray, fromBufferToUtf8, fromBufferToB64, toArrayBuffer, fromUtf8ToArray } from "../utils";
import WebCryptoEngine from "./web-crypto";
import { Crypto } from "@peculiar/webcrypto";

describe("WebCryptoEngine JavaScript", () => {
  // Load shim to support running tests in node
  globalThis.crypto = new Crypto();

  const engine = new WebCryptoEngine();
  const helper = new CryptoHelper(engine);

  it("should decrypt what it encrypts", async () => {
    const data = toArrayBuffer("test all seed phrase words for to see this to work maybe");
    const key = toArrayBuffer("12345678901234561234567890123456");
    const iv = toArrayBuffer("1234567890123456");
    const engine = new WebCryptoEngine();

    const encrypted = await engine.encrypt(data, key, iv);

    const decrypted = fromBufferToUtf8(await engine.decrypt(encrypted, key, iv));
    expect(decrypted).toEqual("test all seed phrase words for to see this to work maybe");
  });

  it("should decrypt what it encrypts with random key", async () => {
    const data = toArrayBuffer("test encrypted data");
    const key = await engine.randomBytes(32);
    const iv = await engine.randomBytes(16);

    const encrypted = await engine.encrypt(data, key, iv);
    const decrypted = await engine.decrypt(encrypted, key, iv);
    expect(fromBufferToUtf8(decrypted)).toEqual("test encrypted data");
  });

  it("should generate a key from a password and email", async () => {
    const key = await helper.makeKey("password", "email");
    expect(key.encKeyB64).toEqual("Ohkd7bfLczTp+zRe74f0raBkF3deLRWS4MvnIsYG7xQ=");
  });

  it("should generate a different key from a different password", async () => {
    const key = await helper.makeKey("password2", "email");
    expect(key.encKeyB64).not.toEqual("Ohkd7bfLczTp+zRe74f0raBkF3deLRWS4MvnIsYG7xQ=");
  });

  it("should generate a different key from a different email", async () => {
    const key = await helper.makeKey("password", "email2");
    expect(key.encKeyB64).not.toEqual("Ohkd7bfLczTp+zRe74f0raBkF3deLRWS4MvnIsYG7xQ=");
  });

  it("should generate a password hash from an encryption key and password", async () => {
    const key = await helper.makeKey("password", "email");
    expect(key.hashKeyB64).toEqual("W/7DR3sIqcb8lnLXD/ToTS+imBVMTyPR7JMend9hxrM=");
  });

  it("should generate a different password hash from an encryption key and password", async () => {
    const key = await helper.makeKey("password2", "email");
    const hash = await helper.pbkdf2(key.hashKey, "password2", 1);
    expect(fromBufferToB64(hash)).not.toEqual("W/7DR3sIqcb8lnLXD/ToTS+imBVMTyPR7JMend9hxrM=");
  });

  it("should encrypt a wallet with a password and email", async () => {
    const key = await helper.makeKey("password", "email");

    const mnemonic = fromUtf8ToArray("all all all all all all all all all all all all");
    const iv = fromB64ToArray("rnvfQhmCO27xxEk33ayinw==");
    const encrypted = await engine.encrypt(mnemonic, key.encKey, iv);

    expect(fromBufferToB64(encrypted)).toEqual("FC2M6J3aqlavEne0Sl72Xyh3XB2RzxmNpy/zKNqu1ys+3Xe7pxyRQd+GRsLcf/Rf");
  });

  it("should decrypt a wallet with a password and email", async () => {
    const key = await helper.makeKey("password", "email");
    const encryptedData = fromB64ToArray("FC2M6J3aqlavEne0Sl72Xyh3XB2RzxmNpy/zKNqu1ys+3Xe7pxyRQd+GRsLcf/Rf");
    const iv = fromB64ToArray("rnvfQhmCO27xxEk33ayinw==");
    const decrypted = await engine.decrypt(encryptedData, key.encKey, iv);

    expect(fromBufferToUtf8(decrypted)).toEqual("all all all all all all all all all all all all");
  });

  it("should generate random bytes", async () => {
    const bytes = await engine.randomBytes(32);
    expect(bytes.byteLength).toBe(32);

    // Make sure we're not just returning an empty array of 0s
    // It's very unlikely that a random set of 32 bytes will result in all 0s
    const typedArray = new Uint8Array(bytes);
    const sum = typedArray.reduce((sum, value) => sum + value, 0);
    expect(sum).toBeGreaterThan(0);
  });
});

/*
To verify the web-crypto code is compatible with the mobile app,
the encrypted data used for these tests were generated by the mobile app

The following was added to `App/context/Wallet/index.tsx` in the `useEffect` hook
that initializes the wallet:

    // ============ REMOVE =================
    const key = await makeKey('password', 'email')
    console.log('key', key)
    const hash = await hashPassword('password', key)
    console.log('passwordHash', hash)
    const stretchedKey = await stretchKey(key)
    console.log('stretchedKey', stretchedKey)
    const encryptedWallet = await encrypt(
      'all all all all all all all all all all all all',
      stretchedKey
    )
    console.log('encryptedWallet', encryptedWallet)
    // ============ REMOVE =================

The result of that code was:

unstretched key
    {"encKey": {"data": [Array], "type": "Buffer"}, "encKeyB64": "Dh3RT7Uq4C5YVpsXBjCFnQZRnYiYEydLQPBgBLJ5MS8=", "encType": 0, "key": {"data": [Array], "type": "Buffer"}, "keyB64": "Dh3RT7Uq4C5YVpsXBjCFnQZRnYiYEydLQPBgBLJ5MS8=", "macKey": null, "macKeyB64": null}

passwordHash
    W/7DR3sIqcb8lnLXD/ToTS+imBVMTyPR7JMend9hxrM=

stretchedKey
    {"encKey": [], "encKeyB64": "Ohkd7bfLczTp+zRe74f0raBkF3deLRWS4MvnIsYG7xQ=", "encType": 2, "key": [], "keyB64": "Ohkd7bfLczTp+zRe74f0raBkF3deLRWS4MvnIsYG7xSisttHbNlnITu7dsitOKWy1L6ROQfr2tYZURsNXJcPbw==", "macKey": [], "macKeyB64": "orLbR2zZZyE7u3bIrTilstS+kTkH69rWGVEbDVyXD28="}

encryptedWallet
    {"data": "FC2M6J3aqlavEne0Sl72Xyh3XB2RzxmNpy/zKNqu1ys+3Xe7pxyRQd+GRsLcf/Rf", "encryptedString": "2.FC2M6J3aqlavEne0Sl72Xyh3XB2RzxmNpy/zKNqu1ys+3Xe7pxyRQd+GRsLcf/Rf|rnvfQhmCO27xxEk33ayinw==|kvwPLZpJtrTuob3xNVxSiePJ+newC7keI1DPGyUls/Y=", "encryptionType": 2, "iv": "rnvfQhmCO27xxEk33ayinw==", "mac": "kvwPLZpJtrTuob3xNVxSiePJ+newC7keI1DPGyUls/Y="}
 */
