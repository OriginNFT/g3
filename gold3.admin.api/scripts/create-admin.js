'use strict';
require('dotenv').config();

// Creates an admin account. The authenticator is bound by the person themselves,
// at their first sign-in.
//   npm run create-admin -- <username>
//
// The password is asked for interactively so it never lands in shell history or
// in `ps`. Set ADMIN_PASSWORD in the environment instead only if you are
// automating this.
//
// No TOTP secret is generated or printed here on purpose: a secret read off a
// server console has to travel to its owner somehow, and every route it can take
// is worse than the browser it is going to be used in. The account is created
// with none, the first successful password sign-in issues one, and the first
// accepted code closes enrollment for good.
const readline = require('node:readline');

const { hashPassword } = require('../utils/password');

// Requiring ../model connects to the database as a side effect, so it is pulled
// in only once the arguments check out. Loading it up front means an argument
// mistake returns while that connection is still being made, and closing the
// pool from under it turns a one-line usage error into an unhandled rejection.
let db = null;

// readline with the echo suppressed: the prompt is written once, then every
// keystroke is swallowed instead of being mirrored back.
function askHidden(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        let written = false;
        rl._writeToOutput = function (chunk) {
            if (!written) {
                rl.output.write(question);
                written = true;
            }
        };
        rl.question(question, (answer) => {
            rl.output.write('\n');
            rl.close();
            resolve(answer);
        });
    });
}

async function main() {
    const username = (process.argv[2] || '').trim();
    if (!username) {
        console.error('usage: npm run create-admin -- <username>');
        process.exitCode = 1;
        return;
    }
    if (!/^[a-zA-Z0-9._@-]{3,64}$/.test(username)) {
        console.error(
            'username must be 3-64 characters of letters, digits, dot, underscore, dash or at-sign'
        );
        process.exitCode = 1;
        return;
    }

    db = require('../model');
    const { ready, AdminUser } = db;
    await ready;

    if (await AdminUser.findOne({ where: { username } })) {
        console.error(`"${username}" already exists`);
        process.exitCode = 1;
        return;
    }

    let password = process.env.ADMIN_PASSWORD;
    if (password) {
        console.log('using ADMIN_PASSWORD from the environment');
    } else {
        password = await askHidden('password (at least 12 characters): ');
        const again = await askHidden('repeat password: ');
        if (password !== again) {
            console.error('passwords do not match');
            process.exitCode = 1;
            return;
        }
    }

    let passwordHash;
    try {
        passwordHash = await hashPassword(password);
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
        return;
    }

    await AdminUser.create({
        username,
        password_hash: passwordHash,
        // Empty until their first sign-in issues one. totp_last_counter stays 0,
        // which is what the API reads as "not bound yet".
        totp_secret: '',
        totp_last_counter: 0,
        role: 'admin',
        enabled: true,
    });

    console.log(`\ncreated "${username}"`);
    console.log('\nTell them to sign in with this password. The panel will show them a secret to add');
    console.log('to Google Authenticator and ask for the first code - that binds it, once.');
    console.log('If they lose the phone afterwards: npm run reset-totp -- ' + username);
}

main()
    .catch((err) => {
        console.error('[FATAL] create-admin:', err.message, err);
        process.exitCode = 1;
    })
    .finally(() => db && db.sequelize.close());
