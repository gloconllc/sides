(function () {
  "use strict";
  const host = document.createElement("section");
  host.id = "strategy-enhancement";
  host.style.cssText = "margin:32px auto;padding:24px;max-width:1232px;border:2px solid #8994ad;border-radius:20px;font-family:inherit";
  const heading = document.createElement("h2"); heading.textContent = "Strategy qualification and swing analysis";
  const status = document.createElement("p");
  const notice = document.createElement("p");
  notice.textContent = "Independent supplement. Original board is unchanged. Qualification depends on supplied evidence and execution assumptions, not independently verified by this module. Targets are hypothetical, not available cash-out quotes.";
  const refresh = document.createElement("button"); refresh.textContent = "Refresh strategy analysis"; refresh.type = "button";
  const results = document.createElement("div");
  host.append(heading, notice, refresh, status, results);
  (document.querySelector(".eb-wrap") || document.body).append(host);
  let busy = false;
  function line(parent, text) { const p = document.createElement("p"); p.textContent = text; parent.append(p); }
  const finite = x => typeof x === "number" && Number.isFinite(x);
  const money = x => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(x);
  function validDate(x) { return typeof x === "string" && Number.isFinite(Date.parse(x)); }
  function httpUrl(x) { try {return ["https:","http:"].includes(new URL(x).protocol);} catch (_) {return false;} }
  function evaluate(r, side, cfg, now, stake, fresh) {
    const a = cfg.assessments[r.t] || {};
    const price = side === "YES" ? r.ya : r.na;
    if (!finite(price) || price <= 0 || price >= 100) return null;
    const blockers = [];
    const rangeOK = finite(a.probabilityLow) && finite(a.probabilityHigh) && a.probabilityLow >= 0 && a.probabilityHigh <= 100 && a.probabilityLow <= a.probabilityHigh;
    const probability = rangeOK ? (side === "YES" ? a.probabilityLow : 100-a.probabilityHigh) : (finite(r.mp) ? (side === "YES" ? r.mp : 100-r.mp) : null);
    if (!rangeOK) blockers.push("No reviewed probability range");
    if (!httpUrl(a.sourceUrl)) blockers.push("Missing evidence source");
    if (!validDate(a.reviewedAt) || Date.parse(a.reviewedAt)>now || !validDate(a.validUntil) || Date.parse(a.validUntil)<=now || Date.parse(a.validUntil)<=Date.parse(a.reviewedAt)) blockers.push("Evidence dates missing, invalid, or expired");
    if (a.modelValidated !== true) blockers.push("Model not marked validated");
    if (a.rulesVerified !== true) blockers.push("Settlement rules not verified");
    if (!fresh) blockers.push("Scan timestamp missing or stale");
    const feesOK = finite(a.entryFeeCentsPerContract) && a.entryFeeCentsPerContract>=0;
    if (!feesOK) blockers.push("Entry fees unverified");
    const cost = price + (feesOK ? a.entryFeeCentsPerContract : 0);
    const desired = Math.floor(stake*100/cost);
    if (desired<1) blockers.push("Stake too small");
    if (!Number.isInteger(a.maxExecutableContracts) || a.maxExecutableContracts<desired) blockers.push("Full stake entry depth not confirmed");
    const edge = probability == null ? null : probability-cost;
    if (edge == null || edge<cfg.minimumEdgePoints) blockers.push("Below required edge or no estimate");
    return {r,side,a,price,cost,desired,probability,edge,blockers,qualified:blockers.length===0};
  }
  async function load() {
    if (busy) return; busy=true; refresh.disabled=true; status.textContent="Loading existing scan and strategy configuration...";
    try {
      const [cr,sr]=await Promise.all([fetch("/strategy-config.json",{cache:"no-store"}),fetch("/api/scan")]);
      if(!cr.ok || !sr.ok) throw new Error("Configuration or scan request failed: "+cr.status+" / "+sr.status);
      const cfg=await cr.json(), scan=await sr.json();
      if(!Array.isArray(scan.rows) || !cfg.assessments || !finite(cfg.minimumEdgePoints) || cfg.minimumEdgePoints<10 || !Number.isInteger(cfg.targetCount) || cfg.targetCount<1 || !finite(cfg.maximumScanAgeSeconds) || cfg.maximumScanAgeSeconds<=0) throw new Error("Invalid scan or strategy configuration");
      const input=document.getElementById("eb-stake");
      const stake=input ? Number(input.value) : 5000;
      if(!Number.isFinite(stake)||stake<=0) throw new Error("Enter a positive stake");
      const now=Date.now(), age=(now-Date.parse(scan.asOf))/1000;
      const fresh=Number.isFinite(age)&&age>=0&&age<=cfg.maximumScanAgeSeconds;
      const evaluated=[];
      for(const r of scan.rows) {
        if(String(r.c||"").toLowerCase()==="sports") continue;
        for(const side of ["YES","NO"]) {const x=evaluate(r,side,cfg,now,stake,fresh);if(x)evaluated.push(x);}
      }
      evaluated.sort((a,b)=>(b.edge===null?-Infinity:b.edge)-(a.edge===null?-Infinity:a.edge));
      const unique=xs=>{const seen=new Set();return xs.filter(x=>{if(seen.has(x.r.t))return false;seen.add(x.r.t);return true;});};
      const qualified=unique(evaluated.filter(x=>x.qualified));
      const watch=unique(evaluated.filter(x=>!x.qualified && x.edge!==null));
      status.textContent=`${qualified.length} qualifying markets within returned scan; ${scan.rows.length} scan rows. Scan as of ${scan.asOf || "unknown"}. ${scan.partial?"Scanner reports partial coverage.":"Scanner did not flag partial coverage; full-universe completeness is not independently verified."} No automatic orders.`;
      results.replaceChildren();
      function renderGroup(title, items, label) {
        const h=document.createElement("h3");h.textContent=title;results.append(h);
        if(!items.length) {line(results,"None. Missing evidence is not treated as a qualifying edge.");return;}
        for(const x of items.slice(0,cfg.targetCount)) {
          const box=document.createElement("article");box.style.cssText="border-top:1px solid #8994ad;padding:16px 0";
          const h=document.createElement("h4");h.textContent=`${label}: ${x.side} | ${x.r.e || x.r.t} | ${x.r.s || ""}`;box.append(h);
          line(box,`Ticker: ${x.r.t}. Entry ask: ${x.price} cents. ${x.edge===null?"No edge estimate":`${x.edge.toFixed(1)} percentage-point edge ${x.blockers.length?"(provisional)":"using supplied conservative probability and entry-fee assumptions"}`}.`);
          line(box,`Stake budget ${money(stake)}; ${x.desired} contracts if filled at assumed cost. Settlement gross payout if successful ${money(x.desired)}; estimated entry cost ${money(x.desired*x.cost/100)}. Full loss of entry cost remains possible. Settlement fees, if any, are not modeled.`);
          if(x.blockers.length) line(box,"Not qualified: "+x.blockers.join("; ")+".");
          const s=x.a.swing;
          if(s && s.side === x.side && httpUrl(s.sourceUrl) && typeof s.catalyst==="string" && validDate(s.catalystAt) && Date.parse(s.catalystAt)>now && typeof s.invalidation==="string" && finite(s.holdingDays) && s.holdingDays>0 && finite(s.targetCents) && s.targetCents>x.price && s.targetCents<=100 && finite(s.downsideCents) && s.downsideCents>=0 && s.downsideCents<x.price && finite(x.a.exitFeeCentsPerContract) && x.a.exitFeeCentsPerContract>=0) {
            line(box,`Supplied catalyst: ${s.catalyst}. Date: ${s.catalystAt}. Holding window: ${s.holdingDays} days. Invalidation: ${s.invalidation}. Source: ${s.sourceUrl}`);
            for(const [name,px] of [["Downside",s.downsideCents],["Target",s.targetCents]]) {
              const gross=x.desired*px/100;
              const profit=gross-x.desired*(x.cost+x.a.exitFeeCentsPerContract)/100;
              line(box,`${name} hypothetical exit at ${px} cents: gross proceeds ${money(gross)}, estimated net profit ${money(profit)}. Full-position exit liquidity is not verified; fills are not guaranteed.`);
            }
          } else line(box,"Swing assessment incomplete: verified catalyst inputs, dates, targets, downside, holding window, and exit fee assumptions are required. No swing confidence score assigned.");
          if(x.a.sourceUrl) line(box,"Probability evidence supplied: "+x.a.sourceUrl);
          results.append(box);
        }
      }
      renderGroup("Core-qualified candidates",qualified,"Qualified on supplied inputs");
      renderGroup("Research watchlist, not immediate buys",watch,"Watchlist");
    } catch(e) {status.textContent="Strategy analysis unavailable: "+e.message+". Existing board remains unchanged.";results.replaceChildren();}
    finally {busy=false;refresh.disabled=false;}
  }
  refresh.addEventListener("click",load);
  const stake=document.getElementById("eb-stake"); if(stake) stake.addEventListener("change",load);
  load();
})();
