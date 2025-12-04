// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Game2048Module", (m) => {

  const game2048 = m.contract("Game2048");

  return { game2048 };
});
