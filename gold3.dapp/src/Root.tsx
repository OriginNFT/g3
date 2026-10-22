import { FC } from "react";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
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

const Root: FC = () => (
    <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={rainbowTheme} locale="zh-TW">
                <I18nProvider i18n={i18n}>
                    <ThemeProvider theme={muiTheme}>
                        <CssBaseline />
                        <HashRouter>
                            <App />
                        </HashRouter>
                    </ThemeProvider>
                </I18nProvider>
            </RainbowKitProvider>
        </QueryClientProvider>
    </WagmiProvider>
);

export default Root;
