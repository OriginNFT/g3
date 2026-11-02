// Chinese names for the permission keys the API ships.
//
// The API answers in English on purpose — the same strings land in the server
// log — so the panel owns the display names. A key with no entry here falls
// back to the raw key: an unnamed permission is still usable, and it is obvious
// that it needs a name.
//
// The key list mirrors gold3.admin.api/permissions.js. The `contracts.*` keys
// are panel-scoped there: the contract pages sign from the browser and never
// call this API, so those keys are process control and an audit story, not a
// security boundary — the chain obeys the private key, not this table.
export const GROUP_LABELS = {
    reports: '報表檢視',
    operations: '營運操作',
    access: '權限管理',
    contracts: '合約設置',
};

export const PERMISSION_LABELS = {
    'days.read': '檢視每日結算紀錄',
    'positions.read': '檢視算力仓位與持倉獎勵',
    'members.read': '檢視會員資料',
    'treasury.read': '檢視國庫金流',
    'fees.read': '檢視手續費與回購',
    'services.read': '檢視服務狀態',
    'audit.read': '檢視操作紀錄',

    'queues.read': '檢視發放隊列',
    'queues.write': '處理發放隊列（建立名單、重試、標記完成）',

    'admin.users.read': '檢視操作員',
    'admin.users.write': '新增與管理操作員',
    'admin.roles.read': '檢視角色',
    'admin.roles.write': '新增與管理角色權限',

    'contracts.token.read': '檢視 GG 代幣合約',
    'contracts.token.write': '設定 GG 代幣合約（手續費路由、賣出池、豁免）',
    'contracts.emission.read': '檢視排放控制器',
    'contracts.emission.write': '設定排放控制器（genesis、接線）',
    'contracts.community.read': '檢視社區引擎',
    'contracts.community.write': '設定社區引擎（turbine、固定地址）',
    'contracts.power.read': '檢視算力金庫、等級質押與 NFT 額度',
    'contracts.power.write': '設定算力金庫（turbine）',
    'contracts.treasury.read': '檢視國庫合約',
    'contracts.treasury.write': '設定國庫合約（提領、釋放、router）',
    'contracts.fee.read': '檢視手續費路由與回購',
    'contracts.fee.write': '設定回購（上限、滑點、路徑白名單）',
    'contracts.oracle.read': '檢視價格來源',
    'contracts.oracle.write': '設定價格來源（pair、觀測窗）',
    'contracts.roles.read': '檢視鏈上角色',
    'contracts.roles.write': '授予／撤銷鏈上角色',
};

export function permissionLabel(key) {
    return PERMISSION_LABELS[key] || key;
}

export function groupLabel(group) {
    return GROUP_LABELS[group] || group;
}
