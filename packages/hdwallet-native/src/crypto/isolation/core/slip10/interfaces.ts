import * as core from "@shapeshiftoss/hdwallet-core";

import * as Ed25519 from "../ed25519";
import { ChainCode } from ".";
import { Revocable } from "..";

export interface Seed extends Partial<Revocable> {
    toMasterKey(hmacKey?: string | Uint8Array): Promise<Node>;
}

export interface Node extends Partial<Revocable>, Ed25519.ECDSAKey, Partial<Ed25519.ECDHKey> {
    getPublicKey(): Promise<Ed25519.CompressedPoint>;
    getChainCode(): Promise<ChainCode>;
    derive(index: number): Promise<this>;
}

