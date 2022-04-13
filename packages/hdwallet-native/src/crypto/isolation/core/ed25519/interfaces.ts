import { Ed25519CurvePoint, Ed25519Signature } from "./types";

export interface Ed25519Key {
    getPublicKey(): Promise<Ed25519CurvePoint>;

    sign(message: Uint8Array): Ed25519Signature;
}
