// The sidebar, in one place: the menu renders it and the landing redirect reads
// it to find the first page this operator can actually open.
//
// `perm` is the read permission the page needs. It is what disables the entry —
// disabled, not hidden, the same as every other control here: an operator who
// can see that a page exists and is not theirs asks for access, where one who
// sees nothing assumes the panel is broken.
//
// `title` is also the identity of a collapsed/expanded group in localStorage, so
// renaming one resets that group to its default rather than breaking anything.
//
// Detail routes (`/days/:day`, `/members/:address`) deliberately have no entry
// of their own: they are reached by clicking a row, and the menu highlights the
// list they belong to because it matches on path prefix.
export const NAV_SECTIONS = [
    {
        title: '紀錄',
        items: [
            { to: '/days', label: '每日結算', hint: '每個協議日一列：預算拆分、五桶、關閉', perm: 'days.read' },
            { to: '/positions', label: '算力仓位', hint: '參與紀錄、持倉獎勵發放與領取', perm: 'positions.read' },
            { to: '/members', label: '會員', hint: '單一地址的算力、等級、額度與社區帳', perm: 'members.read' },
            { to: '/treasury', label: '國庫', hint: '保障國庫、儲備池、保護池與分配金庫的金流', perm: 'treasury.read' },
            { to: '/fees', label: '手續費與回購', hint: '手續費分流與回購銷毀', perm: 'fees.read' },
            { to: '/audit', label: '操作紀錄', hint: '這裡做過的每一次變更', perm: 'audit.read' },
        ],
    },
    {
        title: '營運',
        items: [
            { to: '/queues', label: '發放隊列', hint: '社區三桶的名單，等待 accountant 上鏈', perm: 'queues.read' },
            { to: '/services', label: '服務狀態', hint: 'gold3.sync 心跳與同步游標', perm: 'services.read' },
        ],
    },
    {
        // These pages never call the API: they build a transaction and hand it to
        // the operator's wallet. The permission keys below are process control
        // and an audit story, not a security boundary — the chain obeys the
        // private key, not this table.
        title: '合約設置（需簽名）',
        items: [
            { to: '/contracts/token', label: 'GG 代幣', hint: '手續費路由、賣出池、豁免', perm: 'contracts.token.read' },
            { to: '/contracts/emission', label: '排放控制器', hint: 'genesis、階段、每日結算', perm: 'contracts.emission.read' },
            { to: '/contracts/community', label: '社區引擎', hint: 'turbine、DAO 與平台地址、每日預算', perm: 'contracts.community.read' },
            { to: '/contracts/power', label: '算力與等級', hint: '算力金庫、等級質押、NFT 額度、領取', perm: 'contracts.power.read' },
            { to: '/contracts/treasury', label: '國庫合約', hint: '保障國庫、儲備池、保護池、分配金庫', perm: 'contracts.treasury.read' },
            { to: '/contracts/fee', label: '手續費與回購', hint: 'FeeRouter 接線、回購上限與路徑', perm: 'contracts.fee.read' },
            { to: '/contracts/oracle', label: '價格來源', hint: 'TWAP pair、觀測窗、目前報價', perm: 'contracts.oracle.read' },
            { to: '/contracts/roles', label: '鏈上權限', hint: '角色成員與升級管理員', perm: 'contracts.roles.read' },
        ],
    },
    {
        title: '後台權限',
        items: [
            { to: '/access/operators', label: '操作員', hint: '誰能登入這個後台', perm: 'admin.users.read' },
            { to: '/access/roles', label: '角色權限', hint: '每個角色能做什麼', perm: 'admin.roles.read' },
        ],
    },
];

/** Whether a nav entry is reachable. An array of keys is "any of these". */
export function allows(can, perm) {
    return Array.isArray(perm) ? perm.some((key) => can(key)) : can(perm);
}

/** The first page this operator may open, or null when they may open none. */
export function firstAllowed(can) {
    for (const section of NAV_SECTIONS) {
        for (const item of section.items) {
            if (allows(can, item.perm)) return item.to;
        }
    }
    return null;
}
