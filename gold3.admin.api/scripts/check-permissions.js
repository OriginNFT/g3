'use strict';

// Fails if any route is reachable without a permission check.
//   npm run check-permissions
//
// This is the load-bearing part of the whole authorization design. A permission
// system is only as good as its worst-covered route, and the way it rots is
// always the same: someone adds an endpoint and forgets the guard. Nothing else
// notices - the endpoint works, it just works for everybody.
//
// Static, so it needs no database and can run anywhere. It reads the route files
// rather than the express stack for the same reason check-abi reads the source:
// what the code actually says is the thing that ships.
const { readFileSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');

const { apiKeys, isKnown, PERMISSIONS } = require('../permissions');

const ROOT = resolve(__dirname, '..');
const ROUTES_DIR = join(ROOT, 'routes');

// Exempt, each for a stated reason. A file is never exempt by accident.
const EXEMPT = {
    'index.js': 'health probe - the one unauthenticated route, reports nothing but its own state',
    'auth.js': 'authentication itself: sign in, bind an authenticator, sign out, and the two self-service routes (/me, /password) that act on the caller and nobody else',
};

// Route heads are written on one line in this codebase. A head split across
// lines will read as "no guard" and fail - which is the safe direction to fail.
const ROUTE_HEAD = /^\s*router\.(get|post|put|patch|delete)\(\s*(['"])([^'"]*)\2/;
const GUARD = /requirePermission\(\s*'([^']+)'\s*\)/;

const problems = [];
const usedKeys = new Set();
let checked = 0;

const apiScoped = new Set(apiKeys());

for (const file of readdirSync(ROUTES_DIR).filter((name) => name.endsWith('.js')).sort()) {
    if (EXEMPT[file]) {
        console.log(`[SKIP] routes/${file} - ${EXEMPT[file]}`);
        continue;
    }

    const lines = readFileSync(join(ROUTES_DIR, file), 'utf8').split('\n');
    let found = 0;

    lines.forEach((line, index) => {
        const head = ROUTE_HEAD.exec(line);
        if (!head) return;

        const [, method, , path] = head;
        const where = `routes/${file}:${index + 1} ${method.toUpperCase()} ${path}`;
        found++;
        checked++;

        const guard = GUARD.exec(line);
        if (!guard) {
            problems.push(`[UNGUARDED] ${where} - no requirePermission()`);
            return;
        }

        const key = guard[1];
        usedKeys.add(key);

        if (!isKnown(key)) {
            problems.push(`[UNKNOWN KEY] ${where} - "${key}" is not in permissions.js`);
            return;
        }
        if (!apiScoped.has(key)) {
            problems.push(`[WRONG SCOPE] ${where} - "${key}" is declared scope:'panel', which nothing enforces`);
            return;
        }
        console.log(`[OK] ${where} -> ${key}`);
    });

    if (found === 0) {
        problems.push(`[NO ROUTES] routes/${file} - no route heads matched; the scan is broken, or this file should be exempt`);
    }
}

// The reverse rot: a key in the catalogue that no route checks. It can be
// granted, it will look meaningful in the role editor, and it authorizes
// nothing.
const orphans = [...apiScoped].filter((key) => !usedKeys.has(key));
for (const key of orphans) {
    problems.push(`[ORPHAN] "${key}" is scope:'api' but no route checks it - guard a route with it, or drop it`);
}

const panelKeys = PERMISSIONS.filter((entry) => entry.scope === 'panel').length;
console.log(
    `\n${checked} route(s) checked, ${apiScoped.size} api permission(s), ` +
        `${panelKeys} panel-only permission(s) (enforced in the browser, not here)`
);

if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
}

console.log('every route is guarded');
