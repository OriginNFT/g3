// Deploys the GGToken proxy: "Lambda Token" / LT, no supply yet. Depends on nothing.
// Supply is minted to AllocationVault by config/mintAllocation after
// deploy/18-allocation-vault.js. Depends on: nothing.
// Writes GG_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.GG_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.GG_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("GGToken");
    console.log("deploying GGToken (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, ["Lambda Token", "LT"], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`GGToken proxy: ${proxyAddress}`);
    console.log(`GGToken impl:  ${impl}`);

    await updateAddress(network.name, "GG_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
