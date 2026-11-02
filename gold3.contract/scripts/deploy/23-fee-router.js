// Deploys the FeeRouter proxy. Destinations are fixed at initialize (no
// setter): LP_STAKE_VAULT_ADDRESS / ECO_RESERVE_ACCOUNT /
// COMMUNITY_BUILDING_ACCOUNT come from addresses.json. Depends on: BUYBACK_EXECUTOR_ADDRESS, LP_STAKE_VAULT_ADDRESS, ECO_RESERVE_ACCOUNT, COMMUNITY_BUILDING_ACCOUNT.
// Writes FEE_ROUTER_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    const buybackExecutor = addresses.BUYBACK_EXECUTOR_ADDRESS;
    if (!buybackExecutor || !ethers.isAddress(buybackExecutor) || buybackExecutor === ZERO) {
        throw new Error(`invalid or missing ${network.name}.BUYBACK_EXECUTOR_ADDRESS: ${buybackExecutor} (run deploy/22-buyback-executor.js first)`);
    }
    console.log(`BUYBACK_EXECUTOR_ADDRESS: ${buybackExecutor}`);

    const lpStakeVault = addresses.LP_STAKE_VAULT_ADDRESS;
    if (!lpStakeVault || !ethers.isAddress(lpStakeVault) || lpStakeVault === ZERO) {
        throw new Error(`invalid or missing ${network.name}.LP_STAKE_VAULT_ADDRESS: ${lpStakeVault} (fill config/addresses.json)`);
    }
    console.log(`LP_STAKE_VAULT_ADDRESS: ${lpStakeVault}`);

    const ecoReserve = addresses.ECO_RESERVE_ACCOUNT;
    if (!ecoReserve || !ethers.isAddress(ecoReserve) || ecoReserve === ZERO) {
        throw new Error(`invalid or missing ${network.name}.ECO_RESERVE_ACCOUNT: ${ecoReserve} (fill config/addresses.json)`);
    }
    console.log(`ECO_RESERVE_ACCOUNT: ${ecoReserve}`);

    const communityBuilding = addresses.COMMUNITY_BUILDING_ACCOUNT;
    if (!communityBuilding || !ethers.isAddress(communityBuilding) || communityBuilding === ZERO) {
        throw new Error(`invalid or missing ${network.name}.COMMUNITY_BUILDING_ACCOUNT: ${communityBuilding} (fill config/addresses.json)`);
    }
    console.log(`COMMUNITY_BUILDING_ACCOUNT: ${communityBuilding}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.FEE_ROUTER_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.FEE_ROUTER_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("FeeRouter");
    console.log("deploying FeeRouter (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [buybackExecutor, lpStakeVault, ecoReserve, communityBuilding], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`FeeRouter proxy: ${proxyAddress}`);
    console.log(`FeeRouter impl:  ${impl}`);

    await updateAddress(network.name, "FEE_ROUTER_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
