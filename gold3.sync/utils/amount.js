'use strict';

const { formatUnits } = require('ethers');

// Every amount is stored twice:
//   amount_raw : the exact uint256 as a decimal string (lossless, source of truth)
//   amount     : human units in a DECIMAL column (query/aggregation friendly)
function amountFields(raw, decimals) {
    return {
        amount_raw: raw.toString(),
        amount: formatUnits(raw, decimals),
    };
}

module.exports = { amountFields };
