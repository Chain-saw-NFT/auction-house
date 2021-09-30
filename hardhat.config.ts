import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-typechain";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter"

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
  
  gasReporter: {
    currency: 'USD',
    gasPrice: 100
  }
  
};
