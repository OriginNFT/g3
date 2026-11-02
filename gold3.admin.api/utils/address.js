'use strict';

const { getAddress } = require('ethers');

/**
 * Validate an address and return it in its canonical EIP-55 checksummed form.
 *
 * This is not a case change for its own sake. The settlement matches these rows
 * against addresses that came off the chain checksummed, with a plain `=`, so an
 * address saved in any other casing is accepted and then silently never applies.
 * Normalising here is what makes an override actually take effect.
 *
 * getAddress does exactly the two things wanted:
 *   - all-lowercase or all-uppercase input comes back checksummed
 *   - mixed-case input with a BAD checksum throws, which catches a mistyped
 *     character that a shape check would wave through
 *
 * @returns the checksummed address, or null if it is not a valid one
 */
function validAddress(input) {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    if (value === '') return null;
    try {
        return getAddress(value);
    } catch (err) {
        return null;
    }
}

module.exports = { validAddress };
