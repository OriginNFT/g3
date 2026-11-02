import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { HashRouter } from 'react-router-dom';

import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { WalletProvider } from './chain/wallet';
import { TxProvider } from './chain/TxContext';
import { TotpProvider } from './components/TotpProvider';
import { theme } from './theme';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <HashRouter>
                {/* TotpProvider wraps AuthProvider: the API client asks it for a
                    code, and that has to work for the very first request a page
                    makes, including the ones AuthProvider itself sends. */}
                <TotpProvider>
                    <AuthProvider>
                        <WalletProvider>
                            <TxProvider>
                                <App />
                            </TxProvider>
                        </WalletProvider>
                    </AuthProvider>
                </TotpProvider>
            </HashRouter>
        </ThemeProvider>
    </StrictMode>
);
