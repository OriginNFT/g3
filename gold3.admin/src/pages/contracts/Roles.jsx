import { useCallback, useState } from 'react';
import {
    Alert,
    Chip,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Contract, ZeroHash, getAddress } from 'ethers';

import { getProvider } from '../../chain/client';
import { contractAt, CONTRACTS, roleHash, ROLE_LABELS, IMPL_SLOT, ADMIN_SLOT } from '../../chain/contracts';
import { useWallet } from '../../chain/wallet';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, AddressLink } from '../../components/ContractCard';
import { TxButton } from '../../components/TxButton';

// OZ's ProxyAdmin has no artifact in this repo (it comes from the upgrades
// plugin), and only two of its functions matter here.
const PROXY_ADMIN_ABI = ['function owner() view returns (address)', 'function transferOwnership(address newOwner)'];

// A contract without roles has nothing to show or manage on this page.
const CONTRACT_NAMES = Object.keys(CONTRACTS).filter((name) => CONTRACTS[name].roles.length > 0);

function slotToAddress(word) {
    if (!word || word === ZeroHash) return null;
    return getAddress(`0x${word.slice(26)}`);
}

/**
 * Same address, whatever case each side happens to be written in.
 *
 * Checksumming both sides is how this comparison is done here — lowercasing an
 * address is never allowed in this panel, not even for a throwaway comparison,
 * because that is exactly how a lowercased address ends up being displayed or
 * sent somewhere later.
 */
function sameAddress(a, b) {
    if (!a || !b) return false;
    try {
        return getAddress(a) === getAddress(b);
    } catch (err) {
        console.error('[ROLES] address compare failed:', err.message, err);
        return false;
    }
}

function RoleCard({ name, newHolder, signerAddress }) {
    const load = useCallback(async () => {
        const entry = CONTRACTS[name];
        const c = contractAt(name);
        if (!c) return null;
        const provider = getProvider();

        const [implWord, adminWord] = await Promise.all([
            provider.getStorage(entry.address, IMPL_SLOT),
            provider.getStorage(entry.address, ADMIN_SLOT),
        ]);

        const roles = [];
        for (const role of entry.roles) {
            /* eslint-disable no-await-in-loop */
            try {
                const count = Number(await c.getRoleMemberCount(roleHash(role)));
                const members = [];
                for (let i = 0; i < count; i += 1) members.push(await c.getRoleMember(roleHash(role), i));
                roles.push({ role, members });
            } catch (err) {
                // An older implementation without enumeration, or a role that
                // does not exist on the deployed bytecode. Report it on the row
                // instead of failing the whole card.
                console.error(`[ROLES] ${name}.${role} read failed:`, err.message, err);
                roles.push({ role, members: [], error: err.message });
            }
            /* eslint-enable no-await-in-loop */
        }

        return {
            roles,
            upgradeable: implWord !== ZeroHash,
            proxyAdmin: slotToAddress(adminWord),
        };
    }, [name]);

    const { data: d, error, loading, reload } = useChainRead(load);
    const entry = CONTRACTS[name];
    const c = contractAt(name);

    return (
        <ContractCard
            title={entry.label}
            subtitle={
                d
                    ? !d.upgradeable
                        ? '非代理部署 —— 這個合約不能升級，權限設錯只能重新部署。'
                        : d.proxyAdmin
                          ? `可升級（代理管理員 ${d.proxyAdmin}）`
                          : '可升級'
                    : ''
            }
            address={entry.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 220 }}>角色</TableCell>
                        <TableCell>成員</TableCell>
                        <TableCell align="right" sx={{ width: 120 }}>
                            授予
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(d ? d.roles : []).map((row) => (
                        <TableRow key={row.role}>
                            <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {ROLE_LABELS[row.role] || row.role}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {row.role}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                {row.error ? (
                                    <Typography variant="caption" color="error">
                                        讀取失敗：{row.error}
                                    </Typography>
                                ) : null}
                                {!row.error && row.members.length === 0 ? (
                                    <Typography
                                        variant="caption"
                                        color={row.role === 'DEFAULT_ADMIN_ROLE' ? 'error' : 'text.secondary'}
                                    >
                                        {row.role === 'DEFAULT_ADMIN_ROLE'
                                            ? '沒有任何管理員 —— 這個合約已經無人可管'
                                            : '無成員'}
                                    </Typography>
                                ) : null}
                                <Stack spacing={0.5}>
                                    {row.members.map((member) => (
                                        <Stack key={member} direction="row" spacing={1} alignItems="center">
                                            <AddressLink address={member} full />
                                            {sameAddress(member, signerAddress) ? (
                                                <Chip size="small" label="目前錢包" color="primary" variant="outlined" />
                                            ) : null}
                                            <TxButton
                                                color="error"
                                                variant="text"
                                                title={`撤銷 ${entry.label} 的「${ROLE_LABELS[row.role] || row.role}」`}
                                                detail={
                                                    <>
                                                        revokeRole(<code>{row.role}</code>, <code>{member}</code>)
                                                        {sameAddress(member, signerAddress) ? (
                                                            <>
                                                                {' '}
                                                                —— <b>這是你自己現在連著的錢包</b>
                                                                ，撤銷後你將無法再對這個合約做任何管理操作。
                                                            </>
                                                        ) : null}
                                                        {row.members.length === 1 && row.role === 'DEFAULT_ADMIN_ROLE' ? (
                                                            <>
                                                                {' '}
                                                                <b>
                                                                    這是最後一個管理員，撤銷之後這個合約再也沒有人能授權
                                                                    任何角色，等同永久失控。
                                                                </b>
                                                            </>
                                                        ) : null}
                                                    </>
                                                }
                                                build={(signer) => c.connect(signer).revokeRole(roleHash(row.role), member)}
                                                onDone={reload}
                                            >
                                                撤銷
                                            </TxButton>
                                        </Stack>
                                    ))}
                                </Stack>
                            </TableCell>
                            <TableCell align="right">
                                <TxButton
                                    disabled={!newHolder}
                                    title={`授予 ${entry.label} 的「${ROLE_LABELS[row.role] || row.role}」`}
                                    detail={
                                        <>
                                            grantRole(<code>{row.role}</code>, <code>{newHolder}</code>)：交接的順序是
                                            先授予新地址、確認它能操作之後，再回來撤銷舊地址 —— 反過來做會把自己鎖在
                                            外面。
                                        </>
                                    }
                                    build={(signer) => c.connect(signer).grantRole(roleHash(row.role), newHolder)}
                                    onDone={reload}
                                >
                                    授予
                                </TxButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ContractCard>
    );
}

function ProxyAdminCard({ newHolder }) {
    const load = useCallback(async () => {
        // The ProxyAdmin is not in the address book — it is discovered from the
        // EIP-1967 admin slot of a proxy that is known to exist. Every proxy in
        // this deployment shares one, so the first contract that actually has
        // an address is enough to find it; before the first deploy there is
        // none and the card stays empty rather than picking a fixed name that
        // happens to be unset.
        const provider = getProvider();
        const probeName = CONTRACT_NAMES.find((name) => CONTRACTS[name].address);
        if (!probeName) return null;
        const admin = slotToAddress(await provider.getStorage(CONTRACTS[probeName].address, ADMIN_SLOT));
        if (!admin) return { admin: null, owner: null, probe: probeName };
        const owner = await new Contract(admin, PROXY_ADMIN_ABI, provider).owner();
        return { admin, owner, probe: probeName };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                代理升級管理員 (ProxyAdmin)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                持有它就能替換所有代理合約的實作，是整套系統權限最高的一個地址。轉移是<b>一步生效、沒有反悔</b>的
                —— 對方無需接受，送出即完成。
            </Typography>

            {error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    讀取失敗：{error.message}
                </Alert>
            ) : null}

            <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap" useFlexGap>
                <Stack>
                    <Typography variant="caption" color="text.secondary">
                        ProxyAdmin 地址
                    </Typography>
                    <AddressLink address={d && d.admin} full />
                </Stack>
                <Stack>
                    <Typography variant="caption" color="text.secondary">
                        目前持有人
                    </Typography>
                    <AddressLink address={d && d.owner} full />
                </Stack>
                <TxButton
                    color="error"
                    variant="contained"
                    disabled={!newHolder || loading || !d || !d.admin}
                    title="轉移代理升級管理員"
                    detail={
                        <>
                            ProxyAdmin.transferOwnership(<code>{newHolder}</code>)：目前持有人 {d ? d.owner : '?'}。
                            <b>一步生效、不可撤回</b>。地址打錯等於永久失去所有合約的升級能力。
                        </>
                    }
                    build={(signer) => new Contract(d.admin, PROXY_ADMIN_ABI, signer).transferOwnership(newHolder)}
                    onDone={reload}
                >
                    轉移持有權
                </TxButton>
            </Stack>
        </Paper>
    );
}

export function ContractRoles() {
    const [newHolder, setNewHolder] = useState('');
    const { account } = useWallet();

    return (
        <Stack spacing={3}>
            <Typography variant="h5">鏈上權限</Typography>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    所有合約都是角色制（AccessControl）。交接的固定順序是：
                    <b>先授予新地址 → 用新地址實測 → 再撤銷舊地址</b>
                    。先撤銷再授予會讓合約在中間那一刻無人可管。下面所有「授予」按鈕共用這一個地址。
                </Typography>
                <TextField
                    size="small"
                    fullWidth
                    label="要授予的新地址"
                    value={newHolder}
                    onChange={(event) => setNewHolder(event.target.value)}
                    sx={{ maxWidth: 520 }}
                />
                {account ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        目前連著的錢包：{account}
                    </Typography>
                ) : null}
            </Paper>

            <ProxyAdminCard newHolder={newHolder} />

            {CONTRACT_NAMES.map((name) => (
                <RoleCard key={name} name={name} newHolder={newHolder} signerAddress={account} />
            ))}
        </Stack>
    );
}
