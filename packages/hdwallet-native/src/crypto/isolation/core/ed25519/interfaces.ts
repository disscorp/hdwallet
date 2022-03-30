import { ByteArray, Uint32 } from "../../types";
import { CurvePoint, RecoverableSignature, Signature } from "./types";
import * as Digest from "../digest";

export interface EdDSAKey {
    getPublicKey(): Promise<CurvePoint>;

    eddsaSign(privateKey: Uint8Array, message: Uint8Array): Uint8Array;
}
