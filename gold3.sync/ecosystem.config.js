'use strict';

const { SERVICES } = require('./config/services');

// pm2 sets process.env.name to the app name, which serviceStatus reports as
// pm2Name. kill_timeout gives a keeper room to finish its current tick before
// pm2 escalates to SIGKILL.
module.exports = {
    apps: SERVICES.map((service) => ({
        name: `gold3-sync-${service.name}`,
        script: service.script,
        cwd: __dirname,
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        restart_delay: 5000,
        max_restarts: 50,
        max_memory_restart: service.maxMemory || '512M',
        kill_timeout: 30000,
        time: true,
        out_file: `logs/${service.name}.out.log`,
        error_file: `logs/${service.name}.err.log`,
        merge_logs: true,
        env: {
            NODE_ENV: 'production',
        },
    })),
};
