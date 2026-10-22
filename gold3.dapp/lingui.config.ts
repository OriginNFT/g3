import type { LinguiConfig } from "@lingui/conf";

// zh-TW is both the source locale and, for now, the only one: every message in
// the code is written in Traditional Chinese. Adding a locale is this array
// plus an entry in src/locales/index.ts plus its catalog directory.
const config: LinguiConfig = {
    locales: ["zh-TW"],
    sourceLocale: "zh-TW",
    format: "po",
    compileNamespace: "es",
    catalogs: [
        {
            path: "<rootDir>/src/locales/translations/{locale}/messages",
            include: ["src"],
        },
    ],
};

export default config;
