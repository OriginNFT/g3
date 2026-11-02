'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const { requireAuth } = require('./middleware/auth');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const daysRouter = require('./routes/days');
const positionsRouter = require('./routes/positions');
const membersRouter = require('./routes/members');
const treasuryRouter = require('./routes/treasury');
const feesRouter = require('./routes/fees');
const queuesRouter = require('./routes/queues');
const auditRouter = require('./routes/audit');
const servicesRouter = require('./routes/services');
const rolesRouter = require('./routes/roles');
const adminUsersRouter = require('./routes/admin-users');

const app = express();

// Behind nginx/pm2: trust the proxy so req.ip is the caller, not the hop. It
// lands in the audit trail and in every rejected-login line.
app.set('trust proxy', true);
app.disable('x-powered-by');

// This API writes - so no origin is allowed by default and each one has to be
// named in ADMIN_CORS_ORIGINS. An empty list means "same origin only", which
// is the right default for a panel served from the same host.
//
// First in the chain so a preflight is answered without touching anything else.
app.use(
    cors({
        origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        // x-totp-code carries the fresh code a dangerous action demands. It
        // rides in a header rather than the body so a GET can carry one too.
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Totp-Code'],
        // Auth rides in the Authorization header; no cookie ever crosses this
        // boundary, so a browser cannot be tricked into replaying a session.
        credentials: false,
    })
);

// Bodies here are settings and queue rows, not uploads.
app.use(express.json({ limit: '256kb' }));

// Log the caller, and never the body: login requests carry a password and a
// TOTP code.
morgan.token('admin', (req) => (req.admin ? req.admin.username : '-'));
app.use(morgan(':remote-addr :method :url :status :response-time ms admin=:admin'));

app.use('/', indexRouter);
app.use('/api/auth', authRouter);

// Everything past this point needs a session.
app.use('/api/days', requireAuth, daysRouter);
app.use('/api/positions', requireAuth, positionsRouter);
app.use('/api/members', requireAuth, membersRouter);
app.use('/api/treasury', requireAuth, treasuryRouter);
app.use('/api/fees', requireAuth, feesRouter);
app.use('/api/queues', requireAuth, queuesRouter);
app.use('/api/audit', requireAuth, auditRouter);
app.use('/api/services', requireAuth, servicesRouter);
app.use('/api/roles', requireAuth, rolesRouter);
app.use('/api/admin-users', requireAuth, adminUsersRouter);

app.use(function (req, res) {
    res.status(404).json({ error: 'not found', path: req.originalUrl });
});

// JSON error handler - this service has no views, so an unhandled error must
// not fall through to express' HTML default. The message is logged in full and
// answered generically: a stack trace is a map of the service.
app.use(function (err, req, res, next) {
    console.error(`[${new Date().toISOString()}] [app] ${req.method} ${req.originalUrl}:`, err.message, err);
    const status = err.status || 500;
    res.status(status).json({ error: status === 500 ? 'internal error' : err.message });
});

module.exports = app;
