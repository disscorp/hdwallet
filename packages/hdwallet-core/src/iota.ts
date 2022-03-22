import { 
  Input as IotaInput,
  Output as IotaOutput,
  TransactionPayloadEssence as IotaTransactionPayloadEssence,
  Ed25519SignatureUnlockBlock as IotaEd25519SignatureUnlockBlock,
  SignatureUnlockBlock as IotaSignatureUnlockBlock,
  ReferenceUnlockBlock as IotaReferenceUnlockBlock,
  TransactionPayload as IotaTransactionPayload,
  IndexationPayload as IotaIndexationPayload,
  MilestoneEssence as IotaMilestoneEssence,
  MilestonePayload as IotaMilestonePayload,
  Message as IotaMessage,
  MessageWrapper as IotaMessageWrapper,
  ReceiptPayload as IotaReceiptPayload,
  TreasuryTransactionPayload as IotaTreasuryTransactionPayload,
  MigratedFundsEntry as IotaMigratedFundsEntry,
  Ed25519Address as IotaEd25519Address,
  Treasury as IotaTreasury } from "@iota/client/lib/types/message";

import * as ta from "type-assertions";
import { addressNListToBIP32, slip44ByCoin } from "./utils";
import { BIP32Path, Coin, ExchangeType, HDWallet, HDWalletInfo, PathDescription } from "./wallet";

export type {
  Input as IotaInput,
  Output as IotaOutput,
  TransactionPayloadEssence as IotaTransactionPayloadEssence,
  Ed25519SignatureUnlockBlock as IotaEd25519SignatureUnlockBlock,
  SignatureUnlockBlock as IotaSignatureUnlockBlock,
  ReferenceUnlockBlock as IotaReferenceUnlockBlock,
  TransactionPayload as IotaTransactionPayload,
  IndexationPayload as IotaIndexationPayload,
  MilestoneEssence as IotaMilestoneEssence,
  MilestonePayload as IotaMilestonePayload,
  Message as IotaMessage,
  MessageWrapper as IotaMessageWrapper,
  ReceiptPayload as IotaReceiptPayload,
  TreasuryTransactionPayload as IotaTreasuryTransactionPayload,
  MigratedFundsEntry as IotaMigratedFundsEntry,
  Ed25519Address as IotaEd25519Address,
  Treasury as IotaTreasury } from "@iota/client/lib/types/message";

export type IotaGetAddress = {
  coin: Coin;
  addressNList: BIP32Path;
  addressType?: number; // Ed25519Address.type: number
  showDisplay?: boolean;
};

export interface IotaGetAccountPath {
  coin: Coin;
  accountIdx: number;
};

export interface IotaAccountPath {
  addressNList: BIP32Path;
  hardenedPath: BIP32Path;
  relPath: BIP32Path;
  description: string;
}

export interface IotaSignTx extends IotaTransactionPayloadEssence {
  coin: string;
}

export interface IotaSignedTx {
  signatures: Array<string>;

  /** hex string representation of the raw, signed transaction */
  serializedTx: string;
}

export interface IotaWalletInfo extends HDWalletInfo {
  readonly _supportsIotaInfo: boolean;

  /**
   * Does the device support internal transfers without the user needing to
   * confirm the destination address?
   */
  iotaSupportsSecureTransfer(): Promise<boolean>;

  /**
   * Does the device support `/sendamountProto2` style ShapeShift trades?
   */
  iotaSupportsNativeShapeShift(): boolean;

  /**
   * Returns a list of bip32 paths for a given account index in preferred order
   * from most to least preferred.
   *
   * Note that this is the location of the Iota address in the tree, not the
   * location of its corresponding xpub.
   */
   iotaGetAccountPaths(msg: IotaGetAccountPath): Array<IotaAccountPath>;

  /**
   * Does the device support spending from the combined accounts?
   * The list is assumed to contain unique entries.
   */
  iotaIsSameAccount(msg: Array<IotaAccountPath>): boolean;

  /**
   * Returns the "next" account path, if any.
   */
  iotaNextAccountPath(msg: IotaAccountPath): IotaAccountPath | undefined;
}

export interface IotaWallet extends IotaWalletInfo, HDWallet {
  readonly _supportsIota: boolean;

  iotaGetAddress(msg: IotaGetAddress): Promise<string | null>;
  iotaSignTx(msg: IotaSignTx): Promise<IotaSignedTx | null>;
  //iotaSignMessage(msg: IotaSignMessage): Promise<IotaSignedMessage | null>;
  //iotaVerifyMessage(msg: IotaVerifyMessage): Promise<boolean | null>;
}

export function iotaDescribePath(path: BIP32Path): PathDescription {
  let pathStr = addressNListToBIP32(path);
  let unknown: PathDescription = {
    verbose: pathStr,
    coin: "Iota",
    isKnown: false,
  };

  if (path.length !== 5) return unknown;

  if (path[0] !== 0x80000000 + 44) return unknown;

  if (path[1] !== 0x80000000 + slip44ByCoin("Iota")) return unknown;

  if ((path[2] & 0x80000000) >>> 0 !== 0x80000000) return unknown;

  if (path[3] !== 0) return unknown;

  if (path[4] !== 0) return unknown;

  let index = path[2] & 0x7fffffff;
  return {
    verbose: `Iota Account #${index}`,
    accountIdx: index,
    wholeAccount: true,
    coin: "Iota",
    isKnown: true,
    isPrefork: false,
  };
}
