(function(){
"use strict";
if(document.getElementById("cashout-calculator"))return;
const box=document.createElement("section");box.id="cashout-calculator";box.style.cssText="margin:30px auto;padding:24px;border:2px solid #8994ad;border-radius:20px;max-width:1232px";
function node(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n;}
box.append(node("h2","Stake, settlement, and early-sale calculator"));
box.append(node("p","Estimates only. Single binary contracts, not paired trades. Prices, available buyers, market-specific fees, and rounding can change actual proceeds. No trades are placed."));
const controls=node("div");controls.style.cssText="display:flex;flex-wrap:wrap;gap:16px";box.append(controls);
function field(label,type,value){const l=node("label",label+" ");const i=node("input");i.type=type;i.value=value;i.style.cssText="font:inherit;max-width:160px";l.append(i);controls.append(l);return i;}
const budget=field("Stake budget ($)","number",document.getElementById("eb-stake")?.value||5000);budget.min="0.01";budget.step="100";
const marketLabel=node("label","Market "),market=node("select");market.style.cssText="font:inherit;max-width:380px";market.append(new Option("Select after loading, or enter prices manually",""));marketLabel.append(market);controls.append(marketLabel);
const sideLabel=node("label","Side "),side=node("select");side.append(new Option("Yes","YES"),new Option("No","NO"));sideLabel.append(side);controls.append(sideLabel);
const entry=field("Entry ask (cents)","number",10),bid=field("Current exit bid (cents, optional)","number",""),target=field("Hypothetical early-sale price (cents)","number",40),sellPercent=field("Sell portion (%)","number",100),multiplier=field("Fee multiplier (verify market)","number",1);
for(const i of [entry,bid,target]){i.min="0";i.max="100";i.step="0.1";}sellPercent.min="0";sellPercent.max="100";multiplier.min="0";multiplier.step="0.1";
box.append(node("p","Fee estimate assumes immediately matched trades at the general 0.07 × multiplier × contracts × price × (1 − price) rate, rounded upward to cents. Verify the multiplier and fee in Kalshi's order preview. This simplified rounding may differ from actual fills. Maker or special-market fees are not modeled."));
const refresh=node("button","Load markets / refresh scan");refresh.type="button";
const quote=node("button","Refresh selected live quote");quote.type="button";box.append(refresh,document.createTextNode(" "),quote);
const status=node("p"),result=node("div");box.append(status,result);(document.querySelector(".eb-wrap")||document.body).append(box);
let rows=[],busy=false;
const fmt=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v);
const fee=(n,p,m)=>Math.ceil((.07*m*n*p*(1-p))*100-1e-9)/100;
function line(t){result.append(node("p",t));}
function calculate(){
 result.replaceChildren();const b=Number(budget.value),p=Number(entry.value)/100,t=Number(target.value)/100,f=Number(sellPercent.value)/100,m=Number(multiplier.value);
 if(!Number.isFinite(b)||b<=0||entry.value===""||!Number.isFinite(p)||p<=0||p>=1||target.value===""||!Number.isFinite(t)||t<0||t>1||sellPercent.value===""||!Number.isFinite(f)||f<0||f>1||multiplier.value===""||!Number.isFinite(m)||m<0){line("Enter a positive budget, entry between 0 and 100 cents, target between 0 and 100 cents, sale portion from 0 to 100%, and verified nonnegative fee multiplier.");return;}
 let low=0,high=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(b/p));
 while(low<high){const mid=low+Math.ceil((high-low)/2);if(mid*p+fee(mid,p,m)<=b+1e-9)low=mid;else high=mid-1;}
 const n=low,ef=fee(n,p,m),cost=n*p+ef,k=Math.floor(n*f),remaining=n-k;
 line(`Budget ${fmt(b)} buys an estimated ${n.toLocaleString()} whole contracts at the assumed ask. Contract cost ${fmt(n*p)} + estimated entry fee ${fmt(ef)} = ${fmt(cost)} total spent; unused budget ${fmt(b-cost)}.`);
 line(`Hold all to settlement: if your selected side wins, gross payout ${fmt(n)}, estimated profit ${fmt(n-cost)}. If it loses, payout $0.00 and loss ${fmt(cost)}. Settlement-fee assumption: zero; verify applicable product rules.`);
 function exit(label,x){const gross=k*x,exitFee=fee(k,x,m),net=gross-exitFee,allocated=n?cost*k/n:0,profit=net-allocated;
 line(`${label}: sell ${k.toLocaleString()} contracts at ${(x*100).toFixed(2)} cents. Gross sale ${fmt(gross)} − estimated sale fee ${fmt(exitFee)} = net sale proceeds ${fmt(net)}. Estimated realized profit/loss ${fmt(profit)}${allocated>0?` (${(100*profit/allocated).toFixed(1)}%)`:""}.`);
 if(remaining)line(`After that sale, ${remaining.toLocaleString()} contracts remain. Combined trade profit/loss would be ${fmt(net-cost)} if the remainder loses, or ${fmt(net+remaining-cost)} if it wins, under the stated settlement-fee assumption.`);
 }
 if(bid.value!==""){const x=Number(bid.value)/100;if(Number.isFinite(x)&&x>=0&&x<=1)exit("Current-bid illustration, NOT a depth-verified cash-out",x);else line("Invalid current exit bid.");}
 exit("Hypothetical early-sale target, NOT guaranteed",t);
 line("These calculations assume every purchased contract fills at the entered ask and every sold contract fills at the entered sale price. The app has not verified sufficient depth. A displayed bid is not a promise that the entire position can sell there. No probability of reaching the target is estimated.");
}
function select(){const r=rows.find(x=>x.t===market.value);if(!r)return;const a=side.value==="YES"?r.ya:r.na,b=side.value==="YES"?r.yb:r.nb;entry.value=typeof a==="number"?a:"";bid.value=typeof b==="number"?b:"";status.textContent="Selected scan quote. Verify fee multiplier for this market. Use live-quote refresh before relying on a price.";calculate();}
refresh.addEventListener("click",async()=>{if(busy)return;busy=true;refresh.disabled=true;status.textContent="Loading existing scan...";try{const r=await fetch("/api/scan");if(!r.ok)throw Error("Scan HTTP "+r.status);const d=await r.json();if(!Array.isArray(d.rows))throw Error("Unexpected scan format");rows=d.rows.filter(r=>String(r.c||"").toLowerCase()!=="sports");market.replaceChildren(new Option("Select a market",""));for(const r of rows)market.append(new Option((r.e||r.t)+" | "+(r.s||r.t),r.t));status.textContent=`Loaded ${rows.length} filtered scan rows. Scan timestamp: ${d.asOf||"unknown"}. Coverage may be incomplete. Select a market to calculate.`;}catch(e){status.textContent=e.message+". Manual price calculation remains available.";}finally{busy=false;refresh.disabled=false;}});
quote.addEventListener("click",async()=>{if(!market.value){status.textContent="Select a loaded market first.";return;}quote.disabled=true;try{const r=await fetch("/api/prices?tickers="+encodeURIComponent(market.value),{cache:"no-store"});if(!r.ok)throw Error("Quote HTTP "+r.status);const d=await r.json(),q=d.markets?.[market.value];if(!q)throw Error("No quote returned");const a=side.value==="YES"?q.yes_ask:q.no_ask,b=side.value==="YES"?q.yes_bid:q.no_bid;entry.value=typeof a==="number"?a:"";bid.value=typeof b==="number"?b:"";status.textContent="Relay quote timestamp: "+(d.asOf||"unknown")+". Relay caching may apply; no order-book depth verified.";calculate();}catch(e){bid.value="";status.textContent=e.message+". Current exit bid cleared; entry remains an illustrative assumption.";calculate();}finally{quote.disabled=false;}});
market.addEventListener("change",select);side.addEventListener("change",select);
for(const i of [budget,entry,bid,target,sellPercent,multiplier])i.addEventListener("input",calculate);
const original=document.getElementById("eb-stake");if(original)original.addEventListener("input",()=>{budget.value=original.value;calculate();});
calculate();
})();