'use strict';

// Names every abi/*.json a listener requires that is missing, so a
// MODULE_NOT_FOUND restart loop under pm2 has a one-line explanation:
//   npm run check-abi
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { SERVICES } = require('../config/services');

const ROOT = resolve(__dirname, '..');
let missing = 0;

for (const service of SERVICES) {
    if (service.kind !== 'listener') continue;
    const source = readFileSync(resolve(ROOT, service.script), 'utf8');
    for (const match of source.matchAll(/require\('\.\.\/abi\/([A-Za-z0-9]+)\.json'\)/g)) {
        const file = resolve(ROOT, 'abi', `${match[1]}.json`);
        if (!existsSync(file)) {
            console.error(`[MISSING] ${service.name}: abi/${match[1]}.json (run "npm run sync-abi")`);
            missing++;
        }
    }
}

if (missing > 0) {
    console.error(`${missing} ABI file(s) missing`);
    process.exit(1);
}
console.log('[OK] every listener has its ABI');
