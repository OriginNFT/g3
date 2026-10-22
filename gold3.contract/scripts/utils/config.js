// addresses.json read/write helpers (same API shape as helix.contract).
const fs = require("fs");
const path = require("path");

const addressFile = path.resolve(__dirname, "../../config/addresses.json");

function readConfig(file) {
    const data = fs.readFileSync(file, "utf8");
    return JSON.parse(data);
}

async function updateAddress(network, name, value, file = addressFile) {
    const config = readConfig(file);
    if (config[network] === undefined) {
        config[network] = {};
    }
    config[network][name] = value;
    fs.writeFileSync(file, JSON.stringify(config, null, 4), "utf8");
    console.log(`${path.basename(file)} updated ${network} ${name} ${value}`);
}

async function getAddress(network, name, file = addressFile) {
    const config = readConfig(file);
    return config[network] ? config[network][name] : undefined;
}

async function allAddress(network, file = addressFile) {
    const config = readConfig(file);
    return config[network] || {};
}

module.exports = {
    updateAddress,
    getAddress,
    allAddress,
    addressFile,
};
