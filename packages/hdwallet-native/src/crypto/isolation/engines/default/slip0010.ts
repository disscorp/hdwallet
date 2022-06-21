import * as SLIP0010 from "../../core/slip0010";

import * as IotaCryptoJs from "@iota/crypto.js";
import * as IotaUtilJs from "@iota/util.js";

import { ByteArray, Uint32, checkType, safeBufferFrom, assertType } from "../../types";
import { Ed25519 } from "../../core";
import { ChainCode } from "../../core/bip32";
import { revocable, Revocable } from "./revocable";
import { chain } from "lodash";

export class Seed extends Revocable(class {}) implements SLIP0010.Seed  {
    readonly #seed: Buffer;

    protected constructor(seed: Uint8Array) {
      super()
      this.#seed = safeBufferFrom(seed);
      this.addRevoker(() => this.#seed.fill(0));
    }

    static async create(seed: Uint8Array): Promise<SLIP0010.Seed> {
        const obj = new Seed(seed);
        return revocable(obj, (x) => obj.addRevoker(x));
    }

    async toMasterKey(hmacKey?: string | Uint8Array): Promise<SLIP0010.Node> {
        if (hmacKey !== undefined && typeof hmacKey !== "string" && !(hmacKey instanceof Uint8Array)) throw new Error("bad hmacKey type");

        hmacKey = hmacKey ?? "ed25519 seed";
        if (typeof hmacKey === "string") hmacKey = IotaUtilJs.Converter.utf8ToBytes(hmacKey);

        // Based on @iota/crypto.js/src/keys/slip0010.ts
        const hmac = new IotaCryptoJs.HmacSha512( safeBufferFrom(hmacKey) );
        const fullKey = hmac.update(this.#seed).digest();
        const out = await Node.create(
            Uint8Array.from(fullKey.slice(0, 32)),
            Uint8Array.from(fullKey.slice(32))
        )
        return out;
    }
}


export class Node extends Revocable(class {}) implements SLIP0010.Node, Ed25519.Ed25519Key {
    readonly #privateKey: Buffer & ByteArray<32>;
    readonly chainCode: Buffer & SLIP0010.ChainCode;
    #publicKey: Uint8Array | undefined;

    // When running tests, this will keep us aware of any codepaths that don't pass in the preimage
    static requirePreimage = typeof expect === "function";

    protected constructor(privateKey: Uint8Array, chainCode: Uint8Array) {
        super()
        // We avoid handing the private key to any non-platform code -- including our type-checking machinery.
        if (privateKey.length !== 32) throw new Error("bad private key length");
        this.#privateKey = safeBufferFrom(privateKey) as Buffer & ByteArray<32>;
        this.addRevoker(() => this.#privateKey.fill(0));
        this.chainCode = safeBufferFrom(checkType(SLIP0010.ChainCode, chainCode)) as Buffer & ChainCode;
    }

    static async create(privateKey: Uint8Array, chainCode: Uint8Array): Promise<SLIP0010.Node> {
        const obj = new Node(privateKey, chainCode);
        return revocable(obj, (x) => obj.addRevoker(x));
    }

    getPublicKey(): Promise<Uint8Array> {
        this.#publicKey = this.#publicKey ?? IotaCryptoJs.Slip0010.getPublicKey(this.#privateKey);
        return Promise.resolve(this.#publicKey);
    }

    async getChainCode() { return this.chainCode }

    async sign(message: Uint8Array): Promise<Uint8Array> {
        return IotaCryptoJs.Ed25519.sign(this.#privateKey, message);
    }

    async derive(index: Uint32): Promise<this> {
        Uint32.assert(index);

        /// Forked from @iota/crypto.js/src/keys/slip0010.ts/SLIP0010/derivePath()
        const indexValue = 0x80000000 + index;

        const data = new Uint8Array(1 + this.#privateKey.length + 4);

        data[0] = 0;
        data.set(this.#privateKey, 1);
        data[this.#privateKey.length + 1] = indexValue >>> 24;
        data[this.#privateKey.length + 2] = indexValue >>> 16;
        data[this.#privateKey.length + 3] = indexValue >>> 8;
        data[this.#privateKey.length + 4] = indexValue & 0xff;

        let hmac = new IotaCryptoJs.HmacSha512(this.chainCode);
        const fullKey =  hmac.update(data).digest();

        const privateKey = Uint8Array.from(fullKey.slice(0, 32));
        const chainCode = Uint8Array.from(fullKey.slice(32));
        ////

        const out = await Node.create(privateKey, chainCode);
        this.addRevoker(() => out.revoke?.())
        return out as this;
        
    }

}
