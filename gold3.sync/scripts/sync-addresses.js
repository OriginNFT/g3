'use strict';

// Refreshes config/addresses.json from the contract repo's address book.
// Run after every deploy that changes addresses:
//   npm run sync-addresses
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const SOURCE = resolve(__dirname, '../../gold3.contract/config/addresses.json');
const TARGET = resolve(__dirname, '../config/addresses.json');

const book = JSON.parse(readFileSync(SOURCE, 'utf8'));

writeFileSync(TARGET, `${JSON.stringify(book, null, 4)}\n`);

console.log(`wrote ${TARGET}`);
for (const [network, entries] of Object.entries(book)) {
    console.log(`  ${network}: ${Object.keys(entries).length} keys`);
}
