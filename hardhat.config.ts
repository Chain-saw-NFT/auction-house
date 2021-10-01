import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-typechain";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter"
import 'hardhat-abi-exporter';


  

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: {
    compilers: [
      {
        version: "0.8.7",
      },
      {
        version: "0.8.0",
      }
    ],
  },
  abiExporter: {
    path: './artifacts/data/abi',
    clear: true,
    flat: true,
    spacing: 2,
    pretty: true,
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  }
  
};
