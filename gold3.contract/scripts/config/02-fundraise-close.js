// Closes Gold3Fundraise: setClosed(true). Depends on: FUNDRAISE_ADDRESS.
// Success is read from the receipt's ClosedUpdated event, not from closed():
// the anubis RPC serves pre-transaction storage for a while after a
// transaction lands.
const { ethers, network } = require("hardhat");
const { allAddress } = require("../utils/config");

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
    console.log("setClosed(true) ...");
    const tx = await fundraise.setClosed(true);
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
        .find(parsed => parsed && parsed.name === "ClosedUpdated");
    if (!event || event.args.closed !== true) {
        throw new Error(`no ClosedUpdated(true) in the receipt of ${tx.hash}`);
    }
    console.log(`ClosedUpdated(true) in block ${receipt.blockNumber}: fundraise is closed`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
