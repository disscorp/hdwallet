import * as core from "@shapeshiftoss/hdwallet-core";

import { BTCScriptType } from "./bitcoin";
import { getNetwork } from "./networks";
import * as Isolation from "./crypto/isolation";

function isSeed(x: any): x is Isolation.Core.BIP32.Seed {
  return "toMasterKey" in x && typeof x.toMasterKey === "function"
}

export async function getKeyPair(
  node: Isolation.Core.BIP32.Node,
  addressNList: number[],
  coin: core.Coin,
  scriptType?: BTCScriptType,
): Promise<Isolation.Adapters.BIP32> {
  const network = getNetwork(coin, scriptType);
  const wallet = await Isolation.Adapters.BIP32.create(node, network);
  const path = core.addressNListToBIP32(addressNList);
  return await wallet.derivePath(path);
}

export async function SLIP0010getKeyPair(
  node: Isolation.Core.SLIP0010.Node,
  addressNList: number[],
  coin: core.Coin
): Promise<Isolation.Adapters.SLIP0010> {
  const wallet = await Isolation.Adapters.SLIP0010.create(node);
  const path = core.addressNListToSLIP10(addressNList);
  return await wallet.derivePath(path);
}

