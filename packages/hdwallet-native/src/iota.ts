import * as core from "@shapeshiftoss/hdwallet-core";

import * as IotaCryptoJs from "@iota/crypto.js";

import * as IotaClientJs from "@iota/client";

import * as Isolation from "./crypto/isolation";
import { NativeHDWalletBase } from "./native";
import * as util from "./util";

type UtxoData = Buffer;

type InputData = UtxoData;

export function MixinNativeIotaWalletInfo<TBase extends core.Constructor<core.HDWalletInfo>>(Base: TBase) {
  return class MixinNativeIotaWalletInfo extends Base implements core.IotaWalletInfo {
    readonly _supportsIotaInfo = true;

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
          addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
          hardenedPath: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
          relPath: [0, 0],
          description: "Native",
        },
      ];
    }

    iotaIsSameAccount(msg: Array<core.IotaAccountPath>): boolean {
      // TODO: support at some point
      return false;
    }

    iotaNextAccountPath(msg: core.IotaAccountPath): core.IotaAccountPath | undefined {
      const description = core.iotaDescribePath(msg.addressNList);

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

    #masterKey: Isolation.Core.SLIP0010.Node | undefined;

    async iotaInitializeWallet(masterKey: Isolation.Core.SLIP0010.Node): Promise<void> {
      this.#masterKey = masterKey;
    }

    iotaWipe(): void {
      this.#masterKey = undefined;
    }

    async iotaGetAddress(msg: core.IotaGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        const { addressNList, coin } = msg;
        const keyPair = await util.SLIP0010getKeyPair(this.#masterKey!, addressNList, coin);
        
        const hash = IotaCryptoJs.Blake2b.sum256(keyPair.publicKey);
        const version = new Uint8Array([0]);
        const address = new Uint8Array([...version, ...hash]);      

        return IotaCryptoJs.Bech32.encode("iota", address);
      });
    }

    async iotaSignTx(msg: core.IotaSignTx): Promise<core.IotaSignedTx | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        const { coin, type, inputs, outputs, payload } = msg;

        const iotaClient = new IotaClientJs.ClientBuilder()
        .offlineMode()
        .build();

        const message = await iotaClient.message()
        .seed(this.#masterKey.)
        .output('atoi1qqydc70mpjdvl8l2wyseaseqwzhmedzzxrn4l9g2c8wdcsmhldz0ulwjxpz', 1000000)
        .submit();

        //IotaClientJs.MessageSender.
        return {
          signatures,
          serializedTx: tx.toHex(),
        };
      });
    }

  };
}
