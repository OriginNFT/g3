// Deploys the OracleAdapter proxy with a 1800s TWAP window. Pairs are set
// afterwards with setPair (config). Depends on: USDT_ADDRESS, GG_ADDRESS.
// Writes ORACLE_ADAPTER_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
const { ethers, upgrades, network } = require("hardhat");
const { allAddress, updateAddress } = require("../utils/config");

const ZERO = "0x0000000000000000000000000000000000000000";
const TWAP_WINDOW_SECONDS = 1800;

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

    const gg = addresses.GG_ADDRESS;
    if (!gg || !ethers.isAddress(gg) || gg === ZERO) {
        throw new Error(`invalid or missing ${network.name}.GG_ADDRESS: ${gg} (run deploy/10-gg-token.js first)`);
    }
    console.log(`GG_ADDRESS: ${gg}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.ORACLE_ADAPTER_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.ORACLE_ADAPTER_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("OracleAdapter");
    console.log("deploying OracleAdapter (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [usdt, gg, TWAP_WINDOW_SECONDS], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`OracleAdapter proxy: ${proxyAddress}`);
    console.log(`OracleAdapter impl:  ${impl}`);

    await updateAddress(network.name, "ORACLE_ADAPTER_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
