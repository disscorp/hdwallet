import * as core from "@shapeshiftoss/hdwallet-core";
import * as ledger from "@shapeshiftoss/hdwallet-ledger";
import * as native from "@shapeshiftoss/hdwallet-native";

import { each } from "../utils";

const MNEMONIC12_NOPIN_NOPASSPHRASE = "approve adapt win push rookie trophy combine deny false local ribbon baby search dismiss tide ceiling bubble taxi express choose range amazing gate anchor";

const TIMEOUT = 60 * 1000;

function deepFreeze<T extends Record<string, unknown>>(object: T): T {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];

    if (value && typeof value === "object") {
      deepFreeze(value as Record<string, unknown>);
    }
  }
  return Object.freeze(object);
}

/**
 *  Main integration suite for testing IotaWallet implementations' Iota support.
 */
export function iotaTests(get: () => { wallet: core.HDWallet; info: core.HDWalletInfo }): void {
  let wallet: core.IotaWallet & core.HDWallet;
  let info: core.IotaWalletInfo;

  describe("Iota", () => {
    beforeAll(() => {
      const { wallet: w, info: i } = get();

      if (core.supportsIota(w)) {
        wallet = w;
        if (!core.infoIota(i)) {
          throw new Error("wallet info does not _supportsIotaInfo?");
        }
        info = i;
      }
    });

    beforeEach(async () => {
      if (!wallet) return;
      await wallet.wipe();
      await wallet.loadDevice({
        mnemonic: MNEMONIC12_NOPIN_NOPASSPHRASE,
        label: "test",
        skipChecksum: true,
      });
    }, TIMEOUT);

    test("isInitialized()", async () => {
      if (!wallet) return;
      expect(await wallet.isInitialized()).toBeTruthy();
    });

    /*
    test("getPublicKeys", async () => {
      if (!wallet || ledger.isLedger(wallet) || trezor.isTrezor(wallet) || portis.isPortis(wallet)) return;

      /* FIXME: Expected failure (trezor does not use scriptType in deriving public keys
          and ledger's dependency bitcoinjs-lib/src/crypto.js throws a mysterious TypeError
          in between mock transport calls.
       */
      /*
      expect(
        await wallet.getPublicKeys([
          {
            coin: "Iota",
            addressNList: core.bip32ToAddressNList(`m/44'/4218'/0'`),
            curve: "Curve25519",
          },
          {
            coin: "Iota",
            addressNList: core.bip32ToAddressNList(`m/0'/4218'/0'`),
            curve: "Curve25519",
            scriptType: core.BTCInputScriptType.SpendAddress,
          },
          {
            coin: "Iota",
            addressNList: core.bip32ToAddressNList(`m/0'/4218'/0'`),
            curve: "Curve25519",
            scriptType: core.BTCInputScriptType.SpendAddress,
          },
        ])
      ).toEqual([
        {
          xpub: "xpub",
        },
        {
          xpub: "xpub",
        },
        {
          xpub: "ypub",
        },

      ]);
    });
    */

    test(
      "iotaGetAddress()",
      async () => {
        if (!wallet) return;
        await each(
          [
            [
              "Show",
              "Iota",
              "m/44'/4218'/0'/0'/0'",
              "atoi1qr4tfcw8cm5z2tekfjddkmd3nzapc59h8dgev7hzxw2vt007kva77th52uq",
            ],
            [
              "Tell",
              "Iota",
              "m/44'/4218'/0'/0'/0'",
              "atoi1qr4tfcw8cm5z2tekfjddkmd3nzapc59h8dgev7hzxw2vt007kva77th52uq",
            ],
          ],
          async (args) => {
            let mode = args[0] as string;
            let coin = args[1] as core.Coin;
            let path = args[2] as string;
            let expected = args[3] as string;

            if (!(await wallet.iotaSupportsCoin(coin))) return;
            expect(await info.iotaSupportsCoin(coin)).toBeTruthy();
            let res = await wallet.iotaGetAddress({
              addressNList: core.slip10ToAddressNList(path),
              coin: coin,
              showDisplay: mode === "Show",
            });
            expect(res).toEqual(expected);
          }
        );
      },
      TIMEOUT
    );

    test(
      "iotaSignTx()",
      async () => {
        if (!wallet) return;
        if (ledger.isLedger(wallet)) return; // FIXME: Expected failure
        const tx: core.IotaTransactionPayloadEssence = {
          "type": 0,
          "inputs": [
            {
              "type": 0,
              "transactionId": "ed984d60b447c04c892138d33600b8f94ddb78e692b6ca402af83bce96fe3244",
              "transactionOutputIndex": 0
            }
          ],
          "outputs": [
            { 
              "type": 0, 
              "address": { 
                "type": 0, 
                "address": "bc20c67fbc956631c377b5632c7707c71bc23ef0c89b9f4ff4fdfcd41e75baff" 
              },
              "amount": 10000000
            }
          ], 
          "payload": { 
            "type": 2, 
            "index": Uint8Array.from(Buffer.from("66697265666c79", 'hex')), 
            "data": [] 
          }
        };
        const inputs: core.IotaSignTxInputBase[] = [
          {
            addressNList: core.bip32ToAddressNList("m/0"),
            "type": 0,
            "transactionId": "ed984d60b447c04c892138d33600b8f94ddb78e692b6ca402af83bce96fe3244",
            "transactionOutputIndex": 0
          },
        ];
        const outputs: core.IotaOutput[] = [
          { 
            "type": 0, 
            "address": { 
              "type": 0, 
              "address": "bc20c67fbc956631c377b5632c7707c71bc23ef0c89b9f4ff4fdfcd41e75baff" 
            },
            "amount": 10000000
          },
        ];
        let res = await wallet.iotaSignTx(
          deepFreeze({
            coin: "Iota",
            type: 0,
            inputs: inputs as core.IotaSignTxInputBase[],
            outputs,
          })
        );
        expect(res).toEqual({"type":0,"essence":{"type":0,"inputs":[{"type":0,"transactionId":"ed984d60b447c04c892138d33600b8f94ddb78e692b6ca402af83bce96fe3244","transactionOutputIndex":0}],"outputs":[{"type":0,"address":{"type":0,"address":"bc20c67fbc956631c377b5632c7707c71bc23ef0c89b9f4ff4fdfcd41e75baff"},"amount":10000000}],"payload":{"type":2,"index":"66697265666c79","data":""}},"unlockBlocks":[{"type":0,"signature":{"type":0,"publicKey":"78ffd31fb999208c3d2ebfdbaef3c8292fe1f6c8e122f6aaefdcee8729b77fde","signature":"25653d90d4f7a3dd1c9684a9d0e2eb3cdab7b08aee27a9febcbd9bdb7fca06110d77a611272ee8aa38e7fed7c926d685ea4f5b604c06aa4ba5df38da61f44508"}}]});
      },
      TIMEOUT
    );

    /*
    test(
      "btcSignTx() - thorchain swap",
      async () => {
        if (!wallet || portis.isPortis(wallet)) return;
        if (ledger.isLedger(wallet)) return; // FIXME: Expected failure
        if (trezor.isTrezor(wallet)) return; //TODO: Add trezor support for op return data passed at top level
        const tx: core.BitcoinTx = {
          version: 1,
          locktime: 0,
          vin: [
            {
              vout: 1,
              sequence: 4294967295,
              scriptSig: {
                hex: "483045022072ba61305fe7cb542d142b8f3299a7b10f9ea61f6ffaab5dca8142601869d53c0221009a8027ed79eb3b9bc13577ac2853269323434558528c6b6a7e542be46e7e9a820141047a2d177c0f3626fc68c53610b0270fa6156181f46586c679ba6a88b34c6f4874686390b4d92e5769fbb89c8050b984f4ec0b257a0e5c4ff8bd3b035a51709503",
              },
              txid: "c16a03f1cf8f99f6b5297ab614586cacec784c2d259af245909dedb0e39eddcf",
            },
            {
              vout: 1,
              sequence: 4294967295,
              scriptSig: {
                hex: "48304502200fd63adc8f6cb34359dc6cca9e5458d7ea50376cbd0a74514880735e6d1b8a4c0221008b6ead7fe5fbdab7319d6dfede3a0bc8e2a7c5b5a9301636d1de4aa31a3ee9b101410486ad608470d796236b003635718dfc07c0cac0cfc3bfc3079e4f491b0426f0676e6643a39198e8e7bdaffb94f4b49ea21baa107ec2e237368872836073668214",
              },
              txid: "1ae39a2f8d59670c8fc61179148a8e61e039d0d9e8ab08610cb69b4a19453eaf",
            },
          ],
          vout: [
            {
              value: "0.00390000",
              scriptPubKey: {
                hex: "76a91424a56db43cf6f2b02e838ea493f95d8d6047423188ac",
              },
            },
          ],
        };
        const inputs: core.BTCSignTxInputUnguarded[] = [
          {
            addressNList: core.bip32ToAddressNList("m/0"),
            scriptType: core.BTCInputScriptType.SpendAddress,
            amount: String(390000),
            vout: 0,
            txid: "d5f65ee80147b4bcc70b75e4bbf2d7382021b871bd8867ef8fa525ef50864882",
            tx,
            hex: "0100000002cfdd9ee3b0ed9d9045f29a252d4c78ecac6c5814b67a29b5f6998fcff1036ac1010000008b483045022072ba61305fe7cb542d142b8f3299a7b10f9ea61f6ffaab5dca8142601869d53c0221009a8027ed79eb3b9bc13577ac2853269323434558528c6b6a7e542be46e7e9a820141047a2d177c0f3626fc68c53610b0270fa6156181f46586c679ba6a88b34c6f4874686390b4d92e5769fbb89c8050b984f4ec0b257a0e5c4ff8bd3b035a51709503ffffffffaf3e45194a9bb60c6108abe8d9d039e0618e8a147911c68f0c67598d2f9ae31a010000008b48304502200fd63adc8f6cb34359dc6cca9e5458d7ea50376cbd0a74514880735e6d1b8a4c0221008b6ead7fe5fbdab7319d6dfede3a0bc8e2a7c5b5a9301636d1de4aa31a3ee9b101410486ad608470d796236b003635718dfc07c0cac0cfc3bfc3079e4f491b0426f0676e6643a39198e8e7bdaffb94f4b49ea21baa107ec2e237368872836073668214ffffffff0170f30500000000001976a91424a56db43cf6f2b02e838ea493f95d8d6047423188ac00000000",
          },
        ];
        let outputs: core.BTCSignTxOutput[] = [
          {
            address: "bc1qksxqxurvejkndenuv0alqawpr3e4vtqkn246cu",
            addressType: core.BTCOutputAddressType.Spend,
            amount: String(390000 - 10000),
            isChange: false,
          },
          {
            addressNList: core.bip32ToAddressNList("m/44'/0'/0'/0/0"),
            addressType: core.BTCOutputAddressType.Change,
            scriptType: core.BTCOutputScriptType.PayToAddress,
            amount: String(9000),
            isChange: true,
          },
        ];

        let res = await wallet.btcSignTx(
          deepFreeze({
            coin: "Bitcoin",
            inputs: inputs as core.BTCSignTxInput[],
            outputs,
            version: 1,
            locktime: 0,
            vaultAddress: "bc1qksxqxurvejkndenuv0alqawpr3e4vtqkn246cu",
            opReturnData: "SWAP:ETH.ETH:0x931D387731bBbC988B312206c74F77D004D6B84b:420",
          })
        );
        expect(res).toEqual({
          serializedTx:
            "010000000182488650ef25a58fef6788bd71b8212038d7f2bbe4750bc7bcb44701e85ef6d5000000006a47304402207eee02e732e17618c90f8fdcaf3da24e2cfe2fdd6e37094b73f225360029515002205c29f80efc0bc077fa63633ff9ce2c44e0f109f70221a91afb7c531cdbb6305c0121023230848585885f63803a0a8aecdd6538792d5c539215c91698e315bf0253b43dffffffff0360cc050000000000160014b40c03706cccad36e67c63fbf075c11c73562c1628230000000000001976a9149c9d21f47382762df3ad81391ee0964b28dd951788ac00000000000000003d6a3b535741503a4554482e4554483a3078393331443338373733316242624339383842333132323036633734463737443030344436423834623a34323000000000",
          signatures: [
            "304402207eee02e732e17618c90f8fdcaf3da24e2cfe2fdd6e37094b73f225360029515002205c29f80efc0bc077fa63633ff9ce2c44e0f109f70221a91afb7c531cdbb6305c",
          ],
        });
      },
      TIMEOUT
    );

    */

    /*

    test(
      "btcSignMessage()",
      async () => {
        if (!wallet) return;

        // not implemented for native
        if (native.isNative(wallet)) {
          return;
        }

        let res = wallet.btcSignMessage({
          addressNList: core.bip32ToAddressNList("m/44'/0'/0'/0/0"),
          coin: "Bitcoin",
          scriptType: core.BTCInputScriptType.SpendAddress,
          message: "Hello World",
        });

        // not implemented on portis
        if (portis.isPortis(wallet)) {
          await expect(res).rejects.toThrowError("not supported");
          return;
        }

        await expect(res).resolves.toEqual({
          address: "1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM",
          signature:
            "20a037c911044cd6c851b6508317d8892067b0b62074b2cf1c0df9abd4aa053a3c243ffdc37f64d7af2c857128eafc81947c380995596615e5dcc313a15f512cdd",
        });
      },
      TIMEOUT
    );

    test(
      "btcVerifyMessage() - good",
      async () => {
        if (!wallet) return;

        // not implemented for native
        if (native.isNative(wallet)) {
          return;
        }

        let res = await wallet.btcVerifyMessage({
          address: "1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM",
          coin: "Bitcoin",
          signature:
            "20a037c911044cd6c851b6508317d8892067b0b62074b2cf1c0df9abd4aa053a3c243ffdc37f64d7af2c857128eafc81947c380995596615e5dcc313a15f512cdd",
          message: "Hello World",
        });

        expect(res).toBeTruthy();
      },
      TIMEOUT
    );

    test(
      "btcVerifyMessage() - bad",
      async () => {
        if (!wallet) return;

        // not implemented for native
        if (native.isNative(wallet)) {
          return;
        }

        let res = await wallet.btcVerifyMessage({
          address: "1FH6ehAd5ZFXCM1cLGzHxK1s4dGdq1JusM",
          coin: "Bitcoin",
          signature:
            "20a037c911044cd6c851b6508317d8892067b0b62074b2cf1c0df9abd4aa053a3c243ffdc37f64d7af2c857128eafc81947c380995596615e5dcc313a15f512cdd",
          message: "Fake World",
        });

        expect(res).toBeFalsy();
      },
      TIMEOUT
    );

    */

    test(
      "iotaSupportsSecureTransfer()",
      async () => {
        if (!wallet) return;
        expect(typeof (await wallet.iotaSupportsSecureTransfer()) === typeof true).toBeTruthy();
        if (await wallet.iotaSupportsSecureTransfer()) {
          expect(await info.iotaSupportsSecureTransfer()).toBeTruthy();
        }
        // TODO: write a testcase that exercise secure transfer, if the wallet claims to support it.
      },
      TIMEOUT
    );

    test(
      "iotaSupportsNativeShapeShift()",
      async () => {
        if (!wallet) return;
        expect(typeof wallet.iotaSupportsNativeShapeShift() === typeof true);
        if (wallet.iotaSupportsNativeShapeShift()) {
          expect(info.iotaSupportsNativeShapeShift()).toBeTruthy();
        }
        // TODO: write a testcase that exercises native shapeshift, if the wallet claims to support it.
      },
      TIMEOUT
    );

    test(
      "iotaGetAccountPaths()",
      async () => {
        await each(
          [
            ["Iota", 0],
            ["Iota", 1],
            ["Iota", 3],
            ["Iota", 2],
          ],
          async (args) => {
            let coin = args[0] as core.Coin;
            let accountIdx = args[1] as number;
            if (!wallet) return;
            if (!(await wallet.iotaSupportsCoin(coin))) return;
            expect(await info.iotaSupportsCoin(coin)).toBeTruthy();
            let paths = wallet.iotaGetAccountPaths({
              coin: coin,
              accountIdx: accountIdx,
            });
            expect(paths.length > 0).toBeTruthy();
          }
        );
      },
      TIMEOUT
    );

    test(
      "iotaIsSameAccount()",
      async () => {
        if (!wallet) return;
        [0, 1, 9].forEach((idx) => {
          let paths = wallet.iotaGetAccountPaths({
            coin: "Iota",
            accountIdx: idx,
          });
          expect(typeof wallet.iotaIsSameAccount(paths) === typeof true).toBeTruthy();
          paths.forEach((path) => {
            expect(wallet.iotaNextAccountPath(path)).not.toBeUndefined();
          });
        });
      },
      TIMEOUT
    );
  });
}
