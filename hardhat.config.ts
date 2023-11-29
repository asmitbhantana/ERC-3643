import "@xyrusworx/hardhat-solidity-json";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";
import "@primitivefi/hardhat-dodoc";
import "hardhat-gas-reporter";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  defaultNetwork: "goerli",
  networks: {
    goerli: {
      gas: 120000000,
      blockGasLimit: 0x1fffffffffffff,
      url: "https://goerli.infura.io/v3/58bd24c840494b04b433c81913be117b",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;
