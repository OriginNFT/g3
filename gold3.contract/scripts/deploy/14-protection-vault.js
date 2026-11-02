// Deploys the ProtectionVault proxy. Depends on: USDT_ADDRESS, UNISWAP_ROUTER_ADDRESS.
// Writes PROTECTION_VAULT_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    const uniswapRouter = addresses.UNISWAP_ROUTER_ADDRESS;
    if (!uniswapRouter || !ethers.isAddress(uniswapRouter) || uniswapRouter === ZERO) {
        throw new Error(`invalid or missing ${network.name}.UNISWAP_ROUTER_ADDRESS: ${uniswapRouter} (fill config/addresses.json)`);
    }
    console.log(`UNISWAP_ROUTER_ADDRESS: ${uniswapRouter}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.PROTECTION_VAULT_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.PROTECTION_VAULT_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("ProtectionVault");
    console.log("deploying ProtectionVault (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [usdt, uniswapRouter], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`ProtectionVault proxy: ${proxyAddress}`);
    console.log(`ProtectionVault impl:  ${impl}`);

    await updateAddress(network.name, "PROTECTION_VAULT_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
