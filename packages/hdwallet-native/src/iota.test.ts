import { Payload, Ed25519Address } from "@iota/client/lib/types";
import * as core from "@shapeshiftoss/hdwallet-core";
import _ from "lodash";

import * as native from "./native";
//b/import * as Networks from "./networks";

const MNEMONIC = "approve adapt win push rookie trophy combine deny false local ribbon baby search dismiss tide ceiling bubble taxi express choose range amazing gate anchor";

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

// Funding Tx: https://explorer.iota.org/devnet/message/eb6641fa27aa7b9bcd195c60bb7f257b3f9c433dd2ac76729090d5616e2842e4
// Spending Tx: https://explorer.iota.org/devnet/message/61d317a10c394860d402174533ad2cd6b37dd6e05f14b3e5c4739913c20eaa82
const BIP44_BENCHMARK_TX_INPUT_TXID = "9da05805399e4ac2fa080cd8a0ff1dae1f3419412e97e69e42dd71e7b77d94000000";//todo: fix bytes final 4
const BIP44_BENCHMARK_TX_INPUT =
{"type":0,"essence":{"type":0,"inputs":[{"type":0,"transactionId":"3ff2e6202dd14ceb3d3c15bc5a9aac153737ec3624ff7de8371a520e42b91b7d","transactionOutputIndex":1}],"outputs":[{"type":0,"address":{"type":0,"address":"c3e74fdd4175525fc3d6201ba0ffaf805cdfe1308ebe5afd6bca6f759293cb0a"},"amount":492957106483},{"type":0,"address":{"type":0,"address":"c88958b048c5232119c39b521ed1c2c5f65914adf127fea4311f6511948e3c9c"},"amount":3529437000},{"type":0,"address":{"type":0,"address":"eab4e1c7c6e8252f364c9adb6db198ba1c50b73b51967ae23394c5bdfeb33bef"},"amount":70000000}],"payload":null},"unlockBlocks":[{"type":0,"signature":{"type":0,"publicKey":"16d0ba34e7426678f8991f3044045023e2da636b5e3073ccd006bd46a0e051ad","signature":"3f706129be5945cc14291fb0a350c23ca496aee2e6d051e669576dd1afe702362a90e0426c7e25b9195a39b955b49eac9d4e42409aa6ef258be3b0f3cf2e300e"}}]};
const BIP44_BENCHMARK_TX_OUTPUT_ADDR = 
{ type: 0, address: "iota1qqm2vyma0dzr4048nun6ldr9nlk0vt7arxe4t66qfpj4p4c8qzd9q6q0epm" } as Ed25519Address;
const BIP44_BENCHMARK_TX_OUTPUT =
{"type":0,"essence":{"type":0,"inputs":[{"type":0,"transactionId":"eb6641fa27aa7b9bcd195c60bb7f257b3f9c433dd2ac76729090d5616e2842e4","transactionOutputIndex":2}],"outputs":[{"type":0,"address":{"type":0,"address":"36a6137d7b443abea79f27afb4659fecf62fdd19b355eb40486550d707009a50"},"amount":70000000}],"payload":{"type":2,"index":"66697265666c79","data":""}},"unlockBlocks":[{"type":0,"signature":{"type":0,"publicKey":"5a4cd5d6eb8d3e612fa2b0e7fdfd711b960a7b7529dc6e63d452c36e54460c7c","signature":"4a2d54e9af3c29160c901fcc5e4fa29464f15e22d697c0755183d54768a17a8caf3196c648ce91a8d75c85e08b915a407506d6bdb6d35ce13afe460b396dd905"}}]};
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
        ["m/44'/4218'/0'/0'/0'", "iota1qr4tfcw8cm5z2tekfjddkmd3nzapc59h8dgev7hzxw2vt007kva77ve9txd"],
        //["m/44'/4218'/1337'/123'/4'", "atoi1qq9zg35egke0sjwpky07x4g45e9z98p3nft77207nryex00jyxugyrdassd"],
        ["m/44'/4218'/1337'/123'/4'", "iota1qq3h5wrzappw9x9mvttmw6pv2e72yhkea4wmvukkfqk0aejf60neszd3qvd"],
      ],
    ],
  ])("should generate correct %s addresses", async (_, coin, addrSpec) => {
    for (const [path, addr] of addrSpec) {
      expect(await wallet.iotaGetAddress({ coin, addressNList: core.slip10ToAddressNList(path) })).toBe(addr);
    }
  });

  it("should sign a BIP44 transaction correctly", async () => {
    const input = BIP44_BENCHMARK_TX;
    const out: core.IotaSignedTx | null = await wallet.iotaSignTx(input);
    if(typeof out?.unlockBlocks !== 'undefined' &&
        typeof out?.unlockBlocks[0].data !== 'number' &&
        'data' in out?.unlockBlocks[0].data)
        expect(out?.unlockBlocks[0].data.data.signature).toMatchObject([BIP44_BENCHMARK_TX_OUTPUT_SIG]);
    else
        fail("Unexpected return type");
    expect(JSON.stringify(out)).toBe(JSON.stringify(BIP44_BENCHMARK_TX_OUTPUT));
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
