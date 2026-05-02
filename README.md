# Stock Cycle Compass

Where are we in the equity cycle? A live read on valuation, sentiment,
breadth and macro across US, Europe, UK and Global — rendered on a
four-quadrant cycle wheel and a 100-year CAPE spiral.

Part of the eToro AppStore Compass family.

## Stack

Next.js 14 + TypeScript + Tailwind 3, Geist Sans/Mono. Bespoke SVG
centerpieces (cycle wheel, CAPE spiral). GitHub Actions cron commits
fresh `data/stock-cycle.json` every 24h. Manual eToro API key flow with
auto-detect demo/real. Vercel Hobby + GitHub Actions = zero cost.

## Develop

```bash
npm install
npm run dev
```

## Verify the trade baskets against the live eToro catalog

```bash
npm run verify:baskets
npm run simulate:baskets
```

Both run with `tsx`. No API keys needed — they use the public
`api.etorostatic.com` instrument catalog.

## Refresh the data manually

```bash
npm run build:data
```

## Deploy

Push to a GitHub repo, point Vercel at it, no env vars required.

## Disclaimer

Educational tool. Not financial advice. Trading involves risk of loss.
