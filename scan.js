// GET /api/scan
// Pulls every open non-sports Kalshi market with open interest of at least 500
// and a yes ask between 2 and 98 cents, and adds model odds where a model exists.
const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const cents = (v) => (v == null || v === "" ? null : Math.round(parseFloat(v) * 1000) / 10);

// Standard normal CDF (Abramowitz and Stegun 7.1.26 approximation).
function N(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
// Probability a price touches level K before T years, zero drift, volatility s.
function touch(S, K, T, s) {
  const a = Math.abs(Math.log(K / S)), m = -s * s / 2, sd = s * Math.sqrt(T);
  return N((-a + m * T) / sd) + Math.exp(2 * m * a / (s * s)) * N((-a - m * T) / sd);
}
async function spot(pair) {
  try { const r = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`); return parseFloat((await r.json()).data.amount); }
  catch (e) { return null; }
}
async function spx() {
  // Unofficial endpoint; replace with a licensed feed if you depend on it.
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1d&interval=1d", { headers: { "User-Agent": "Mozilla/5.0" } });
    return (await r.json()).chart.result[0].meta.regularMarketPrice;
  } catch (e) { return null; }
}
// Fixed estimates from the CPI base-effect back-test (update by hand when re-run).
const FIXED = {
  "KXCPIYOY-26DEC-T3.7": [55, "CPI base-effect back-test"],
  "KXCPICOREYOY-26DEC-T2.8": [65, "Core CPI base-effect back-test"]
};

module.exports = async (req, res) => {
  const started = Date.now();
  const [btc, eth, sp] = await Promise.all([spot("BTC-USD"), spot("ETH-USD"), spx()]);
  const now = Date.now();
  const rows = [];
  let cursor = "", pages = 0, partial = false;
  for (; pages < 60; pages++) {
    if (Date.now() - started > 50000) { partial = true; break; } // stay under a 60-second limit
    const url = `${BASE}/events?status=open&limit=200&with_nested_markets=true${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`;
    const r = await fetch(url);
    if (!r.ok) { partial = true; break; }
    const d = await r.json();
    for (const e of d.events || []) {
      const cat = e.category || "Other";
      if (cat === "Sports") continue;
      const g = /When will (Bitcoin|Ethereum) cross \$([\d,\.]+)(k?)/.exec(e.title || "");
      const gs = /When will the S&P 500 Index be above \$([\d,\.]+)/.exec(e.title || "");
      for (const m of e.markets || []) {
        const ya = cents(m.yes_ask_dollars);
        const oi = parseFloat(m.open_interest_fp || 0);
        if (ya == null || oi < 500 || ya < 2 || ya > 98) continue;
        const T = (new Date(m.close_time).getTime() - now) / (365 * 86400000);
        const row = {
          t: m.ticker, e: (e.title || "").slice(0, 90), s: (m.yes_sub_title || "").slice(0, 60), c: cat,
          yb: cents(m.yes_bid_dollars), ya, nb: cents(m.no_bid_dollars), na: cents(m.no_ask_dollars),
          oi: Math.round(oi), v: Math.round(parseFloat(m.volume_24h_fp || 0)), d: (m.close_time || "").slice(0, 10)
        };
        if (g && T > 0.02) {
          const S = g[1] === "Bitcoin" ? btc : eth;
          const K = parseFloat(g[2].replace(/,/g, "")) * (g[3] ? 1000 : 1);
          const vol = g[1] === "Bitcoin" ? 0.45 : 0.65;
          if (S && K > S) { row.mp = Math.round(1000 * touch(S, K, T, vol)) / 10; row.mn = `Barrier model, ${vol * 100}% vol`; }
        } else if (gs && T > 0.02 && sp) {
          const K = parseFloat(gs[1].replace(/,/g, ""));
          if (K > sp) { row.mp = Math.round(1000 * touch(sp, K, T, 0.15)) / 10; row.mn = "Barrier model, 15% vol"; }
        } else if (FIXED[m.ticker]) {
          row.mp = FIXED[m.ticker][0]; row.mn = FIXED[m.ticker][1];
        }
        rows.push(row);
      }
    }
    cursor = d.cursor;
    if (!cursor) break;
  }
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.status(200).json({
    asOf: new Date().toISOString(), total: rows.length, modeled: rows.filter((r) => r.mp != null).length,
    pages: pages + 1, partial, seconds: Math.round((Date.now() - started) / 100) / 10, rows
  });
};
