// Deploys the ClaimController proxy. Depends on: GG_ADDRESS, ORACLE_ADAPTER_ADDRESS, NFT_RIGHTS_LEDGER_ADDRESS, COMMUNITY_ENGINE_ADDRESS.
// Writes CLAIM_CONTROLLER_ADDRESS. The deployer gets DEFAULT_ADMIN_ROLE and owns the ProxyAdmin.
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

    const nftRightsLedger = addresses.NFT_RIGHTS_LEDGER_ADDRESS;
    if (!nftRightsLedger || !ethers.isAddress(nftRightsLedger) || nftRightsLedger === ZERO) {
        throw new Error(`invalid or missing ${network.name}.NFT_RIGHTS_LEDGER_ADDRESS: ${nftRightsLedger} (run deploy/20-nft-rights-ledger.js first)`);
    }
    console.log(`NFT_RIGHTS_LEDGER_ADDRESS: ${nftRightsLedger}`);

    const communityEngine = addresses.COMMUNITY_ENGINE_ADDRESS;
    if (!communityEngine || !ethers.isAddress(communityEngine) || communityEngine === ZERO) {
        throw new Error(`invalid or missing ${network.name}.COMMUNITY_ENGINE_ADDRESS: ${communityEngine} (run deploy/17-community-engine.js first)`);
    }
    console.log(`COMMUNITY_ENGINE_ADDRESS: ${communityEngine}`);

    // Refuse to replace a live proxy. To redeploy on purpose, clear the key.
    const existing = addresses.CLAIM_CONTROLLER_ADDRESS;
    if (existing && ethers.isAddress(existing) && existing !== ZERO) {
        const code = await ethers.provider.getCode(existing);
        if (code !== "0x") {
            throw new Error(
                `${network.name}.CLAIM_CONTROLLER_ADDRESS is already ${existing} and has code on this chain - refusing to deploy a second one. ` +
                    "To redeploy on purpose, clear that key in config/addresses.json first.",
            );
        }
    }

    const Factory = await ethers.getContractFactory("ClaimController");
    console.log("deploying ClaimController (proxy) ...");
    const proxy = await upgrades.deployProxy(Factory, [gg, oracleAdapter, nftRightsLedger, communityEngine], {
        initializer: "initialize",
        kind: "transparent",
    });
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`ClaimController proxy: ${proxyAddress}`);
    console.log(`ClaimController impl:  ${impl}`);

    await updateAddress(network.name, "CLAIM_CONTROLLER_ADDRESS", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
