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

import {
  NodeInfoWrapper as IotaNodeInfoWrapper,
  NodeInfo as IotaNodeInfo,
  MessageMetadata as IotaMessageMetadata,
  OutputMetadata as IotaOutputMetadata,
  MilestoneMetadata as IotaMilestoneMetadata,
  MilestoneUTXOChanges as IotaMilestoneUTXOChanges,
  BrokerOptions as IotaBrokerOptions,
  AddressBalance as IotaAddressBalance,
  PreparedTransactionData as IotaPreparedTransactionData,
  AddressIndexRecorder as IotaAddressIndexRecorder,
  OutputResponse as IotaOutputResponse,
  Segment as IotaSegment} from "@iota/client/lib/types/models";

import * as ta from "type-assertions";
import { addressNListToSLIP10, slip44ByCoin } from "./utils";
import { SLIP10Path, Coin, ExchangeType, HDWallet, HDWalletInfo, PathDescription } from "./wallet";

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

export type {
  NodeInfoWrapper as IotaNodeInfoWrapper,
  NodeInfo as IotaNodeInfo,
  MessageMetadata as IotaMessageMetadata,
  OutputMetadata as IotaOutputMetadata,
  MilestoneMetadata as IotaMilestoneMetadata,
  MilestoneUTXOChanges as IotaMilestoneUTXOChanges,
  BrokerOptions as IotaBrokerOptions,
  AddressBalance as IotaAddressBalance,
  PreparedTransactionData as IotaPreparedTransactionData,
  AddressIndexRecorder as IotaAddressIndexRecorder,
  OutputResponse as IotaOutputResponse,
  Segment as IotaSegment} from "@iota/client/lib/types/models";

export type IotaGetAddress = {
  coin: Coin;
  addressNList: SLIP10Path;
  addressType?: number; // Ed25519Address.type: number
  showDisplay?: boolean;
};

export interface IotaGetAccountPath {
  coin: Coin;
  accountIdx: number;
};

export interface IotaAccountPath {
  coin: string,
  addressNList: SLIP10Path;
}

export type IotaSignTx = IotaTransactionPayloadEssence & { coin: string, addressNList: SLIP10Path };

export type IotaSignedTx = IotaTransactionPayload;

export interface IotaWalletInfo extends HDWalletInfo {
  readonly _supportsIotaInfo: boolean;

  /**
   * Does the device support the given UTXO coin?
   */
  iotaSupportsCoin(coin: Coin): Promise<boolean>;

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
   * Returns a list of slip10 paths for a given account index in preferred order
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

export function iotaDescribePath(path: SLIP10Path, coin: string): PathDescription {
  let pathStr = addressNListToSLIP10(path);
  let unknown: PathDescription = {
    verbose: pathStr,
    coin,
    isKnown: false,
  };

  if(coin !== "Iota") return unknown;

  if (path.length !== 3 && path.length !== 5) return unknown;

  if (path[0] !== 0x80000000 + 44) return unknown;

  if (path[1] !== 0x80000000 + slip44ByCoin("Iota")) return unknown;

  if ((path[2] & 0x80000000) >>> 0 !== 0x80000000) return unknown;

  //if (path[3] !== 0) return unknown;

  //if (path[4] !== 0) return unknown;

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
