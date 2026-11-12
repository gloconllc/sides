// GET /api/prices?tickers=A,B,C
// Returns current Kalshi prices (in cents) for up to 50 tickers.
const BASE = "https://api.elections.kalshi.com/trade-api/v2";
const cents = (v) => (v == null || v === "" ? null : Math.round(parseFloat(v) * 1000) / 10);

module.exports = async (req, res) => {
  const raw = (req.query && req.query.tickers) || "";
  const tickers = String(raw).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 50);
  if (!tickers.length) {
    res.status(400).json({ error: "Pass tickers as a comma-separated list, for example ?tickers=KXBTCPRICE-130000-27JUL08" });
    return;
  }
  const markets = {};
  const failed = [];
  await Promise.all(tickers.map(async (t) => {
    try {
      const r = await fetch(`${BASE}/markets/${encodeURIComponent(t)}`);
      if (!r.ok) { failed.push(t); return; }
      const m = (await r.json()).market;
      markets[t] = {
        yes_bid: cents(m.yes_bid_dollars), yes_ask: cents(m.yes_ask_dollars),
        no_bid: cents(m.no_bid_dollars), no_ask: cents(m.no_ask_dollars)
      };
    } catch (e) { failed.push(t); }
  }));
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=30");
  res.status(200).json({ asOf: new Date().toISOString(), markets, failed });
};
