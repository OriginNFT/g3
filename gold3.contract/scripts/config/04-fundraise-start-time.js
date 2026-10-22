// Sets Gold3Fundraise.startTime: subscribe() reverts before it.
// START_TIME 1792684800 = 2026-10-23 00:00:00 SGT (UTC+8) = 2026-10-22 16:00:00 UTC.
// Depends on: FUNDRAISE_ADDRESS, upgrade/03-fundraise-start-time.js.
// Success is read from the receipt's StartTimeUpdated event, not from
// startTime(): the anubis RPC serves pre-transaction storage for a while after
// a transaction lands.
const { ethers, network } = require("hardhat");
const { allAddress } = require("../utils/config");

const START_TIME = 1792684800n;

async function main() {
    const addresses = await allAddress(network.name);

    const [signer] = await ethers.getSigners();
    console.log(`network: ${network.name}`);
    console.log(`signer:  ${signer.address}`);

    const fundraiseAddress = addresses.FUNDRAISE_ADDRESS;
    if (!fundraiseAddress || !ethers.isAddress(fundraiseAddress)) {
        throw new Error(`dependency not deployed yet: ${network.name}.FUNDRAISE_ADDRESS (run deploy/01-fundraise.js first)`);
    }
    console.log(`fundraise: ${fundraiseAddress}`);

    const fundraise = await ethers.getContractAt("Gold3Fundraise", fundraiseAddress, signer);
    console.log(`setStartTime(${START_TIME}) = ${new Date(Number(START_TIME) * 1000).toISOString()} ...`);
    const tx = await fundraise.setStartTime(START_TIME);
    console.log(`tx: ${tx.hash}`);
    const receipt = await tx.wait();

    const event = receipt.logs
        .map(log => {
            try {
                return fundraise.interface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find(parsed => parsed && parsed.name === "StartTimeUpdated");
    if (!event || event.args.startTime !== START_TIME) {
        throw new Error(`no StartTimeUpdated(${START_TIME}) in the receipt of ${tx.hash}`);
    }
    console.log(`StartTimeUpdated(${START_TIME}) in block ${receipt.blockNumber}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
