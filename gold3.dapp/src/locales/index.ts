import { i18n } from "@lingui/core";
import { en, hi, ja, ko, zh } from "make-plural/plurals";

// zh-TW is the lingui source locale (lingui.config.ts). Adding a locale is an
// entry here plus lingui.config.ts plus its catalog. The keys double as
// RainbowKit locales, which accept all five as they are.
interface ILocale {
    label: string;
    plurals: (n: number | string, ord?: boolean) => "zero" | "one" | "two" | "few" | "many" | "other";
}

export const locales: { [locale: string]: ILocale } = {
    en: { label: "English", plurals: en },
    "zh-TW": { label: "繁體中文", plurals: zh },
    ja: { label: "日本語", plurals: ja },
    ko: { label: "한국어", plurals: ko },
    hi: { label: "हिन्दी", plurals: hi },
};

// When neither a stored choice nor the browser's languages match a locale.
export const DEFAULT_LOCALE = "en";

for (const [key, locale] of Object.entries(locales)) {
    i18n.loadLocaleData(key, { plurals: locale.plurals });
}

// Catalogs are emitted by `lingui compile`. Globbing them means a locale that
// has not been compiled yet is simply absent instead of breaking the build.
const catalogModules = import.meta.glob<{ messages: Record<string, string> }>("./translations/*/messages.mjs", {
    eager: true,
});

const catalogs: { [locale: string]: Record<string, string> } = {};
for (const [path, module] of Object.entries(catalogModules)) {
    const segments = path.split("/");
    catalogs[segments[segments.length - 2]] = module.messages;
}

function loadLocale(locale: string = DEFAULT_LOCALE) {
    const catalog = catalogs[locale];
    // In dev the source strings still render without a catalog; a production
    // build strips them, so a missing catalog there is the whole UI showing ids.
    if (!catalog) {
        console.error(
            `locales: no compiled catalog for "${locale}" - run "npm run lingui:extract" then "npm run lingui:compile".`,
        );
    }
    i18n.load(locale, catalog ?? {});
    i18n.activate(locale);
}

export function selectLocale(locale: string) {
    try {
        window.localStorage.setItem("locale", locale);
    } catch (e: any) {
        console.error("locales: storing the locale failed:", e?.message || e, e);
    }
    loadLocale(locale);
}

// The browser's preferred languages in order, matched on the language part only
// (zh-CN and zh-HK read as zh-TW); none of them -> DEFAULT_LOCALE.
function browserLocale(): string {
    const language = (tag: string) => tag.toLowerCase().split("-")[0];
    for (const tag of navigator.languages ?? [navigator.language]) {
        const match = Object.keys(locales).find(key => language(key) === language(tag));
        if (match) return match;
    }
    return DEFAULT_LOCALE;
}

export function initLocale() {
    let locale: string | null = null;
    try {
        locale = window.localStorage.getItem("locale");
    } catch (e: any) {
        console.error("locales: reading the stored locale failed:", e?.message || e, e);
    }
    loadLocale(locale && locale in locales ? locale : browserLocale());
}
