import * as core from "@shapeshiftoss/hdwallet-core";

import { BTCScriptType } from "./bitcoin";
import * as Isolation from "./crypto/isolation";
import { getNetwork } from "./networks";

export async function getKeyPair(
  node: Isolation.Core.BIP32.Node,
  addressNList: number[],
  coin: core.Coin,
  scriptType?: BTCScriptType
): Promise<Isolation.Adapters.BIP32>;

export async function getKeyPair(
  node: Isolation.Core.SLIP10.Node,
  addressNList: number[],
  coin: core.Coin,
  scriptType?: BTCScriptType
): Promise<Isolation.Adapters.SLIP10>;

export async function getKeyPair(
  node: Isolation.Core.BIP32.Node | Isolation.Core.SLIP10.Node,
  addressNList: number[],
  coin: core.Coin,
  scriptType?: BTCScriptType
): Promise<any> {

  if('isBIP32' in node){
    const network = getNetwork(coin, scriptType);
    const wallet = await Isolation.Adapters.BIP32.create(node, network);
    const path = core.addressNListToBIP32(addressNList);
    return await wallet.derivePath(path);
  }else if('isSLIP10' in node) {
    const wallet = await Isolation.Adapters.SLIP10.create(node);
    const path = core.addressNListToSLIP10(addressNList);
    return await wallet.derivePath(path);
  }else{
    throw('Unexpected crypto node type');
  }
}
