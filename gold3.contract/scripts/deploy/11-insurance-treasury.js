// Deploys the InsuranceTreasury proxy. Depends on: GG_ADDRESS.
// Writes INSURANCE_TREASURY_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.INSURANCE_TREASURY_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.INSURANCE_TREASURY_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("InsuranceTreasury");
    console.log("deploying InsuranceTreasury (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [gg], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`InsuranceTreasury proxy: ${proxyAddress}`);
    console.log(`InsuranceTreasury impl:  ${impl}`);

    await updateAddress(network.name, "INSURANCE_TREASURY_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
