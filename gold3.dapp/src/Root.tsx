import { FC, useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { lightTheme, Locale, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

import { config } from "src/hooks/wagmi";
import muiTheme from "src/themes/muiTheme";
import { ACCENT } from "src/themes/tokens";
import App from "./App.tsx";

const queryClient = new QueryClient();

// Built once at module load: rebuilding it per render would remount the modal tree.
const rainbowTheme = lightTheme({
    accentColor: ACCENT,
    accentColorForeground: "#FFFFFF",
    borderRadius: "medium",
});

const Root: FC = () => {
    // `t` reads the global i18n and does not re-render on a locale switch, so
    // App remounts under the new locale; RainbowKit's modal follows it too.
    const [locale, setLocale] = useState(i18n.locale);
    useEffect(() => i18n.on("change", () => setLocale(i18n.locale)), []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={rainbowTheme} locale={locale as Locale}>
                    <I18nProvider i18n={i18n}>
                        <ThemeProvider theme={muiTheme}>
                            <CssBaseline />
                            <HashRouter>
                                <App key={locale} />
                            </HashRouter>
                        </ThemeProvider>
                    </I18nProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};

export default Root;
