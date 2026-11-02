import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development the panel and the API run on different ports, so requests are
// proxied instead of going cross-origin — which keeps ADMIN_CORS_ORIGINS empty
// (same origin only) in every environment, dev included.
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const target = env.VITE_API_PROXY || 'http://127.0.0.1:3300';

    return {
        plugins: [react()],
        server: {
            port: Number(env.VITE_PORT || 5300),
            proxy: {
                '/api': { target, changeOrigin: true },
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
        },
    };
});
