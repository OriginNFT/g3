import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Guarded } from './components/Guarded';
import { firstAllowed } from './nav';
import { Login } from './pages/Login';
import { Days } from './pages/Days';
import { DayDetail } from './pages/DayDetail';
import { Positions } from './pages/Positions';
import { Members } from './pages/Members';
import { Treasury } from './pages/Treasury';
import { Fees } from './pages/Fees';
import { Queues } from './pages/Queues';
import { Audit } from './pages/Audit';
import { Services } from './pages/Services';
import { Operators } from './pages/Operators';
import { Roles } from './pages/Roles';
import { ContractToken } from './pages/contracts/Token';
import { ContractEmission } from './pages/contracts/Emission';
import { ContractCommunity } from './pages/contracts/Community';
import { ContractPower } from './pages/contracts/Power';
import { ContractTreasury } from './pages/contracts/Treasury';
import { ContractFee } from './pages/contracts/Fee';
import { ContractOracle } from './pages/contracts/Oracle';
import { ContractRoles } from './pages/contracts/Roles';

// Every page declares the permission it needs. `read` decides whether the page
// renders at all; `write` is published to the page's signing buttons.
//
// This is not where access is enforced — the API checks every route for itself,
// and the contract pages sign straight from the browser. It is what stops
// someone being shown a screen they cannot use.
const guard = (read, write, element) => (
    <Guarded read={read} write={write}>
        {element}
    </Guarded>
);

/**
 * Where a signed-in operator lands: the first page their role can open.
 */
function Landing() {
    const { can, user } = useAuth();
    const target = firstAllowed(can);
    if (target) return <Navigate to={target} replace />;

    return (
        <Stack spacing={2}>
            <Typography variant="h5">沒有可用的頁面</Typography>
            <Paper variant="outlined">
                <Box sx={{ p: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {user && user.roleMissing
                            ? `你的角色「${user.role}」已經被刪除。`
                            : '你的角色目前沒有任何頁面的權限。'}
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        請找持有「新增與管理角色權限」的管理員調整。
                    </Typography>
                </Box>
            </Paper>
        </Stack>
    );
}

export function App() {
    const { user, checking } = useAuth();

    // The boot round-trip that turns a stored token into a user. Without this
    // gate a reload flashes the login screen before landing back on the page.
    if (checking) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Routes>
                <Route path="*" element={<Login />} />
            </Routes>
        );
    }

    return (
        <Routes>
            <Route element={<Layout />}>
                {/* A detail route carries the same permission as its list: the
                    row that leads here was already visible on that page. */}
                <Route path="/days" element={guard('days.read', null, <Days />)} />
                <Route path="/days/:day" element={guard('days.read', null, <DayDetail />)} />
                <Route path="/positions" element={guard('positions.read', null, <Positions />)} />
                <Route path="/members" element={guard('members.read', null, <Members />)} />
                <Route path="/members/:address" element={guard('members.read', null, <Members />)} />
                <Route path="/treasury" element={guard('treasury.read', null, <Treasury />)} />
                <Route path="/fees" element={guard('fees.read', null, <Fees />)} />
                <Route path="/audit" element={guard('audit.read', null, <Audit />)} />

                <Route path="/queues" element={guard('queues.read', 'queues.write', <Queues />)} />
                <Route path="/services" element={guard('services.read', null, <Services />)} />

                <Route path="/access/operators" element={guard('admin.users.read', 'admin.users.write', <Operators />)} />
                <Route path="/access/roles" element={guard('admin.roles.read', 'admin.roles.write', <Roles />)} />

                {/* The contract pages never call the API — they hand a
                    transaction to the operator's wallet. These keys gate what
                    the panel offers, not what the chain accepts. */}
                <Route path="/contracts/token" element={guard('contracts.token.read', 'contracts.token.write', <ContractToken />)} />
                <Route path="/contracts/emission" element={guard('contracts.emission.read', 'contracts.emission.write', <ContractEmission />)} />
                <Route path="/contracts/community" element={guard('contracts.community.read', 'contracts.community.write', <ContractCommunity />)} />
                <Route path="/contracts/power" element={guard('contracts.power.read', 'contracts.power.write', <ContractPower />)} />
                <Route path="/contracts/treasury" element={guard('contracts.treasury.read', 'contracts.treasury.write', <ContractTreasury />)} />
                <Route path="/contracts/fee" element={guard('contracts.fee.read', 'contracts.fee.write', <ContractFee />)} />
                <Route path="/contracts/oracle" element={guard('contracts.oracle.read', 'contracts.oracle.write', <ContractOracle />)} />
                <Route path="/contracts/roles" element={guard('contracts.roles.read', 'contracts.roles.write', <ContractRoles />)} />

                <Route path="*" element={<Landing />} />
            </Route>
        </Routes>
    );
}
