import { Payload, Ed25519Address } from "@iota/client/lib/types";
import * as core from "@shapeshiftoss/hdwallet-core";
import _ from "lodash";

import * as native from "./native";
//b/import * as Networks from "./networks";

const MNEMONIC = "all all all all all all all all all all all all";

const mswMock = require("mswMock")().startServer();
afterEach(() => expect(mswMock).not.toHaveBeenCalled());

const untouchable = require("untouchableMock");

function benchmarkTx(
  inPath: string,
  inTxId: string,
  inVout: number,
  //b/inAmount: string,
  inputExtra: object,

  outAddr: Ed25519Address,
  outAmount: number,
  outExtra: object = {},
  
  outPayload?: Payload,

): core.IotaSignTx {
  return {
    coin: "Iota",
    type: 0,
    inputs: [
      {
        addressNList: core.slip10ToAddressNList(inPath),
        //b/amount: inAmount,
        transactionOutputIndex: inVout,
        transactionId: inTxId,
        ...inputExtra,
      } as any,
    ],
    outputs: [
      {
        type: 0,
        address: outAddr,
        amount: outAmount,
      },
    ],
    ...outExtra,
    payload: outPayload
  };
}

// Funding Tx: https://explorer.iota.org/devnet/message/6564769ddc19ad8fd3340747b108be76c3c90d20fb887a2c88c825726bac72c9
// Spending Tx: https://explorer.iota.org/devnet/message/66746c3a24fc58635acfd6688c1c4dc85a1d8db3ace4b72d8dad7a3194707574
const BIP44_BENCHMARK_TX_INPUT_TXID = "6564769ddc19ad8fd3340747b108be76c3c90d20fb887a2c88c825726bac72c9";
const BIP44_BENCHMARK_TX_INPUT =
{"type":0,"essence":{"type":0,"inputs":[{"type":0,"transactionId":"ed984d60b447c04c892138d33600b8f94ddb78e692b6ca402af83bce96fe3244","transactionOutputIndex":0}],"outputs":[{"type":0,"address":{"type":0,"address":"bc20c67fbc956631c377b5632c7707c71bc23ef0c89b9f4ff4fdfcd41e75baff"},"amount":10000000}],"payload":{"type":2,"index":"66697265666c79","data":""}},"unlockBlocks":[{"type":0,"signature":{"type":0,"publicKey":"78ffd31fb999208c3d2ebfdbaef3c8292fe1f6c8e122f6aaefdcee8729b77fde","signature":"25653d90d4f7a3dd1c9684a9d0e2eb3cdab7b08aee27a9febcbd9bdb7fca06110d77a611272ee8aa38e7fed7c926d685ea4f5b604c06aa4ba5df38da61f44508"}}]};
const BIP44_BENCHMARK_TX_OUTPUT_ADDR = 
{ type: 0, address: "atoi1qz7zp3nlhj2kvvwrw76kxtrhqlr3hs377ryfh8607n7le4q7wka07fj6vc4" } as Ed25519Address;
const BIP44_BENCHMARK_TX_OUTPUT =
{"type":0,"essence":{"type":0,"inputs":[{"type":0,"transactionId":"6ef49d517f51a88d8be88d52d1249f357e407ba622c966c01cb8abe5adcbed42","transactionOutputIndex":0}],"outputs":[{"type":0,"address":{"type":0,"address":"331487ceac27b1dc538311ea7e7f238adfa3f1bcceb4e5bd5388d88f6822b590"},"amount":10000000}],"payload":{"type":2,"index":"66697265666c79","data":""}},"unlockBlocks":[{"type":0,"signature":{"type":0,"publicKey":"78ffd31fb999208c3d2ebfdbaef3c8292fe1f6c8e122f6aaefdcee8729b77fde","signature":"8caea8a4b1411b2c3c6a3cd8fed27d0dbb76ab3d1fe125acb12633b4c8c5050daccba0dcca7d07ef8dd3980975ff22665c25303ea838fdeb8713449c81eceb09"}}]};
const BIP44_BENCHMARK_TX_OUTPUT_SIG = BIP44_BENCHMARK_TX_OUTPUT.unlockBlocks[0].signature.signature;
const BIP44_BENCHMARK_TX = benchmarkTx(
  "m/44'/4218'/0'/0'/0'",
  BIP44_BENCHMARK_TX_INPUT_TXID,
  BIP44_BENCHMARK_TX_INPUT.essence.inputs[0].transactionOutputIndex,
  {},
  BIP44_BENCHMARK_TX_OUTPUT_ADDR,
  BIP44_BENCHMARK_TX_INPUT.essence.outputs[0].amount,
  {},
);

describe("NativeIotaWalletInfo", () => {
  const info = native.info();

  it("should return some static metadata", async () => {
    expect(await untouchable.call(info, "iotaSupportsSecureTransfer")).toBe(false);
    expect(untouchable.call(info, "iotaSupportsNativeShapeShift")).toBe(false);
  });

  it("should return some dynamic metadata", async () => {
  });

  it("should not do anything when iotaIsSameAccount is called", async () => {
    expect(untouchable.call(info, "iotaIsSameAccount", [])).toBe(false);
  });

  it.each([
    [
      "BIP44",
      "Iota",
      1337,
      [
        {
          coin: "Iota",
          addressNList: core.slip10ToAddressNList("m/44'/4218'/1337'/0'/0'"),
        },
      ],
    ],
  ])("should return the correct account paths for %s", (_, coin, accountIdx, out) => {
    expect(info.iotaGetAccountPaths({ coin, accountIdx })).toMatchObject(out);
  });

  it("should not return any account paths for a bad coin type", () => {
    expect(
      info.iotaGetAccountPaths({
        coin: "foobar",
        accountIdx: 0,
      })
    ).toMatchObject([]);
  });

  describe("iotaNextAccountPath", () => {
    it.each([
      ["BIP44", "Iota", "m/44'/4218'/0'", "m/44'/4218'/1'"],
      ["BIP44", "Iota", "m/44'/4218'/1337'", "m/44'/4218'/1338'"],
    ])("should work for %s", (_, coin, inPath, outPath) => {
      expect(
        info.iotaNextAccountPath({
          coin,
          addressNList: core.slip10ToAddressNList(inPath),
        })
      ).toMatchObject({
        coin,
        addressNList: core.slip10ToAddressNList(outPath),
      });
    });

    it.each([
      ["an unrecognized path", "Iota", "m/1337'/4218'/0'"],
      ["a lowercase coin name", "iota", "m/44'/4218'/0'"],
      ["a bad coin name", "foobar", "m/44'/4218'/0'"],
    ])("should not work for %s", (_, coin, path) => {
      expect(
        info.iotaNextAccountPath({
          coin,
          addressNList: core.slip10ToAddressNList(path),
        })
      ).toBeUndefined();
    });

  });
});

describe("NativeIotaWallet", () => {
  let wallet: native.NativeHDWallet;

  beforeEach(async () => {
    wallet = native.create({ deviceId: "native" });
    await wallet.loadDevice({ mnemonic: MNEMONIC, slip10: true });
    expect(await wallet.initialize()).toBe(true);
  });

  it.each([
    [
      "BIP44",
      "Iota",
      [
        //["m/44'/4218'/0'/0'/0'", "atoi1qz3p5yssesyegxqs4rvntxplm22xguujrt5wrr79vv93jxfts7at2axq048"],
        ["m/44'/4218'/0'/0'/0'", "iota1qz3p5yssesyegxqs4rvntxplm22xguujrt5wrr79vv93jxfts7at26g3w02"],
        //["m/44'/4218'/1337'/123'/4'", "atoi1qq9zg35egke0sjwpky07x4g45e9z98p3nft77207nryex00jyxugyrdassd"],
        ["m/44'/4218'/1337'/123'/4'", "iota1qq9zg35egke0sjwpky07x4g45e9z98p3nft77207nryex00jyxugyyrv32q"],
      ],
    ],
  ])("should generate correct %s addresses", async (_, coin, addrSpec) => {
    for (const [path, addr] of addrSpec) {
      expect(await wallet.iotaGetAddress({ coin, addressNList: core.slip10ToAddressNList(path) })).toBe(addr);
    }
  });

  it("should sign a BIP44 transaction correctly", async () => {
    const input = BIP44_BENCHMARK_TX;
    const out = await wallet.iotaSignTx(input);
    if('unlockBlocks' in out?.message.payload! && 
        typeof out?.message.payload!.unlockBlocks !== 'undefined' &&
        typeof out?.message.payload!.unlockBlocks[0].data !== 'number' &&
        'data' in out?.message.payload!.unlockBlocks[0].data)
        expect(out?.message.payload!.unlockBlocks[0].data.data.signature).toMatchObject([BIP44_BENCHMARK_TX_OUTPUT_SIG]);
    else
        fail("Unexpected return type");
    expect(JSON.stringify(out?.message.payload!)).toBe(JSON.stringify(BIP44_BENCHMARK_TX_OUTPUT));
  });

  /*

  it("should sign a BIP84 transaction with an OP_RETURN message correctly", async () => {
    const input = OP_RETURN_BENCHMARK_TX;
    const out = await wallet.btcSignTx(input);

    expect(out?.signatures).toMatchObject([OP_RETURN_BENCHMARK_TX_OUTPUT_SIG]);
    expect(out?.serializedTx).toBe(OP_RETURN_BENCHMARK_TX_OUTPUT);
  });

  it("should not sign a transaction without having the raw input transaction", async () => {
    const input = _.cloneDeep(BIP44_BENCHMARK_TX);
    delete (input.inputs[0] as any).hex;
    await expect(wallet.btcSignTx(input)).rejects.toThrowError("must provide prev rawTx");
  });

  it("should sign a transaction with a locktime correctly", async () => {
    const input = {
      locktime: 338841,
      ...BIP44_BENCHMARK_TX,
    };

    const locktimeBuf = Buffer.alloc(4);
    locktimeBuf.writeUInt32LE(input["locktime"]);
    const locktimeHex = locktimeBuf.toString("hex");

    const out = await wallet.btcSignTx(input);
    const sigHex =
      "3044022006e609c8a9bedb7088d46140ab5f54a1a2023bc49b44cdf8fa147a181974b39702203e159bd869d8ccc85468856d9165cfc5df1885a8d8f1ebeaaaa5b8211f6317af";
    expect(out?.signatures).toMatchObject([sigHex]);
    expect(out?.serializedTx).toBe(
      `${BIP44_BENCHMARK_TX_OUTPUT.slice(0, 86)}${sigHex}${BIP44_BENCHMARK_TX_OUTPUT.slice(-156, -8)}${locktimeHex}`
    );
  });

  it("should automatically set the output address for a transaction", async () => {
    const input = {
      ...BIP44_BENCHMARK_TX,
      outputs: [
        {
          addressNList: core.bip32ToAddressNList("m/44'/0'/0'/0/1"),
          scriptType: core.BTCOutputScriptType.PayToAddress,
          amount: "99000",
          isChange: false,
        },
      ],
    };

    const out = await wallet.btcSignTx(input as any);

    expect(out?.signatures[0]).toMatchInlineSnapshot(
      `"3045022100b5971b81e1da04beec2ebe58b909953119b57490581de23e55721832b70c361a022038478c5a5036026fab419ccdae380143b6f14c379186dafa2a7e04735808aa1f"`
    );
    expect(out?.serializedTx).toMatchInlineSnapshot(
      `"0100000001396559eb5d84715ac64b6833a6c3ab74d1a017a3fcb5719b33e22c01c1eb0e35000000006b483045022100b5971b81e1da04beec2ebe58b909953119b57490581de23e55721832b70c361a022038478c5a5036026fab419ccdae380143b6f14c379186dafa2a7e04735808aa1f012103c6d9cc725bb7e19c026df03bf693ee1171371a8eaf25f04b7a58f6befabcd38cffffffff01b8820100000000001976a91402eea9ab5f88d829c501760bec348a5baa55cf3888ac00000000"`
    );
  });

  it("should not automatically set the output address for a transaction requesting an invalid scriptType", async () => {
    const input = {
      ...BIP44_BENCHMARK_TX,
      outputs: [
        {
          addressNList: core.bip32ToAddressNList("m/44'/0'/0'/0/1"),
          scriptType: "foobar" as any,
          amount: "99000",
          isChange: false,
        },
      ],
    };

    await expect(wallet.btcSignTx(input as any)).rejects.toThrowError("failed to add output");
  });

  it("should not sign a transaction with the wrong key", async () => {
    const input = _.cloneDeep(BIP44_BENCHMARK_TX);
    input.inputs[0].addressNList = core.bip32ToAddressNList("m/44'/0'/1337'/123/4");

    await expect(wallet.btcSignTx(input as any)).rejects.toThrowError("Can not sign for this input");
  });

  it("doesn't support signing messages", async () => {
    await expect(
      wallet.btcSignMessage({
        coin: "Bitcoin",
        addressNList: core.bip32ToAddressNList("m/44'/0'/0'/0/0"),
        message: "foobar",
      })
    ).rejects.toThrowError("not implemented");
  });

  it("doesn't support verifying messages", async () => {
    await expect(
      wallet.btcVerifyMessage({
        coin: "Bitcoin",
        address: "1JAd7XCBzGudGpJQSDSfpmJhiygtLQWaGL",
        message: "foo",
        signature: "bar",
      })
    ).rejects.toThrowError("not implemented");
  });
  
  */
});
