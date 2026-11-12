# Sides strategy enhancement specification

Status: Documentation only. No application code or deployment settings are changed.

## Mandatory core strategy

Preserve the existing implementation and its functionality. The requirements below describe the intended strategy; they do not certify that the current code implements it.

- Scan all currently available non-sports Kalshi markets.
- Report actual coverage, pagination completion, exclusions, failures, and data timestamps. Never describe a partial scan as complete.
- Evaluate both Yes and No propositions for overpricing and underpricing.
- Compare executable entry costs with independently supported probability estimates.
- Seek a 10 to 15 percentage-point valuation edge, not merely a 10% to 15% potential investment return.
- Target the 10 strongest qualifying immediate-entry opportunities. Do not cap better-supported edges at 15 points.
- If fewer than 10 qualify, report the actual number and put nonqualifying research leads on a separate watchlist.
- Account for settlement rules, fees, bid-ask spreads, available depth, uncertainty, capital commitment, and correlated exposure.
- Never manufacture probability estimates, evidence, current quotes, or qualifying picks.

## Additive swing-trading assessment

Swing trading complements the core strategy and must not replace it or weaken qualification requirements.

For each candidate, add:

1. Selected side, executable entry estimate, stake, and estimated contract count.
2. Independent settlement probability range and its evidence/model basis.
3. A verified catalyst, source, expected timing, and explanation of why it may not already be priced in.
4. Intended holding window and thesis-invalidation conditions.
5. Downside, base, and upside exit-price scenarios with explicit assumptions.
6. Hypothetical gross proceeds, estimated net profit, and return for each scenario.
7. Current executable exit estimates only when supported by order-book depth for the intended position size.
8. Separate valuation, catalyst, and execution confidence assessments.
9. Data timestamps, model version, and missing-evidence warnings.

Do not equate a target exit price with fair settlement probability. Do not label hypothetical proceeds as available cash-out value. Do not treat low entry prices, large possible payouts, or momentum alone as evidence of an edge. Do not double-count price movement and the news causing it as independent evidence.

## Calculation requirements

- Distinguish total proceeds from profit.
- Calculate affordable contracts using actual entry costs and applicable fees; round contract quantities down as required.
- Use depth-aware average prices for position-size estimates when depth is available.
- Deduct applicable entry and exit fees when estimating net profit.
- Label missing fees or depth as unverified; do not silently assume zero costs or unlimited liquidity.
- Include settlement-at-zero loss and adverse early-exit scenarios.
- Label target scenarios hypothetical and do not guarantee fills or exits.

## Confidence and validation

Do not invent precise confidence percentages from arbitrary weights. Record candidate snapshots, rejected candidates, losing candidates, sources, entry assumptions, target windows, executable outcomes, adverse excursions, and costs. Evaluate out-of-sample performance before representing the model as validated. Track correlated positions together.

## Preservation and implementation controls

- Do not overwrite working source files from this documentation package.
- Inspect current api/prices.js, api/scan.js, public/index.html, package.json, and vercel.json before implementing changes.
- Preserve existing endpoint response fields, controls, models, and rendering behavior unless explicitly approved otherwise.
- Add new fields and modules only after compatibility review.
- Keep core-qualified picks separate from swing-only watchlist candidates.
- Fix demonstrable errors and stale assumptions; preservation does not require retaining inaccuracies.
- Document additive changes and verify existing and new behavior before production deployment.

## Acceptance checks for a future code update

- Existing price and scan endpoints still work.
- Existing board, stake input, payout calculations, and refresh controls still work.
- No new sports markets are introduced.
- Both sides are assessed without duplicate or correlated exposure being hidden.
- Scan coverage and stale-data status are visible.
- Core qualification is not bypassed by swing scoring.
- Settlement and early-exit calculations are visibly separate.
- Fees, depth limitations, hypothetical targets, and uncertainty are disclosed.
- No live trading or automatic order placement is added.
