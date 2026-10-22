require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

module.exports = {
  solidity: {
    // evmVersion pinned to shanghai: anubis does not run cancun. That is also
    // why OpenZeppelin is pinned to ~5.4.0 (5.5+ uses MCOPY).
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "shanghai",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      loggingEnabled: true,
      hardfork: "shanghai",
      gasPrice: "auto",
      initialBaseFeePerGas: 0,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY, process.env.ADMIN_PRIVATE_KEY].filter(Boolean),
    },
    anubis: {
      url: "https://rpc2.anubispace.org",
      chainId: 6714,
      gasPrice: 12000000000, // 12 gwei
      timeout: 60000000,
      accounts: [process.env.PRIVATE_KEY, process.env.ADMIN_PRIVATE_KEY].filter(Boolean),
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
