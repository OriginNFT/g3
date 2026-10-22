// Sets Gold3Fundraise.target (the hard cap on totalRaised) to 3,000,000 USDT.
// setParams writes all three limits, so minContribution and maxPerAddress are
// read first and passed back unchanged. Anubis USDT has 6 decimals.
// Depends on: FUNDRAISE_ADDRESS.
// Success is read from the receipt's ParamsUpdated event, not from target():
// the anubis RPC serves pre-transaction storage for a while after a
// transaction lands.
const { ethers, network } = require("hardhat");
const { allAddress } = require("../utils/config");

const USDT_DECIMALS = 6;
const TARGET = ethers.parseUnits("3000000", USDT_DECIMALS);

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
    // fundraise.target is the contract address in ethers v6, not the getter.
    const targetBefore = await fundraise.getFunction("target")();
    const minContribution = await fundraise.minContribution();
    const maxPerAddress = await fundraise.maxPerAddress();
    console.log(`target before:   ${targetBefore}`);
    console.log(`minContribution: ${minContribution} (kept)`);
    console.log(`maxPerAddress:   ${maxPerAddress} (kept)`);

    console.log(`setParams(${TARGET}, ${minContribution}, ${maxPerAddress}) ...`);
    const tx = await fundraise.setParams(TARGET, minContribution, maxPerAddress);
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
        .find(parsed => parsed && parsed.name === "ParamsUpdated");
    if (
        !event ||
        event.args.target !== TARGET ||
        event.args.minContribution !== minContribution ||
        event.args.maxPerAddress !== maxPerAddress
    ) {
        throw new Error(`no ParamsUpdated(${TARGET}, ${minContribution}, ${maxPerAddress}) in the receipt of ${tx.hash}`);
    }
    console.log(`ParamsUpdated(${TARGET}, ${minContribution}, ${maxPerAddress}) in block ${receipt.blockNumber}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
