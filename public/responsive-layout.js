(function(){
"use strict";
if(window.__sidesResponsiveInstalled)return;window.__sidesResponsiveInstalled=true;
const pageSize=10;
function paginate(tbody){
 if(!tbody||tbody.dataset.responsivePager)return;
 tbody.dataset.responsivePager="true";
 const box=tbody.closest(".eb-tablebox")||tbody.parentElement;
 const controls=document.createElement("nav");controls.className="sw-pagination";controls.setAttribute("aria-label","Result pages");
 const prev=document.createElement("button"),next=document.createElement("button"),label=document.createElement("span");prev.type=next.type="button";prev.textContent="Previous";next.textContent="Next";label.setAttribute("aria-live","polite");controls.append(prev,label,next);box.after(controls);
 let current=0;
 function rows(){return Array.from(tbody.children).filter(r=>r.classList.contains("eb-row")||r.classList.contains("sc-row"));}
 function draw(reset){
  const items=rows();if(reset)current=0;const count=Math.max(1,Math.ceil(items.length/pageSize));current=Math.min(current,count-1);
  for(let i=0;i<items.length;i++){
   const hide=i<current*pageSize||i>=(current+1)*pageSize;items[i].classList.toggle("sw-page-hidden",hide);
   const detail=items[i].nextElementSibling;if(detail?.classList.contains("eb-detail"))detail.classList.toggle("sw-page-hidden",hide);
  }
  controls.hidden=items.length<=pageSize;prev.disabled=current===0;next.disabled=current>=count-1;
  label.textContent=`Page ${current+1} of ${count} (${items.length} currently rendered results)`;
 }
 prev.addEventListener("click",()=>{current--;draw(false);box.scrollIntoView({block:"start"});});
 next.addEventListener("click",()=>{current++;draw(false);box.scrollIntoView({block:"start"});});
 new MutationObserver(()=>draw(true)).observe(tbody,{childList:true});draw(true);
}
function labels(){
 const body=document.getElementById("sc-body");if(!body)return;
 const names=["Market","Category","Yes price","No price","Model probability","Edge","Open interest","Closes"];
 for(const row of body.querySelectorAll(".sc-row"))Array.from(row.children).forEach((cell,i)=>{
  if(i===0||cell.querySelector(".sw-cell-label"))return;
  const title=document.createElement("span");title.className="sw-cell-label";title.textContent=(names[i]||"Value")+": ";title.style.cssText="display:block;font-size:14px;color:var(--muted,inherit)";cell.prepend(title);
 });
}
function init(){
 paginate(document.getElementById("eb-body"));paginate(document.getElementById("sc-body"));labels();
 const body=document.getElementById("sc-body");if(body&&!body.dataset.responsiveLabels){body.dataset.responsiveLabels="true";new MutationObserver(labels).observe(body,{childList:true});}
 const details=document.querySelector(".sw-side details");
 if(details&&!details.dataset.responsiveCollapse){details.dataset.responsiveCollapse="true";const q=matchMedia("(max-width:1050px), (max-height:600px)");details.open=!q.matches;q.addEventListener("change",e=>{details.open=!e.matches;});}
}
init();setTimeout(init,1000);setTimeout(init,4000);
})();