//import { CurvePoint, Signature } from "./types";

export interface Ed25519Key {
    getPublicKey(): Uint8Array;

    sign(message: Uint8Array): Uint8Array;
}
