# gold3.dapp

End-user dapp for GOLDEN PACT (GG). vite 5 + React 18 + TypeScript, MUI 6,
react-router 6 (HashRouter), wagmi 2 + RainbowKit 2 on Anubis (chainId 6714),
chart.js, lingui 4. UI language: Traditional Chinese (zh-TW).

**Stage: skeleton.** Every page is static mock data copied from the design
boards. Nothing reads the chain; pages are not linked by data; transaction
buttons are disabled.

## Run

```bash
cp .env.sample .env      # VITE_WALLETCONNECT_PROJECT_ID, VITE_APP_RPC_URL
npm install
npm run dev
```

A production build needs the compiled catalog first (the macros strip the
source strings in production):

```bash
npm run lingui:extract && npm run lingui:compile && npm run build
```

## Layout

```
src/App.tsx                 shell + route table
src/components/             shell (Sidebar, MobileDrawer, TopBar) and shared pieces
src/components/charts/      chart.js setup and wrappers (Donut, Line, Bar, Sparkline)
src/views/<Page>/           one folder per sidebar destination; mock.ts holds its board figures
src/themes/tokens.ts        design tokens (mirrored as --gp-* in src/style.scss)
src/locales/                lingui setup; zh-TW is the source locale
```

## Routes

| route | board |
| --- | --- |
| `/` | 數據總覽 |
| `/overview/emission` · `/overview/allocation` · `/overview/reserve` · `/overview/eco-pools` | overview details (mobile boards) |
| `/fundraise` | 募資 (no board; layout after anubis.dapp/fundraise) |
| `/power` | 本位倉算力 (no board yet: disabled skeleton) |
| `/liquidity` · `/liquidity/pools` · `/liquidity/:pair` · `/liquidity/add` | 3-1 … 3-5 |
| `/community` · `/community/stats` · `/community/levels` | 4-1 / 4-3 / 4-5 |
| `/nft` | 4-6 |
| `/assets` | 4-7 |
| `/docs` | 4-8 |

## Not in the repo yet

The artwork (logo, scarab, coins, banners, token logos). `ImageSlot` and
`TokenIcon` stand in for them; replace once the files are in `public/`.
