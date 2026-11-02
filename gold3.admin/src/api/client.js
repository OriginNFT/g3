// Minimal fetch wrapper. No axios: the API speaks JSON over four verbs, and a
// dependency for that is a dependency to keep patched.
//
// The session token lives in sessionStorage, so closing the tab ends the
// session. It is NOT protection against XSS — script running on this origin can
// read it either way — it just shortens the window.
import { permissionLabel } from '../auth/permissions';

const TOKEN_KEY = 'gold3.admin.token';

const BASE = import.meta.env.VITE_API_BASE || '';

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// The API answers in English on purpose: it is a service, and the same strings
// land in the server log where an operator reads them next to a stack trace.
// The panel is Chinese, so the translation happens here — the one place every
// response passes through — instead of at each call site.
//
// Every `error:` string gold3.admin.api can return has an entry, matched by the
// exact text the service sends. Anything not on this list falls through in
// English rather than being swallowed: a message nobody has translated yet is
// still worth more than "something went wrong", and it is how a message added
// to a route without a matching entry here makes itself visible.
const API_MESSAGES = {
    // auth and the session (routes/auth.js, middleware/auth.js)
    'invalid credentials': '帳號、密碼或驗證碼不正確',
    'username and password are required': '請輸入帳號和密碼',
    'token and code are required': '缺少綁定憑證或驗證碼',
    'too many attempts, try again later': '嘗試次數過多，請稍後再試',
    'enrollment expired, sign in again': '綁定逾時，請重新登入',
    'this account already has an authenticator bound': '這個帳號已經綁定過驗證器',
    'that code is not right - check the clock on your phone': '驗證碼不正確 — 請確認手機時間是自動校時',
    'currentPassword, newPassword and code are required': '請填寫目前密碼、新密碼和驗證碼',
    'password must be at least 12 characters': '密碼至少需要 12 個字元',
    'not authenticated': '尚未登入',
    'session store unavailable': '工作階段服務無法使用',

    // app-level (app.js, routes/services.js)
    'not found': '找不到這個路徑',
    'internal error': '伺服器發生錯誤',
    'cannot reach redis': '無法連線至 Redis',

    // reports (routes/days.js, positions.js, members.js, treasury.js, fees.js)
    'day must be a positive integer': '協議日必須是正整數',
    'not a valid address': '不是有效的地址',
    'not a valid asset address': '不是有效的資產地址',
    'since is not a date': '起始時間不是有效的日期',

    // payout queue (routes/queues.js)
    'rows must be an array': '名單格式不正確',
    'note is required - say where the amounts come from (10 characters or more)':
        '請填寫備註 — 說明這些金額的來源（至少 10 個字元）',
    'nonce is required': '缺少 nonce',
    "outcome must be 'sent' or 'pending'": '處理結果必須是「已上鏈」或「未上鏈」',
    'note is required - say what you checked on chain (10 characters or more)':
        '請填寫備註 — 說明你在鏈上確認了什麼（至少 10 個字元）',
    'tx hash is required when marking a batch as sent': '標記為已送出時必須填交易雜湊',
    'no batch is in flight on that nonce': '這個 nonce 上沒有進行中的批次',
    'nothing failed matches that': '沒有符合的失敗紀錄',

    // access control (routes/roles.js, admin-users.js, middleware/permission.js)
    'your role no longer exists - ask an administrator': '你的角色已經被刪除，請聯絡管理員',
    'that code is not right, or has already been used': '驗證碼不正確，或已經使用過',
    'this account is disabled': '這個帳號已被停用',
    'no such role': '找不到這個角色',
    'no such account': '找不到這個帳號',
    'a role with that name already exists': '這個角色名稱已經存在',
    'that name is reserved for the built-in role': '這個名稱保留給內建角色',
    'the built-in role cannot be changed': '內建角色不能修改',
    'the built-in role cannot be deleted': '內建角色不能刪除',
    'that username is taken': '這個帳號名稱已經有人使用',
    'enabled must be true or false': '啟用狀態必須是是／否',
    'permissions must be an array': '權限格式不正確',
    'nothing to update': '沒有需要更新的內容',
    'this is the last enabled administrator - promote someone else first':
        '這是最後一個啟用中的管理員 —— 請先指派另一位管理員',
    'name must be 2-16 characters: Han characters, or lower-case letters, digits, dash, underscore':
        '角色名稱必須是 2-16 個字元：中文字，或小寫英文、數字、減號、底線',
    'username must be 3-64 characters of letters, digits, dot, underscore, dash or at-sign':
        '帳號必須是 3-64 個字元：英文、數字、點、底線、減號或 @',
};

// Messages that carry a value. Matched after the exact table so a fixed string
// never falls through to a pattern.
const API_PATTERNS = [
    [/^permission denied: (.+)$/, (key) => `沒有權限：${permissionLabel(key)}`],
    [/^this action needs a verification code: (.+)$/, (key) => `「${permissionLabel(key)}」需要驗證碼`],
    [/^unknown permission: (.+)$/, (keys) => `不認得的權限：${keys}`],
    [
        /^(\d+) account\(s\) still hold this role - move them first$/,
        (n) => `還有 ${n} 個帳號使用這個角色 —— 請先改掉他們的角色`,
    ],
    [/^unknown contract, expected one of: (.+)$/, (names) => `不認得的合約，可用的是：${names}`],
    [/^day (\d+) is not settled$/, (day) => `第 ${day} 日還沒有結算`],
    [/^at most (\d+) rows per call$/, (n) => `一次最多 ${n} 筆`],
    [/^rows\[(\d+)\]: not a valid address$/, (i) => `第 ${Number(i) + 1} 筆：地址不正確`],
    [/^rows\[(\d+)\]: bucket must be one of (.+)$/, (i) => `第 ${Number(i) + 1} 筆：桶別不正確`],
    [/^rows\[(\d+)\]: amount must be a positive GG amount with at most 18 decimals$/, (i) => `第 ${Number(i) + 1} 筆：金額必須是正數，最多 18 位小數`],
    [/^rows\[(\d+)\]: (.+) appears twice$/, (i) => `第 ${Number(i) + 1} 筆：同一地址同一桶重複出現`],
    [/^day (\d+) is not settled yet \(no CommunityBudgetAllocated row\)$/, (day) => `第 ${day} 日還沒有結算（沒有社區預算分配紀錄）`],
    [/^day (\d+) is already closed on chain$/, (day) => `第 ${day} 日在鏈上已經關閉`],
    [/^day (\d+) is already queued - .+$/, (day) => `第 ${day} 日已經在隊列裡 —— 先刪除它的待發送紀錄，或重試失敗紀錄`],
    [/^(EXPANSION|COLLABORATION|CONTRIBUTION) rows exceed the day's \1 budget of (.+) GG$/, (bucket) => `${bucket} 桶的名單總額超過當日該桶預算`],
    [/^day (\d+) is not queued$/, (day) => `第 ${day} 日不在隊列裡`],
    [/^day (\d+) is (queued|sent|closed)$/, (day) => `第 ${day} 日的狀態不允許刪除`],
];

// Exported for API strings that arrive inside a successful response rather
// than as an `error:`.
export function translate(message) {
    if (API_MESSAGES[message]) return API_MESSAGES[message];
    for (const [pattern, format] of API_PATTERNS) {
        const match = pattern.exec(message);
        if (match) return format(match[1]);
    }
    return message;
}

// The two routes that answer 401 without a session existing: a rejected sign-in
// attempt, not an expired one. Their own error message is what the screen has
// to show, so they skip the global logout below.
const AUTH_PATHS = new Set(['/api/auth/login', '/api/auth/enroll']);

// Anyone can subscribe to "the session is gone" — the auth context does, so a
// 401 anywhere logs out everywhere instead of leaving a dead page on screen.
const unauthorizedHandlers = new Set();

export function onUnauthorized(handler) {
    unauthorizedHandlers.add(handler);
    return () => unauthorizedHandlers.delete(handler);
}

// Dangerous actions answer 403 with `totpRequired` instead of doing the thing.
// Rather than making every page handle that, the provider registers a way to
// ask for six digits here, and the request retries itself once. A page calls
// api.del() and either it happens or it does not — the second factor is the
// client's business, not the page's.
let totpPrompt = null;

export function setTotpPrompt(prompt) {
    totpPrompt = prompt;
    return () => {
        if (totpPrompt === prompt) totpPrompt = null;
    };
}

async function request(method, path, body, options = {}) {
    const headers = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.totpCode) headers['X-Totp-Code'] = options.totpCode;

    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (err) {
        // Network-level failure: the API is down, or DNS/TLS is broken. Say so
        // rather than surfacing "Failed to fetch".
        console.error('[API] request failed:', method, path, err.message, err);
        throw new ApiError('無法連線到管理 API', 0);
    }

    // A 401 from anywhere else means the session is gone, so it logs out
    // everywhere rather than leaving a dead page on screen. Signing in is the
    // exception: /login and /enroll answer 401 for a wrong password or a wrong
    // code, and there is no session to end - treating those as an expiry would
    // replace "wrong credentials" with "please log in again" on the one screen
    // where the difference matters.
    if (response.status === 401 && !AUTH_PATHS.has(path)) {
        setToken(null);
        for (const handler of unauthorizedHandlers) handler();
        throw new ApiError('登入狀態已失效，請重新登入', 401);
    }

    let payload = null;
    const text = await response.text();
    // A file download wants the body as it came. Errors stay on the JSON path
    // below, so they translate like any other.
    if (options.raw && response.ok) return text;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch (err) {
            console.error('[API] response is not JSON:', method, path, response.status, err.message);
            throw new ApiError(`API 回應格式不正確（${response.status}）`, response.status);
        }
    }

    if (!response.ok) {
        // Ask for the code and try again — once. `options.totpCode` already set
        // means the code we just sent was refused, and asking again in a loop
        // would spend codes instead of reporting the problem.
        if (response.status === 403 && payload && payload.totpRequired && !options.totpCode && totpPrompt) {
            const code = await totpPrompt({ method, path });
            if (code) return request(method, path, body, { ...options, totpCode: code });
        }

        const message = payload && payload.error ? translate(payload.error) : `請求失敗（${response.status}）`;
        const error = new ApiError(message, response.status);
        if (payload && payload.totpRequired) error.totpRequired = true;
        throw error;
    }
    return payload;
}

export const api = {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    del: (path, options) => request('DELETE', path, undefined, options),
};
