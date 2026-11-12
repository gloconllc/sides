# Kalshi Edge Board

A large, gamified board that ranks Kalshi markets by **edge**: the gap between a pricing model's odds and the market's price. It has two views:

1. **Top 10 picks**: the ten strongest buys, with gold, silver, and bronze medals, an edge meter marked at **10 points**, filters, and stars.
2. **Full market scanner**: every non-sports Kalshi market with real trading, with search, category, side, liquidity, closing date, minimum edge, and sort filters.

This repo hosts the board as a static page on Vercel, plus a small serverless relay that pulls live prices from Kalshi's public API. Hosting the page and the relay on the same Vercel domain removes the browser restrictions that kept the Claude artifact version from reaching Kalshi directly.

> Not financial advice. Model odds carry the assumptions listed below, and Kalshi fees are not included in any edge figure.

---

## The method (applies to every refresh)

1. Pull every currently open Kalshi market, excluding sports.
2. Analyze each market in detail, on both the yes and the no side.
3. Find markets where the price is off from a model's estimate by **10 to 15 points** or more (bettors overvaluing or undervaluing the outcome).
4. Rank by edge and return the **10** strongest immediate buys.

---

## Repo layout

```
kalshi-edge-board/
├── README.md
├── vercel.json            # Optional: caching headers and function settings
├── package.json           # Optional: only if you add dependencies
├── public/
│   └── index.html         # The board (start from kalshi-edge-board.html)
└── api/
    ├── prices.js          # Live prices for a list of tickers
    └── scan.js            # Full non-sports scan (paginated)
```

---

## Accounts

This project uses a **separate GitHub account and a separate Vercel account** from the ones connected to Claude. Before you start:

1. Sign in to the new GitHub account and create an empty repository (private is recommended).
2. Sign in to the new Vercel account (or team) and confirm it is the active scope in the Vercel dashboard before importing.
3. If you use the Vercel CLI locally, run `vercel logout` and then `vercel login` with the new account so deployments do not land in the wrong account.
4. If your machine has Git credentials cached for another GitHub account, set the remote with the new account's username or use a separate SSH key for it.

---

## Setup

### 1. Create the repo

```bash
mkdir kalshi-edge-board && cd kalshi-edge-board
git init
mkdir public api
# Copy kalshi-edge-board.html into public/index.html
# Add api/prices.js and api/scan.js (starter code below)
git add .
git commit -m "Initial Kalshi Edge Board"
git branch -M main
git remote add origin https://github.com/<new-account>/kalshi-edge-board.git
git push -u origin main
```

### 2. Import into Vercel

1. In the Vercel dashboard (new account), choose **Add New**, then **Project**, and import the repo.
2. Framework preset: **Other**. Leave the build command empty. Output directory: `public`.
3. Deploy. Every push to `main` redeploys automatically.

### 3. Point the board at the relay

The artifact version reads prices from Claude's artifact store (`claude.use("db")`). On Vercel, replace those reads with calls to the relay:

```js
// Top 10 prices
const res = await fetch("/api/prices?tickers=" + encodeURIComponent(TICKERS.join(",")));
const data = await res.json();   // { asOf, markets: { [ticker]: { yes_bid, yes_ask, no_bid, no_ask } } }

// Full scan
const scan = await (await fetch("/api/scan")).json();  // { asOf, total, rows: [...] }
```

Then wire the existing **⟳ Refresh** buttons and an optional 60-second timer to these calls. The page already renders from the same data shapes, so only the loading code changes. Remove the `claude.use(...)` blocks and the saved-filter code, or replace saved filters with browser storage.

---

## API endpoints (relay)

### `GET /api/prices?tickers=A,B,C`

Returns current prices, in cents, for each ticker.

```json
{
  "asOf": "2026-11-12T05:23:51Z",
  "markets": {
    "KXBTCPRICE-130000-27JUL08": { "yes_bid": 21, "yes_ask": 22, "no_bid": 78, "no_ask": 79 }
  }
}
```

### `GET /api/scan`

Returns every open non-sports market with open interest of at least **500** contracts and a yes ask between **2** and **98 cents**. Each row: ticker, event title, subtitle, category, bids and asks, open interest, 24-hour volume, and close date. The November 11, 2026 pull returned **6,711** rows (approximately; counts change by the minute).

---

## Starter relay code

These are starting points, not tested deployments. Verify the function format against the current Vercel documentation for the Node.js runtime before relying on them.

### `api/prices.js`

```js
const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const cents = (v) => (v == null || v === "" ? null : Math.round(parseFloat(v) * 1000) / 10);

export default async function handler(req, res) {
  const tickers = String(req.query.tickers || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 50);
  if (!tickers.length) return res.status(400).json({ error: "Pass tickers as a comma-separated list." });

  const markets = {};
  await Promise.all(tickers.map(async (t) => {
    try {
      const r = await fetch(`${BASE}/markets/${encodeURIComponent(t)}`);
      if (!r.ok) return;
      const m = (await r.json()).market;
      markets[t] = {
        yes_bid: cents(m.yes_bid_dollars), yes_ask: cents(m.yes_ask_dollars),
        no_bid: cents(m.no_bid_dollars),   no_ask: cents(m.no_ask_dollars)
      };
    } catch (e) { /* skip a failed ticker */ }
  }));

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=30");
  res.status(200).json({ asOf: new Date().toISOString(), markets });
}
```

### `api/scan.js`

```js
const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const cents = (v) => (v == null || v === "" ? null : Math.round(parseFloat(v) * 1000) / 10);

export default async function handler(req, res) {
  const rows = [];
  let cursor = "";
  for (let page = 0; page < 60; page++) {
    const url = `${BASE}/events?status=open&limit=200&with_nested_markets=true${cursor ? "&cursor=" + cursor : ""}`;
    const r = await fetch(url);
    if (!r.ok) break;
    const d = await r.json();
    for (const e of d.events || []) {
      if (e.category === "Sports") continue;
      for (const m of e.markets || []) {
        const ya = cents(m.yes_ask_dollars);
        const oi = parseFloat(m.open_interest_fp || 0);
        if (ya == null || oi < 500 || ya < 2 || ya > 98) continue;
        rows.push({
          t: m.ticker, e: e.title, s: m.yes_sub_title || "", c: e.category || "Other",
          yb: cents(m.yes_bid_dollars), ya, nb: cents(m.no_bid_dollars), na: cents(m.no_ask_dollars),
          oi: Math.round(oi), v: Math.round(parseFloat(m.volume_24h_fp || 0)), d: (m.close_time || "").slice(0, 10)
        });
      }
    }
    cursor = d.cursor;
    if (!cursor) break;
  }
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.status(200).json({ asOf: new Date().toISOString(), total: rows.length, rows });
}
```

**Timeout note:** the full scan made up to **60** paginated calls (about **12,000** events) in testing. That may exceed the default function time limit on some Vercel plans. If it times out, either raise the function's max duration in `vercel.json` (plan permitting), or run the scan on a schedule (Vercel Cron) and store the result, then serve the stored copy from `/api/scan`.

---

## Data sources

| Source | What it supplies | Endpoint used | Notes |
|---|---|---|---|
| Kalshi public API | All market prices, open interest, volume, rules | `api.elections.kalshi.com/trade-api/v2` (`/events`, `/markets`, `/markets/{ticker}`) | Market data was readable without an API key in testing. Verify Kalshi's current rate limits and terms of use. |
| Coinbase | Bitcoin and Ethereum spot price | `api.coinbase.com/v2/prices/BTC-USD/spot` | Public endpoint. |
| Deribit | Bitcoin implied volatility (DVOL) | `deribit.com/api/v2/public/get_volatility_index_data` | Public endpoint. |
| U.S. Bureau of Labor Statistics | CPI and core CPI index levels | `api.bls.gov/publicAPI/v1/timeseries/data/` (series `CUUR0000SA0`, `CUUR0000SA0L1E`) | Version 1 needs no key but has tight daily limits; version 2 needs a free key. |
| Yahoo Finance chart endpoint | S&P 500 and VIX levels | `query1.finance.yahoo.com/v8/finance/chart/` | Unofficial and may change or block requests. Replace with a licensed feed for anything you depend on. |

---

## Models and assumptions

| Market type | Model | Key assumptions |
|---|---|---|
| Bitcoin and Ethereum price targets ("When will X cross $Y") | Barrier touch probability under geometric Brownian motion | Bitcoin volatility **40% to 50%** (DVOL read about **39%**); Ethereum **65%**; zero drift. Understates fat-tail jumps. |
| S&P 500 "above 8,000 before date" | Same barrier model | Volatility **12% to 20%** (VIX read **17.5**); **6%** annual drift. |
| December CPI and core CPI year over year | Base-effect back-test | October 2026 index versus December 2025 base, applying each of the last **19** years' October to December seasonal moves; adjusted for falling gasoline prices. |
| Date-ladder inversions | Pricing consistency check | An earlier date cannot be worth more than a later one; buying both sides locks a payout. Fees can erase small gaps. |

Only markets with a model show an edge. In the November 11 scan, **14** of **6,711** markets were modeled. Adding models for more market types (for example, Fed decision ladders) widens the search.

**Medals:** gold is **10+** points of edge, silver **5 to 10**, bronze under **5**. Bitcoin picks move together, as do the S&P 500 picks; size each group as one position.

---

## Security

1. The relay reads public market data only. It needs **no credentials**.
2. Never add Kalshi trading API keys, account numbers, or passwords to this repo or to Vercel environment variables for this project. Trading stays on Kalshi.
3. Keep the repo private if you add anything beyond public data.

---

## Local development

```bash
npm i -g vercel        # Vercel CLI
vercel login           # sign in with the new Vercel account
vercel dev             # serves public/ and api/ at http://localhost:3000
```

Test the relay:

```bash
curl "http://localhost:3000/api/prices?tickers=KXBTCPRICE-130000-27JUL08"
```

---

## Status

| Item | State |
|---|---|
| Board page | Built; exported from the Claude artifact as `kalshi-edge-board.html` |
| Relay code | Starter code above; not yet deployed or tested on Vercel |
| Live wiring | Pending: replace `claude.use("db")` reads with `/api/prices` and `/api/scan` |
| Last data pull | November 11, 2026, 9:23 PM PST (prices) and 9:27 PM PST (scan) |
