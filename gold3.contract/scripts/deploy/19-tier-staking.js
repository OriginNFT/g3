// Deploys the TierStaking proxy. Depends on: GG_ADDRESS, ORACLE_ADAPTER_ADDRESS, COMMUNITY_ENGINE_ADDRESS.
// Writes TIER_STAKING_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    const oracleAdapter = addresses.ORACLE_ADAPTER_ADDRESS;
    if (!oracleAdapter || !ethers.isAddress(oracleAdapter) || oracleAdapter === ZERO) {
        throw new Error(`invalid or missing ${network.name}.ORACLE_ADAPTER_ADDRESS: ${oracleAdapter} (run deploy/12-oracle-adapter.js first)`);
    }
    console.log(`ORACLE_ADAPTER_ADDRESS: ${oracleAdapter}`);

    const communityEngine = addresses.COMMUNITY_ENGINE_ADDRESS;
    if (!communityEngine || !ethers.isAddress(communityEngine) || communityEngine === ZERO) {
        throw new Error(`invalid or missing ${network.name}.COMMUNITY_ENGINE_ADDRESS: ${communityEngine} (run deploy/17-community-engine.js first)`);
    }
    console.log(`COMMUNITY_ENGINE_ADDRESS: ${communityEngine}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.TIER_STAKING_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.TIER_STAKING_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("TierStaking");
    console.log("deploying TierStaking (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [gg, oracleAdapter, communityEngine], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`TierStaking proxy: ${proxyAddress}`);
    console.log(`TierStaking impl:  ${impl}`);

    await updateAddress(network.name, "TIER_STAKING_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
