(function(){
"use strict";
if(document.getElementById("sides-workspace"))return;
const style=document.createElement("style");style.textContent=`
#sides-workspace{max-width:1600px;margin:auto;padding:20px;color:var(--ink,inherit)}
.sw-header{position:sticky;top:0;z-index:40;background:var(--bg,#eef2f8);padding:12px 0;border-bottom:2px solid var(--line,#8994ad)}
.sw-nav{display:flex;flex-wrap:wrap;gap:10px}.sw-nav a{font:inherit;text-decoration:none;padding:10px 20px;border:2px solid var(--line,#8994ad);border-radius:12px;color:inherit;background:var(--surface,#fff)}
.sw-nav a[aria-current=page]{background:var(--accent,#5b3fd6);color:var(--accent-ink,#fff)}
.sw-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start;margin-top:20px}
.sw-page[hidden]{display:none!important}.sw-page{min-width:0}.sw-divider{border-bottom:2px solid var(--line,#8994ad);padding-bottom:14px;margin-bottom:20px}.sw-divider h1{font-size:30px;margin:0}.sw-divider p{font-size:17px;margin:6px 0}
.sw-page .sc{margin-top:0}.sw-page .eb-score{grid-template-columns:repeat(2,minmax(0,1fr))}.sw-page .eb-tablebox{overflow-x:auto}
.sw-side{position:sticky;top:100px;border:2px solid var(--line,#8994ad);border-radius:16px;background:var(--surface,#fff);padding:14px;max-height:calc(100vh - 120px);overflow:auto}
.sw-side summary{font-weight:700;cursor:pointer}.sw-summary{font-size:15px;margin:8px 0}.sw-context{font-size:15px;padding:10px;background:var(--surface-2,#edf0f7);border-radius:8px}
.sw-side #cashout-calculator{border:0!important;margin:0!important;padding:0!important;max-width:none!important}.sw-side #cashout-calculator>h2{font-size:22px}.sw-side #cashout-calculator p{font-size:15px}.sw-side #cashout-calculator label{display:block;width:100%;font-size:16px}.sw-side #cashout-calculator input,.sw-side #cashout-calculator select{display:block;width:100%;max-width:100%!important;font:inherit;padding:6px}.sw-side button{font:inherit;font-size:15px;padding:8px;margin-top:8px}
#sides-workspace .eb-nav,#sides-workspace .eb-fab{display:none!important}
@media(max-width:1050px){.sw-grid{grid-template-columns:minmax(0,1fr)}.sw-side{position:sticky;top:76px;grid-row:1;max-height:65vh;z-index:30}.sw-header{position:sticky}.sw-page .eb-score{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.append(style);
const wrap=document.querySelector(".eb-wrap");if(!wrap)return;
const shell=document.createElement("div");shell.id="sides-workspace";
const head=document.createElement("header");head.className="sw-header";
const nav=document.createElement("nav");nav.className="sw-nav";nav.setAttribute("aria-label","Workspace pages");head.append(nav);
const grid=document.createElement("div");grid.className="sw-grid";
const main=document.createElement("main"),aside=document.createElement("aside");aside.className="sw-side";aside.setAttribute("aria-label","Shared trade calculator");
const details=document.createElement("details");details.open=window.innerWidth>1050;
const summary=document.createElement("summary");summary.textContent="Trade calculator: stake and early exit";
const brief=document.createElement("p");brief.className="sw-summary";brief.textContent="Open to select a market and calculate payout.";
const context=document.createElement("p");context.className="sw-context";context.textContent="Select a market in the calculator. Selection and stake persist while switching views in this session.";
const calcSlot=document.createElement("div");details.append(summary,brief,context,calcSlot);aside.append(details);
const pages={};
for(const [key,title,description] of [["picks","Picks","Existing ranked picks and valuation logic, preserved. These legacy picks are separate from strategy-qualified candidates."],["markets","Markets","Search, filter, and compare the markets returned by the existing scanner. Coverage limitations remain."],["strategy","Strategy","Qualification and swing assessments, with missing evidence kept separate from qualified candidates."]]){
 const a=document.createElement("a");a.href="#view-"+key;a.textContent=title;nav.append(a);
 const section=document.createElement("section");section.className="sw-page";section.dataset.page=key;
 const divider=document.createElement("header");divider.className="sw-divider";const h=document.createElement("h1");h.textContent=title;const p=document.createElement("p");p.textContent=description;divider.append(h,p);section.append(divider);main.append(section);pages[key]=section;
}
const strategyPlaceholder=document.createElement("p");strategyPlaceholder.textContent="Waiting for the existing strategy module. If this remains, check that strategy-enhancement.js is installed and included before workspace-layout.js.";pages.strategy.append(strategyPlaceholder);
wrap.parentNode.insertBefore(shell,wrap);shell.append(head,grid);grid.append(main,aside);
let calc=null;
function relocate(){
 const scanner=document.getElementById("scanner");if(scanner&&scanner.parentNode!==pages.markets)pages.markets.append(scanner);
 const strategy=document.getElementById("strategy-enhancement");if(strategy&&strategy.parentNode!==pages.strategy){strategyPlaceholder.remove();pages.strategy.append(strategy);}
 const c=document.getElementById("cashout-calculator");if(c&&c!==calc){calc=c;calcSlot.append(c);wireCalculator();}
 for(const child of Array.from(wrap.children))pages.picks.append(child);
}
function show(){
 const hash=location.hash;let key=hash==="#scanner"?"markets":hash==="#top10"?"picks":hash.replace("#view-","");if(!pages[key])key="picks";
 for(const [name,page]of Object.entries(pages))page.hidden=name!==key;
 for(const a of nav.querySelectorAll("a"))if(a.hash==="#view-"+key)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
}
function wireCalculator(){
 const market=calc.querySelector("select");
 const update=()=>{
  const label=market?.selectedOptions[0]?.textContent||"No market selected";
  const stake=calc.querySelector('input[type="number"]')?.value||"";
  context.textContent="Calculator market: "+label;
  const texts=Array.from(calc.querySelectorAll("p")).map(p=>p.textContent);
  const target=texts.find(t=>t.startsWith("Hypothetical early-sale target"));
  const payout=texts.find(t=>t.startsWith("Hold all to settlement:"));
  brief.textContent="Stake budget: $"+stake+". "+(target||payout||"Enter prices to calculate.");
 };
 calc.addEventListener("input",update);calc.addEventListener("change",update);
 new MutationObserver(update).observe(calc,{childList:true,subtree:true,characterData:true});update();
}
function findContext(target){
 const row=target.closest(".eb-row,.sc-row,#strategy-enhancement article");if(!row)return;
 if(target.closest("button,input,select,a"))return;
 if(!calc){context.textContent="Calculator module not found. Install stake-cashout.js first.";return;}
 const select=calc.querySelector("select");if(!select)return;
 const extra=row.matches(".eb-row")&&row.nextElementSibling?.classList.contains("eb-detail")?row.nextElementSibling.textContent:"";
 const text=(row.textContent+" "+extra).replace(/\s+/g," ").trim();
 const options=Array.from(select.options).filter(o=>o.value);
 const exact=options.filter(o=>text.includes(o.value));
 let matches=exact;
 if(!matches.length){const title=row.querySelector(".eb-pick,.sc-mkt")?.textContent?.replace(/\s+/g," ").trim();if(title)matches=options.filter(o=>o.textContent.split(" | ")[0]===title);}
 if(matches.length!==1){context.textContent=options.length?"This row could not be matched uniquely. Select the exact market and side in the calculator; the previous selection has not changed.":"Click Load markets / refresh scan in the calculator first, then select the exact market. The calculator cannot infer unavailable data.";return;}
 select.value=matches[0].value;
 const side=calc.querySelectorAll("select")[1];const sideToken=row.querySelector("[data-side]")?.dataset.side;
 if(side&&["YES","NO"].includes(sideToken))side.value=sideToken;
 else if(side&&/\b(?:Qualified on supplied inputs|Watchlist): (YES|NO)\b/.test(text))side.value=text.match(/\b(?:Qualified on supplied inputs|Watchlist): (YES|NO)\b/)[1];
 select.dispatchEvent(new Event("change",{bubbles:true}));
 context.textContent="Matched market selected. Confirm Yes/No, verify the fee multiplier, and click Refresh selected live quote. Target sale price remains your scenario assumption.";
}
main.addEventListener("click",findContext);
relocate();show();window.addEventListener("hashchange",show);
const observer=new MutationObserver(()=>{relocate();});observer.observe(wrap,{childList:true});
setTimeout(()=>{relocate();if(!calc){const p=document.createElement("p");p.textContent="Calculator module missing. Include stake-cashout.js before this layout script.";calcSlot.append(p);}},15000);
})();