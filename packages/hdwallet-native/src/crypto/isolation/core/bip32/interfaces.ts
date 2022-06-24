import * as core from "@shapeshiftoss/hdwallet-core";

import { Revocable } from "..";
import * as SecP256K1 from "../secp256k1";
import { ChainCode } from ".";

export interface Seed extends Partial<Revocable> {
  toMasterKey(hmacKey?: string | Uint8Array): Promise<Node>;
  isBIP32(): boolean;
}

export interface Node extends Partial<Revocable>, SecP256K1.ECDSAKey, Partial<SecP256K1.ECDHKey> {
  getPublicKey(): Promise<SecP256K1.CompressedPoint>;
  getChainCode(): Promise<ChainCode>;
  derive(index: number): Promise<this>;
  isBIP32(): boolean;
}

export function nodeSupportsECDH<T extends Node>(x: T): x is T & SecP256K1.ECDHKey {
  return core.isIndexable(x) && "ecdh" in x && typeof x.ecdh === "function";
}
