'use strict';

// kill_timeout gives bin/www room to drain in-flight requests and close the
// connection pool before pm2 escalates to SIGKILL.
module.exports = {
    apps: [
        {
            name: 'gold3-admin-api',
            script: 'bin/www',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            restart_delay: 5000,
            max_restarts: 50,
            max_memory_restart: '512M',
            kill_timeout: 15000,
            time: true,
            out_file: 'logs/admin-api.out.log',
            error_file: 'logs/admin-api.err.log',
            merge_logs: true,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
