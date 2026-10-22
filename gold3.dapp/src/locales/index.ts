import { i18n } from "@lingui/core";
import { zh } from "make-plural/plurals";

// zh-TW is the lingui source locale and the only one for now (lingui.config.ts).
// Adding a locale is an entry here plus lingui.config.ts plus its catalog.
interface ILocale {
    label: string;
    plurals: (n: number | string, ord?: boolean) => "zero" | "one" | "two" | "few" | "many" | "other";
}

export const locales: { [locale: string]: ILocale } = {
    "zh-TW": { label: "繁體中文", plurals: zh },
};

export const DEFAULT_LOCALE = "zh-TW";

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

export function initLocale() {
    let locale: string | null = null;
    try {
        locale = window.localStorage.getItem("locale");
    } catch (e: any) {
        console.error("locales: reading the stored locale failed:", e?.message || e, e);
    }
    loadLocale(locale && locale in locales ? locale : DEFAULT_LOCALE);
}
