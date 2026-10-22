import type { LinguiConfig } from "@lingui/conf";

// zh-TW is the source locale: every message in the code is written in
// Traditional Chinese. Adding a locale is this array plus an entry in
// src/locales/index.ts plus its catalog directory.
const config: LinguiConfig = {
    locales: ["en", "zh-TW", "ja", "ko", "hi"],
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
