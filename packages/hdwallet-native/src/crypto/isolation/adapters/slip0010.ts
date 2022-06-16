import * as IotaCryptoJs from "@iota/crypto.js";

import { SLIP0010, Ed25519, IsolationError } from "../core";
//import type { CurvePoint } from "../core";
import { ECPairAdapter } from "./iota";

export class SLIP0010Adapter extends ECPairAdapter {
  readonly node: SLIP0010.Node;
  readonly _chainCode: SLIP0010.ChainCode;
  readonly _publicKey: Uint8Array;
  readonly index: number;
  readonly _parent?: SLIP0010Adapter;
  readonly _children = new Map<number, this>();
  //_base58?: string;

  protected constructor(node: SLIP0010.Node, chainCode: SLIP0010.ChainCode, publicKey: Uint8Array, index?: number) {
    super(node, publicKey);
    this.node = node;
    this._chainCode = chainCode;
    this._publicKey = publicKey;
    this.index = index ?? 0;
  }

  static async create(isolatedNode: SLIP0010.Node, networkOrParent?: SLIP0010Adapter, index?: number): Promise<SLIP0010Adapter> {
    return new SLIP0010Adapter(isolatedNode, await isolatedNode.getChainCode(), await isolatedNode.getPublicKey(), index);
  }

  /*
  get depth(): number {
    return (this._parent?.depth ?? -1) + 1;
  }
  */

  get chainCode() {
    return Buffer.from(this._chainCode) as Buffer & SLIP0010.ChainCode;
  }
  getChainCode() {
    return this.chainCode;
  }

  get path(): string {
    if (!this._parent) return "";
    let parentPath = this._parent.path ?? "";
    if (parentPath === "") parentPath = "m";
    const hardened = this.index >= 0x80000000;
    const index = hardened ? this.index - 0x80000000 : this.index;
    return `${parentPath}/${index}${hardened ? "'" : ""}`;
  }

  get publicKey() {
    return this._publicKey;
  }
  
  getPublicKey() {
    return this.publicKey;
  }

  isNeutered() {
    return false;
  }

  /*
  todo
  neutered() {
    if (!this._base58) {
      const xpub = Buffer.alloc(78);
      xpub.writeUInt32BE(this.network.bip32.public, 0);
      xpub.writeUInt8(this.depth, 4);
      xpub.writeUInt32BE(this.parentFingerprint, 5);
      xpub.writeUInt32BE(this.index, 9);
      xpub.set(this.chainCode, 13);
      xpub.set(this.publicKey, 45);
      this._base58 = bs58check.encode(xpub);
    }
    return bip32.fromBase58(this._base58, this.network);
  }
  */

  toBase58(): never {
    throw new IsolationError("xprv");
  }

  async derive(index: number): Promise<this> {
    let out = this._children.get(index);
    //todo: shouldnt be possible not hardened derivation for ed25519
    if (!out) {
      out = (await SLIP0010Adapter.create(await this.node.derive(index), this, index)) as this;
      this._children.set(index, out);
    }
    return out;
  }
  
  async deriveHardened(index: number): Promise<SLIP0010Adapter> {
    return await this.derive(index + 0x80000000);
  }

  async derivePath(path: string): Promise<SLIP0010Adapter> {
    const ownPath = this.path;
    if (path.startsWith(ownPath)) path = path.slice(ownPath.length);
    if (/^m/.test(path) && this._parent) throw new Error("expected master, got child");
    return await SLIP0010.derivePath<SLIP0010Adapter>(this, path);
  }
}

export default SLIP0010Adapter;
