// Hands every admin right of Gold3Fundraise over to NEW_ADMIN:
//   1. ProxyAdmin (read from the proxy's EIP-1967 admin slot):
//      transferOwnership(NEW_ADMIN).
//   2. Gold3Fundraise: grantRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN), then the
//      signer renounceRole(DEFAULT_ADMIN_ROLE). Granted first so the role is
//      never left without a holder.
// Depends on: FUNDRAISE_ADDRESS. Writes nothing. The signer must own the
// ProxyAdmin and hold DEFAULT_ADMIN_ROLE. Success is read from each receipt's
// events, not from storage: the anubis RPC serves pre-transaction storage for
// a while after a transaction lands.
const { ethers, upgrades, network } = require("hardhat");
const { allAddress } = require("../utils/config");

const NEW_ADMIN = "0xCc7f2217D8F207ADcEbaBE2fF1cD891c77a0EE8A";

// ProxyAdmin is not compiled in this project (the upgrades plugin ships its own).
const PROXY_ADMIN_ABI = [
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner)",
    "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
];

function findEvent(contract, receipt, name) {
    return receipt.logs
        .map(log => {
            try {
                return contract.interface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find(parsed => parsed && parsed.name === name);
}

async function main() {
    const addresses = await allAddress(network.name);

    const [signer] = await ethers.getSigners();
    console.log(`network:   ${network.name}`);
    console.log(`signer:    ${signer.address}`);
    console.log(`new admin: ${NEW_ADMIN}`);

    const proxy = addresses.FUNDRAISE_ADDRESS;
    if (!proxy || !ethers.isAddress(proxy)) {
        throw new Error(`dependency not deployed yet: ${network.name}.FUNDRAISE_ADDRESS (run deploy/01-fundraise.js first)`);
    }
    console.log(`fundraise:   ${proxy}`);

    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxy);
    console.log(`proxy admin: ${proxyAdminAddress}`);

    const proxyAdmin = new ethers.Contract(proxyAdminAddress, PROXY_ADMIN_ABI, signer);
    const fundraise = await ethers.getContractAt("Gold3Fundraise", proxy, signer);

    // 1. ProxyAdmin ownership
    console.log(`proxy admin owner: ${await proxyAdmin.owner()}`);
    console.log(`ProxyAdmin.transferOwnership(${NEW_ADMIN}) ...`);
    let tx = await proxyAdmin.transferOwnership(NEW_ADMIN);
    console.log(`tx: ${tx.hash}`);
    let receipt = await tx.wait();
    const transferred = findEvent(proxyAdmin, receipt, "OwnershipTransferred");
    if (!transferred || transferred.args.newOwner !== NEW_ADMIN) {
        throw new Error(`no OwnershipTransferred(-> ${NEW_ADMIN}) in the receipt of ${tx.hash}`);
    }
    console.log(
        `OwnershipTransferred(${transferred.args.previousOwner} -> ${transferred.args.newOwner}) in block ${receipt.blockNumber}`,
    );

    // 2. Gold3Fundraise DEFAULT_ADMIN_ROLE
    const role = await fundraise.DEFAULT_ADMIN_ROLE();

    console.log(`grantRole(DEFAULT_ADMIN_ROLE, ${NEW_ADMIN}) ...`);
    tx = await fundraise.grantRole(role, NEW_ADMIN);
    console.log(`tx: ${tx.hash}`);
    receipt = await tx.wait();
    const granted = findEvent(fundraise, receipt, "RoleGranted");
    if (!granted || granted.args.role !== role || granted.args.account !== NEW_ADMIN) {
        throw new Error(`no RoleGranted(DEFAULT_ADMIN_ROLE, ${NEW_ADMIN}) in the receipt of ${tx.hash}`);
    }
    console.log(`RoleGranted(DEFAULT_ADMIN_ROLE, ${granted.args.account}) in block ${receipt.blockNumber}`);

    console.log(`renounceRole(DEFAULT_ADMIN_ROLE, ${signer.address}) ...`);
    tx = await fundraise.renounceRole(role, signer.address);
    console.log(`tx: ${tx.hash}`);
    receipt = await tx.wait();
    const revoked = findEvent(fundraise, receipt, "RoleRevoked");
    if (!revoked || revoked.args.role !== role || revoked.args.account !== signer.address) {
        throw new Error(`no RoleRevoked(DEFAULT_ADMIN_ROLE, ${signer.address}) in the receipt of ${tx.hash}`);
    }
    console.log(`RoleRevoked(DEFAULT_ADMIN_ROLE, ${revoked.args.account}) in block ${receipt.blockNumber}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
