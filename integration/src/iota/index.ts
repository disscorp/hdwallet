import * as core from "@shapeshiftoss/hdwallet-core";

import { iotaTests as tests } from "./iota";

export function iotaTests(get: () => { wallet: core.HDWallet; info: core.HDWalletInfo }): void {
  tests(get);
}
