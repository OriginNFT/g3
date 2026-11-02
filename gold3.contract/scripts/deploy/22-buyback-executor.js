// Deploys the BuybackExecutor proxy. Paths / caps / slippage are set
// afterwards (config). Depends on: UNISWAP_ROUTER_ADDRESS, ORACLE_ADAPTER_ADDRESS, GOT2_ADDRESS, GG_ADDRESS, AUG_ADDRESS.
// Writes BUYBACK_EXECUTOR_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    const uniswapRouter = addresses.UNISWAP_ROUTER_ADDRESS;
    if (!uniswapRouter || !ethers.isAddress(uniswapRouter) || uniswapRouter === ZERO) {
        throw new Error(`invalid or missing ${network.name}.UNISWAP_ROUTER_ADDRESS: ${uniswapRouter} (fill config/addresses.json)`);
    }
    console.log(`UNISWAP_ROUTER_ADDRESS: ${uniswapRouter}`);

    const oracleAdapter = addresses.ORACLE_ADAPTER_ADDRESS;
    if (!oracleAdapter || !ethers.isAddress(oracleAdapter) || oracleAdapter === ZERO) {
        throw new Error(`invalid or missing ${network.name}.ORACLE_ADAPTER_ADDRESS: ${oracleAdapter} (run deploy/12-oracle-adapter.js first)`);
    }
    console.log(`ORACLE_ADAPTER_ADDRESS: ${oracleAdapter}`);

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

    const aug = addresses.AUG_ADDRESS;
    if (!aug || !ethers.isAddress(aug) || aug === ZERO) {
        throw new Error(`invalid or missing ${network.name}.AUG_ADDRESS: ${aug} (fill config/addresses.json)`);
    }
    console.log(`AUG_ADDRESS: ${aug}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.BUYBACK_EXECUTOR_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.BUYBACK_EXECUTOR_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("BuybackExecutor");
    console.log("deploying BuybackExecutor (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [uniswapRouter, oracleAdapter, got2, gg, aug], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`BuybackExecutor proxy: ${proxyAddress}`);
    console.log(`BuybackExecutor impl:  ${impl}`);

    await updateAddress(network.name, "BUYBACK_EXECUTOR_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
