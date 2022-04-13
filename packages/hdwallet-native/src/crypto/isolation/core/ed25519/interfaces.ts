import { CurvePoint, Signature } from "./types";

export interface Ed25519Key {
    getPublicKey(): Promise<CurvePoint>;

    sign(message: Uint8Array): Promise<Signature>;
}
