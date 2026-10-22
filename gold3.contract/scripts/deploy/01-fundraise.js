// Deploys the Gold3Fundraise proxy. Depends on: USDT_ADDRESS. Writes
// FUNDRAISE_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the
// ProxyAdmin. A fresh proxy is OPEN (closed = false, every limit 0):
// run config/02-fundraise-close.js right after.
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
    if (!usdt || !ethers.isAddress(usdt)) {
        throw new Error(`invalid or missing ${network.name}.USDT_ADDRESS: ${usdt} (fill config/addresses.json)`);
    }
    console.log(`usdt:     ${usdt}`);

    // Refuse to replace a live proxy: a second one would split the raised
    // funds and the records in two. To redeploy on purpose, clear the key.
    const existing = addresses.FUNDRAISE_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.FUNDRAISE_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("Gold3Fundraise");
    console.log("deploying Gold3Fundraise (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [usdt], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`Gold3Fundraise proxy: ${proxyAddress}`);
    console.log(`Gold3Fundraise impl:  ${impl}`);

    await updateAddress(network.name, "FUNDRAISE_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
