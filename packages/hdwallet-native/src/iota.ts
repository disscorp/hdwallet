import * as core from "@shapeshiftoss/hdwallet-core";

import * as IotaCryptoJs from "@iota/crypto.js";

import { ClientBuilder as IotaClientBuilder } from 'C:\\Users\\mrb00\\OneDrive\\Documentos\\iota\\disscorp.iotars\\bindings\\nodejs';


import * as Isolation from "./crypto/isolation";
import { NativeHDWalletBase } from "./native";
import * as util from "./util";
import { PreparedTransactionData, UnlockBlock, TransactionPayload, TransactionPayloadEssence } from "@iota/client/lib/types";

type UtxoData = Buffer;

type InputData = UtxoData;

const supportedCoins = ["iota"];

export function MixinNativeIotaWalletInfo<TBase extends core.Constructor<core.HDWalletInfo>>(Base: TBase) {
  return class MixinNativeIotaWalletInfo extends Base implements core.IotaWalletInfo {
    readonly _supportsIotaInfo = true;

    iotaSupportsCoinSync(coin: core.Coin): boolean {
      return supportedCoins.includes(String(coin).toLowerCase());
    }

    async iotaSupportsCoin(coin: core.Coin): Promise<boolean> {
      return this.iotaSupportsCoinSync(coin);
    }

    async iotaSupportsSecureTransfer(): Promise<boolean> {
      return false;
    }

    iotaSupportsNativeShapeShift(): boolean {
      return false;
    }

    iotaGetAccountPaths(msg: core.IotaGetAccountPath): Array<core.IotaAccountPath> {
      const slip44 = core.slip44ByCoin(msg.coin);
      if (slip44 === undefined) return [];
      return [
        {
          coin: "Iota",
          addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0x80000000 + 0, 0x80000000 + 0],
        },
      ];
    }

    iotaIsSameAccount(msg: Array<core.IotaAccountPath>): boolean {
      // TODO: support at some point
      return false;
    }

    iotaNextAccountPath(msg: core.IotaAccountPath): core.IotaAccountPath | undefined {
      const description = core.iotaDescribePath(msg.addressNList, msg.coin);

      if (!description.isKnown) {
        return undefined;
      }

      let addressNList = msg.addressNList;

      if (
        (addressNList[0] === 0x80000000 + 44)
      ) {
        addressNList[2] += 1;
        return {
          ...msg,
          addressNList,
        };
      }

      return undefined;
    }
  };
}

export function MixinNativeIotaWallet<TBase extends core.Constructor<NativeHDWalletBase>>(Base: TBase) {
  return class MixinNativeIotaWallet extends Base {
    readonly _supportsIota = true;

    #masterKey: Isolation.Core.SLIP10.Node | undefined;

    async iotaInitializeWallet(masterKey: Isolation.Core.SLIP10.Node): Promise<void> {
      this.#masterKey = masterKey;
    }

    iotaWipe(): void {
      this.#masterKey = undefined;
    }

    async iotaGetAddress(msg: core.IotaGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        const { addressNList, coin } = msg;
        const keyPair = await util.getKeyPair(this.#masterKey!, addressNList, coin);
        
        const hash = IotaCryptoJs.Blake2b.sum256(keyPair.publicKey);
        const version = new Uint8Array([0]);
        const address = new Uint8Array([...version, ...hash]);      

        return IotaCryptoJs.Bech32.encode("iota", address);
      });
    }

    async iotaSignTx(msg: any): Promise<core.IotaSignedTx | null> {

      return this.needsMnemonic(!!this.#masterKey, async () => {

        const { data, coin, addressNList } = msg;
        const { inputs, outputs, payload } = data;

        const iotaClient = new IotaClientBuilder().offlineMode().build();
        //let tx_builder = iotaClient.message();

        //for(let input of inputs) tx_builder = tx_builder.input(input.transactionId!);
        //@ts-ignore
        //for(let output of outputs) tx_builder = tx_builder.output("iota1qqm2vyma0dzr4048nun6ldr9nlk0vt7arxe4t66qfpj4p4c8qzd9q6q0epm", output.amount);

        ///const preparedTransaction: PreparedTransactionData = await tx_builder.prepareTransaction();

        const transactionPayloadEssence = {
          type: "Regular",
          data: {
            inputs,
            outputs,
            payload,
          }
        };

        const unlockBlocks: UnlockBlock[] = new Array();

        for(let input of inputs) {
          const keyPair = await util.getKeyPair(this.#masterKey!, addressNList, coin);
          //@ts-ignore
          const unlockBlock: UnlockBlock = await iotaClient.message().externalSignTransaction(transactionPayloadEssence, keyPair.node);
          unlockBlocks.push(unlockBlock);
        };

        
        const signed_transaction = {
          type: 0,
          essence: {type:0, ...transactionPayloadEssence.data},
          unlockBlocks: unlockBlocks
        } as TransactionPayload;

        return signed_transaction;
      });
    }

  };
}
