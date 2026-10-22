import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { lingui } from "@lingui/vite-plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        "import.meta.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
    },
    plugins: [
        react({
            plugins: [["@lingui/swc-plugin", {}]],
        }),
        lingui(),
    ],
    resolve: {
        alias: {
            src: path.resolve(__dirname, "./src"),
        },
    },
});
