// Upgrades the Gold3Fundraise proxy to IMPL_REV 2: startTime. subscribe()
// reverts before startTime (unix seconds, 0 = no start time); the admin sets
// it with config/04-fundraise-start-time.js. Storage: startTime is appended
// after maxPerAddress and __gap shrinks 50 -> 49.
// Upgrades from IMPL_REV 1 only. Depends on: FUNDRAISE_ADDRESS. Writes nothing.
// The proxy was deployed by deploy/01-fundraise.js, so the upgrades manifest
// already holds the IMPL_REV 1 impl: no forceImport.
// Verified: the EIP-1967 impl slot is read before and after, and the script
// throws if it did not change or IMPL_REV is not 2. The anubis RPC serves
// pre-transaction storage for a while after a transaction lands, so the
// after-read is retried.
const { ethers, upgrades, network } = require("hardhat");
const { allAddress } = require("../utils/config");

const POLL_ATTEMPTS = 12;
const POLL_DELAY_MS = 5000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const addresses = await allAddress(network.name);

    const [signer] = await ethers.getSigners();
    console.log(`network: ${network.name}`);
    console.log(`signer:  ${signer.address}`);

    const proxy = addresses.FUNDRAISE_ADDRESS;
    if (!proxy || !ethers.isAddress(proxy)) {
        throw new Error(`dependency not deployed yet: ${network.name}.FUNDRAISE_ADDRESS (run deploy/01-fundraise.js first)`);
    }
    console.log(`proxy:   ${proxy}`);

    const fundraise = await ethers.getContractAt("Gold3Fundraise", proxy, signer);
    const revBefore = await fundraise.IMPL_REV();
    console.log(`IMPL_REV before: ${revBefore}`);
    if (revBefore !== 1n) {
        throw new Error(`IMPL_REV reads ${revBefore}, expected 1 - refusing to upgrade`);
    }

    const implBefore = await upgrades.erc1967.getImplementationAddress(proxy);
    console.log(`impl before: ${implBefore}`);

    const Factory = await ethers.getContractFactory("Gold3Fundraise");
    console.log("upgrading Gold3Fundraise ...");
    await upgrades.upgradeProxy(proxy, Factory);

    let implAfter = implBefore;
    let revAfter = revBefore;
    for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
        implAfter = await upgrades.erc1967.getImplementationAddress(proxy);
        revAfter = await fundraise.IMPL_REV();
        if (implAfter !== implBefore && revAfter === 2n) break;
        console.log(
            `impl reads ${implAfter}, IMPL_REV ${revAfter} ` +
                `(attempt ${attempt}/${POLL_ATTEMPTS}, retrying in ${POLL_DELAY_MS / 1000}s)`,
        );
        await sleep(POLL_DELAY_MS);
    }

    if (implAfter === implBefore) {
        throw new Error(
            `impl did not change: still ${implBefore} after ${(POLL_ATTEMPTS * POLL_DELAY_MS) / 1000}s. ` +
                "Check the upgrade transaction on chain.",
        );
    }
    if (revAfter !== 2n) {
        throw new Error(`impl changed to ${implAfter} but IMPL_REV reads ${revAfter}, expected 2`);
    }
    console.log(`impl after:  ${implAfter}`);
    console.log(`IMPL_REV after:  ${revAfter}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
