// Sets Gold3Fundraise.minContribution to 100 USDT and maxPerAddress to
// 100,000 USDT. setParams writes all three limits, so target is read first and
// passed back unchanged. Anubis USDT has 6 decimals.
// Depends on: FUNDRAISE_ADDRESS.
// Success is read from the receipt's ParamsUpdated event, not from the
// getters: the anubis RPC serves pre-transaction storage for a while after a
// transaction lands.
const { ethers, network } = require("hardhat");
const { allAddress } = require("../utils/config");

const USDT_DECIMALS = 6;
const MIN_CONTRIBUTION = ethers.parseUnits("100", USDT_DECIMALS);
const MAX_PER_ADDRESS = ethers.parseUnits("100000", USDT_DECIMALS);

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
    const target = await fundraise.getFunction("target")();
    const minBefore = await fundraise.minContribution();
    const maxBefore = await fundraise.maxPerAddress();
    console.log(`target:                 ${target} (kept)`);
    console.log(`minContribution before: ${minBefore}`);
    console.log(`maxPerAddress before:   ${maxBefore}`);

    console.log(`setParams(${target}, ${MIN_CONTRIBUTION}, ${MAX_PER_ADDRESS}) ...`);
    const tx = await fundraise.setParams(target, MIN_CONTRIBUTION, MAX_PER_ADDRESS);
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
        event.args.target !== target ||
        event.args.minContribution !== MIN_CONTRIBUTION ||
        event.args.maxPerAddress !== MAX_PER_ADDRESS
    ) {
        throw new Error(
            `no ParamsUpdated(${target}, ${MIN_CONTRIBUTION}, ${MAX_PER_ADDRESS}) in the receipt of ${tx.hash}`,
        );
    }
    console.log(`ParamsUpdated(${target}, ${MIN_CONTRIBUTION}, ${MAX_PER_ADDRESS}) in block ${receipt.blockNumber}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
