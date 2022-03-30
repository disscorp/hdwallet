import * as core from "@shapeshiftoss/hdwallet-core";

import { ClientBuilder, MessageSender } from "@iota/client";

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

    #masterKey: Isolation.Core.BIP32.Node | undefined;

    async iotaInitializeWallet(masterKey: Isolation.Core.BIP32.Node): Promise<void> {
      this.#masterKey = masterKey;
    }

    iotaWipe(): void {
      this.#masterKey = undefined;
    }

    async iotaGetAddress(msg: core.IotaGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        const { addressNList, coin } = msg;
        const keyPair = await util.getKeyPair(this.#masterKey!, addressNList, coin);
        
        const iota_offline = new ClientBuilder().offlineMode().build();
        let addresses = await iota_offline
          .getAddresses(seed)
          .range(0, 10)
          .bech32Hrp("atoi")
          .get();
        
        const { address } = this.createPayment(keyPair.publicKey, scriptType, keyPair.network);
        if (!address) return null;
        return coin.toLowerCase() === "bitcoincash" ? bchAddr.toCashAddress(address) : address;
      });
    }

    async btcSignTx(msg: core.BTCSignTxNative): Promise<core.BTCSignedTx | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        const { coin, inputs, outputs, version, locktime } = msg;

        const psbt = new bitcoin.Psbt({ network: getNetwork(coin) });

        psbt.setVersion(version ?? 1);
        locktime && psbt.setLocktime(locktime);

        await Promise.all(inputs.map(async (input) => {
          try {
            const inputData = await this.buildInput(coin, input);

            psbt.addInput({
              hash: input.txid,
              index: input.vout,
              ...inputData,
            });
          } catch (e) {
            throw new Error(`failed to add input: ${e}`);
          }
        }));

        await Promise.all(outputs.map(async (output) => {
          try {
            const { amount } = output;

            let address: string;
            if (output.address !== undefined) {
              address = output.address;
            } else if (output.addressNList !== undefined) {
              const keyPair = await util.getKeyPair(this.#masterKey!, output.addressNList, coin, output.scriptType);
              const { publicKey, network } = keyPair;
              const payment = this.createPayment(publicKey, output.scriptType, network);
              if (!payment.address) throw new Error("could not get payment address");
              address = payment.address;
            } else {
              throw new Error("unsupported output type");
            }

            if (coin.toLowerCase() === "bitcoincash") {
              address = bchAddr.toLegacyAddress(address);
            }

            psbt.addOutput({ address, value: Number(amount) });
          } catch (e) {
            throw new Error(`failed to add output: ${e}`);
          }
        }));

        if (msg.opReturnData) {
          const data = Buffer.from(msg.opReturnData, "utf-8");
          const embed = bitcoin.payments.embed({ data: [data] });
          const script = embed.output;
          if (!script) throw new Error("unable to build OP_RETURN script");
          psbt.addOutput({ script, value: 0 });
        }

        await Promise.all(inputs.map(async (input, idx) => {
          try {
            const { addressNList, scriptType } = input;
            const keyPair = await util.getKeyPair(this.#masterKey!, addressNList, coin, scriptType);
            await psbt.signInputAsync(idx, keyPair);
          } catch (e) {
            throw new Error(`failed to sign input: ${e}`);
          }
        }));

        psbt.finalizeAllInputs();

        const tx = psbt.extractTransaction(true);

        // If this is a THORChain transaction, validate the vout ordering
        if (msg.vaultAddress && !this.validateVoutOrdering(msg, tx)) {
          throw new Error("Improper vout ordering for BTC Thorchain transaction");
        }

        const signatures = tx.ins.map((input) => {
          if (input.witness.length > 0) {
            return input.witness[0].toString("hex");
          } else {
            const sigLen = input.script[0];
            return input.script.slice(1, sigLen).toString("hex");
          }
        });

        return {
          signatures,
          serializedTx: tx.toHex(),
        };
      });
    }

    async btcSignMessage(msg: core.BTCSignMessage): Promise<core.BTCSignedMessage> {
      throw new Error("function not implemented");
    }

    async btcVerifyMessage(msg: core.BTCVerifyMessage): Promise<boolean> {
      throw new Error("function not implemented");
    }
  };
}
