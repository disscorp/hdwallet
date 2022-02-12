import * as core from "@shapeshiftoss/hdwallet-core";
import * as metamask from "@shapeshiftoss/hdwallet-metamask";

export function name(): string {
  return "MetaMask";
}

export function createInfo(): core.HDWalletInfo {
  return metamask.info();
}

export async function createWallet(): Promise<core.HDWallet> {
  const keyring = new core.Keyring();
  const adapter = metamask.MetaMaskAdapter.useKeyring(keyring);
  const wallet = await adapter.pairDevice()
  return wallet;
}

export function selfTest(get: () => core.HDWallet): void {
  let wallet: metamask.MetaMaskHDWallet;

  beforeAll(async () => {
    let w = get() as metamask.MetaMaskHDWallet;

    if (metamask.isMetaMask(w) && !core.supportsBTC(w) && core.supportsETH(w)) {
      wallet = w;
    } else {
      fail("Wallet is not a MetaMask");
    }
  });

  it("supports Ethereum mainnet", async () => {
    if (!wallet) return;
    expect(await wallet.ethSupportsNetwork()).toEqual(true);
  });

  it("does not support BTC", async () => {
    if (!wallet) return;
    expect(core.supportsBTC(wallet)).toBe(false);
  });

  it("does not support Native ShapeShift", async () => {
    if (!wallet) return;
    expect(wallet.ethSupportsNativeShapeShift()).toEqual(false);
  });

  it("does not support EIP1559", async () => {
    if (!wallet) return;
    expect(await wallet.ethSupportsEIP1559()).toEqual(false);
  });

  it("does not support Secure Transfer", async () => {
    if (!wallet) return;
    expect(await wallet.ethSupportsSecureTransfer()).toEqual(false);
  });

  it("uses correct eth bip44 paths", () => {
    if (!wallet) return;
    [0, 1, 3, 27].forEach((account) => {
      let paths = wallet.ethGetAccountPaths({
        coin: "Ethereum",
        accountIdx: account,
      });
      expect(paths).toEqual([
        {
          addressNList: core.bip32ToAddressNList(`m/44'/60'/${account}'/0/0`),
          hardenedPath: core.bip32ToAddressNList(`m/44'/60'/${account}'`),
          relPath: [0, 0],
          description: "MetaMask",
        },
      ]);
      paths.forEach((path) => {
        expect(
          wallet.describePath({
            coin: "Ethereum",
            path: path.addressNList,
          }).isKnown
        ).toBeTruthy();
      });
    });
  });

  it("can describe ETH paths", () => {
    if (!wallet) return;
    expect(
      wallet.describePath({
        path: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
        coin: "Ethereum",
      })
    ).toEqual({
      verbose: "Ethereum Account #0",
      coin: "Ethereum",
      isKnown: true,
      accountIdx: 0,
      wholeAccount: true,
    });

    expect(
      wallet.describePath({
        path: core.bip32ToAddressNList("m/44'/60'/3'/0/0"),
        coin: "Ethereum",
      })
    ).toEqual({
      verbose: "Ethereum Account #3",
      coin: "Ethereum",
      isKnown: true,
      accountIdx: 3,
      wholeAccount: true,
    });

    expect(
      wallet.describePath({
        path: core.bip32ToAddressNList("m/44'/60'/0'/0/3"),
        coin: "Ethereum",
      })
    ).toEqual({
      verbose: "m/44'/60'/0'/0/3",
      coin: "Ethereum",
      isKnown: false,
    });
  });

  it('should return a valid ETH address', async () => {
    if (!wallet) return;
    expect(
      await wallet.ethGetAddress({
        addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
        showDisplay: false,
      })
    ).toEqual("0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8");
  })

  it('should sign a message', async () => {
    if (!wallet) return;
    let res = await wallet.ethSignMessage({
      addressNList: core.bip32ToAddressNList("m/44'/60'/0'/0/0"),
      message: "Hello World",
    });
    expect(res?.address).toEqual("0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8");
    expect(res?.signature).toEqual(
      "0x29f7212ecc1c76cea81174af267b67506f754ea8c73f144afa900a0d85b24b21319621aeb062903e856352f38305710190869c3ce5a1425d65ef4fa558d0fc251b"
    );
  });
}
