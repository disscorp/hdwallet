import { Revocable, SLIP10 } from "..";
import * as BIP32 from "../bip32";

export interface Mnemonic extends Partial<Revocable> {
  toSeed(passphrase?: string, slip10?: boolean): Promise<BIP32.Seed | SLIP10.Seed>;
}
