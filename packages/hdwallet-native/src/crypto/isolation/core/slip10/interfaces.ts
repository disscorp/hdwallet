//import * as core from "@shapeshiftoss/hdwallet-core";

import * as Ed25519 from "../ed25519";
import { ChainCode } from ".";
import { Revocable } from "..";

export interface Seed extends Partial<Revocable> {
    toMasterKey(hmacKey?: string | Uint8Array): Promise<Node>;
    isSLIP10(): boolean;
}

export interface Node extends Partial<Revocable>, Ed25519.Ed25519Key {
    getPublicKey(): Uint8Array;
    getChainCode(): Promise<ChainCode>;
    derive(index: number): Promise<this>;
    isSLIP10(): boolean;
}
