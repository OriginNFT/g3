// Refreshes src/assets/addresses.json from the contract repo's address book.
// Run after every deploy that changes addresses:
//   npm run sync-addresses
//
// The whole book is copied, every network. The panel picks its block at build
// time through VITE_NETWORK (anubis unless set) — keeping every deployment in
// the file costs nothing and makes it obvious which ones exist.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, '../../gold3.contract/config/addresses.json');
const TARGET = resolve(HERE, '../src/assets/addresses.json');

const book = JSON.parse(readFileSync(SOURCE, 'utf8'));

// The default block. A book without it would build fine and then fail on
// every contract page with an undefined address.
if (!book['anubis']) {
    console.error(`[sync-addresses] ${SOURCE} has no "anubis" section — the panel's default block`);
    process.exit(1);
}

// src/assets/ holds nothing but generated files, so a fresh checkout may not
// have the directory at all. Create it rather than dying on ENOENT in the
// bootstrap step.
mkdirSync(dirname(TARGET), { recursive: true });

writeFileSync(TARGET, `${JSON.stringify(book, null, 4)}\n`);

console.log(`wrote ${TARGET}`);
for (const [network, entries] of Object.entries(book)) {
    const addresses = Object.values(entries).filter((value) => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value));
    console.log(`  ${network}: ${Object.keys(entries).length} keys, ${addresses.length} addresses${network === 'anubis' ? '  <- default (VITE_NETWORK selects another)' : ''}`);
}
