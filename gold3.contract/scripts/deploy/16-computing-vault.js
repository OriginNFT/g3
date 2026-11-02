// Deploys the ComputingVault proxy. Depends on: USDT_ADDRESS, GOT2_ADDRESS, GG_ADDRESS, ORACLE_ADAPTER_ADDRESS, RESERVE_VAULT_ADDRESS, PROTECTION_VAULT_ADDRESS, EMISSION_CONTROLLER_ADDRESS.
// Writes COMPUTING_VAULT_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
const { ethers, upgrades, network } = require("hardhat");
const { allAddress, updateAddress } = require("../utils/config");

const ZERO = "0x0000000000000000000000000000000000000000";

async function main() {
    const addresses = await allAddress(network.name);

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`network:  ${network.name}`);
    console.log(`deployer: ${deployer.address}`);
    console.log(`balance:  ${ethers.formatEther(balance)}`);

    const usdt = addresses.USDT_ADDRESS;
    if (!usdt || !ethers.isAddress(usdt) || usdt === ZERO) {
        throw new Error(`invalid or missing ${network.name}.USDT_ADDRESS: ${usdt} (fill config/addresses.json)`);
    }
    console.log(`USDT_ADDRESS: ${usdt}`);

    const got2 = addresses.GOT2_ADDRESS;
    if (!got2 || !ethers.isAddress(got2) || got2 === ZERO) {
        throw new Error(`invalid or missing ${network.name}.GOT2_ADDRESS: ${got2} (fill config/addresses.json)`);
    }
    console.log(`GOT2_ADDRESS: ${got2}`);

    const gg = addresses.GG_ADDRESS;
    if (!gg || !ethers.isAddress(gg) || gg === ZERO) {
        throw new Error(`invalid or missing ${network.name}.GG_ADDRESS: ${gg} (run deploy/10-gg-token.js first)`);
    }
    console.log(`GG_ADDRESS: ${gg}`);

    const oracleAdapter = addresses.ORACLE_ADAPTER_ADDRESS;
    if (!oracleAdapter || !ethers.isAddress(oracleAdapter) || oracleAdapter === ZERO) {
        throw new Error(`invalid or missing ${network.name}.ORACLE_ADAPTER_ADDRESS: ${oracleAdapter} (run deploy/12-oracle-adapter.js first)`);
    }
    console.log(`ORACLE_ADAPTER_ADDRESS: ${oracleAdapter}`);

    const reserveVault = addresses.RESERVE_VAULT_ADDRESS;
    if (!reserveVault || !ethers.isAddress(reserveVault) || reserveVault === ZERO) {
        throw new Error(`invalid or missing ${network.name}.RESERVE_VAULT_ADDRESS: ${reserveVault} (run deploy/13-reserve-vault.js first)`);
    }
    console.log(`RESERVE_VAULT_ADDRESS: ${reserveVault}`);

    const protectionVault = addresses.PROTECTION_VAULT_ADDRESS;
    if (!protectionVault || !ethers.isAddress(protectionVault) || protectionVault === ZERO) {
        throw new Error(`invalid or missing ${network.name}.PROTECTION_VAULT_ADDRESS: ${protectionVault} (run deploy/14-protection-vault.js first)`);
    }
    console.log(`PROTECTION_VAULT_ADDRESS: ${protectionVault}`);

    const emissionController = addresses.EMISSION_CONTROLLER_ADDRESS;
    if (!emissionController || !ethers.isAddress(emissionController) || emissionController === ZERO) {
        throw new Error(`invalid or missing ${network.name}.EMISSION_CONTROLLER_ADDRESS: ${emissionController} (run deploy/15-emission-controller.js first)`);
    }
    console.log(`EMISSION_CONTROLLER_ADDRESS: ${emissionController}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.COMPUTING_VAULT_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.COMPUTING_VAULT_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("ComputingVault");
    console.log("deploying ComputingVault (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [usdt, got2, gg, oracleAdapter, reserveVault, protectionVault, emissionController], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`ComputingVault proxy: ${proxyAddress}`);
    console.log(`ComputingVault impl:  ${impl}`);

    await updateAddress(network.name, "COMPUTING_VAULT_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
