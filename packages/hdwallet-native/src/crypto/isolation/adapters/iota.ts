import { Ed25519, IsolationError } from "../core";
import * as IotaCryptoJs from "@iota/crypto.js";
import { assertType, ByteArray } from "../types";

export class ECPairAdapter {
    protected readonly _isolatedKey: Ed25519.Ed25519Key;
    readonly _publicKey: Ed25519.CurvePoint;

    protected constructor(isolatedKey: Ed25519.Ed25519Key, publicKey: Ed25519.CurvePoint) {
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

    get publicKey() { return this.getPublicKey(); }

    getPublicKey() {
        const publicKey = this._publicKey;
        const key = new Ed25519.CurvePoint( publicKey.data );
        return Buffer.from(key.data) as Buffer & Ed25519.CurvePoint;
    }

    toWIF(): never { throw new IsolationError("WIF"); }

    verify(hash: Uint8Array, signature: Uint8Array) {
        return IotaCryptoJs.Ed25519.verify(new Uint8Array(this._publicKey.data.buffer), hash, signature);
    }
    
}

export default ECPairAdapter;
