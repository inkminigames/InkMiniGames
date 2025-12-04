require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: process.env.INK_SEPOLIA_RPC
      }
    },
    inkSepolia: {
      url: process.env.INK_SEPOLIA_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
    ink: {
      url: process.env.INK_RPC,
      accounts: [process.env.PRIVATE_KEY],
    }
  },
  etherscan: {
    apiKey: {
      inkSepolia: "no-api-key-needed",
      ink: "no-api-key-needed"
    },
    customChains: [
      {
        network: "inkSepolia",
        chainId: 763373,
        urls: {
          apiURL: "https://explorer-sepolia.inkonchain.com/api",
          browserURL: "https://explorer-sepolia.inkonchain.com"
        }
      },
      {
        network: "ink",
        chainId: 57073,
        urls: {
          apiURL: "https://explorer.inkonchain.com/api",
          browserURL: "https://explorer.inkonchain.com"
        }
      }
    ]
  }
};
