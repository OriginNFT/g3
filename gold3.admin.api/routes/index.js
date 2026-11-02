'use strict';

const express = require('express');

const config = require('../config');
const { version } = require('../package.json');

const router = express.Router();

const startedAt = Date.now();

// Health probe. Deliberately touches neither the database nor redis, so it
// answers even while a dependency is down - use it for liveness only. It is
// also the one unauthenticated route, so it reports nothing but its own state.
router.get('/', function (req, res) {
    res.status(200).json({
        name: 'gold3.admin.api',
        version,
        network: config.NETWORK,
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        status: 'running',
    });
});

module.exports = router;
