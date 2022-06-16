import { Ed25519, IsolationError } from "../core";
import * as IotaCryptoJs from "@iota/crypto.js";
import { assertType, ByteArray } from "../types";

export class ECPairAdapter {
    protected readonly _isolatedKey: Ed25519.Ed25519Key;
    readonly _publicKey: Uint8Array;

    protected constructor(isolatedKey: Ed25519.Ed25519Key, publicKey: Uint8Array) {
        this._isolatedKey = isolatedKey;
        this._publicKey = publicKey;
    }

    static async create(isolatedKey: Ed25519.Ed25519Key): Promise<ECPairAdapter> {
        return new ECPairAdapter(isolatedKey, await isolatedKey.getPublicKey());
    }

    get ed25519Sign() {
        return this._isolatedKey.sign.bind(this._isolatedKey);
    }

    async sign(hash: ByteArray): Promise<Buffer> {
        assertType(ByteArray(), hash);
        return Buffer.from( await this._isolatedKey.sign(hash) );
    }

    get publicKey(): Uint8Array { return this.getPublicKey(); }

    getPublicKey(): Uint8Array {
        return this._publicKey;
    }

    toWIF(): never { throw new IsolationError("WIF"); }

    verify(hash: Uint8Array, signature: Uint8Array) {
        return IotaCryptoJs.Ed25519.verify(this._publicKey, hash, signature);
    }
    
}

export default ECPairAdapter;
