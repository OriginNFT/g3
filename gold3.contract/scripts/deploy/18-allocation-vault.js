// Deploys the AllocationVault proxy. It holds no GG until
// GGToken.mintAllocation (config). Depends on: GG_ADDRESS, INSURANCE_TREASURY_ADDRESS, EMISSION_CONTROLLER_ADDRESS.
// Writes ALLOCATION_VAULT_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    const gg = addresses.GG_ADDRESS;
    if (!gg || !ethers.isAddress(gg) || gg === ZERO) {
        throw new Error(`invalid or missing ${network.name}.GG_ADDRESS: ${gg} (run deploy/10-gg-token.js first)`);
    }
    console.log(`GG_ADDRESS: ${gg}`);

    const insuranceTreasury = addresses.INSURANCE_TREASURY_ADDRESS;
    if (!insuranceTreasury || !ethers.isAddress(insuranceTreasury) || insuranceTreasury === ZERO) {
        throw new Error(`invalid or missing ${network.name}.INSURANCE_TREASURY_ADDRESS: ${insuranceTreasury} (run deploy/11-insurance-treasury.js first)`);
    }
    console.log(`INSURANCE_TREASURY_ADDRESS: ${insuranceTreasury}`);

    const emissionController = addresses.EMISSION_CONTROLLER_ADDRESS;
    if (!emissionController || !ethers.isAddress(emissionController) || emissionController === ZERO) {
        throw new Error(`invalid or missing ${network.name}.EMISSION_CONTROLLER_ADDRESS: ${emissionController} (run deploy/15-emission-controller.js first)`);
    }
    console.log(`EMISSION_CONTROLLER_ADDRESS: ${emissionController}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.ALLOCATION_VAULT_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.ALLOCATION_VAULT_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("AllocationVault");
    console.log("deploying AllocationVault (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [gg, insuranceTreasury, emissionController], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`AllocationVault proxy: ${proxyAddress}`);
    console.log(`AllocationVault impl:  ${impl}`);

    await updateAddress(network.name, "ALLOCATION_VAULT_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
