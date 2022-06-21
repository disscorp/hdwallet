//import { CurvePoint, Signature } from "./types";

export interface Ed25519Key {
    getPublicKey(): Promise<Uint8Array>;

    sign(message: Uint8Array): Promise<Uint8Array>;
}
