/* ================= Захват мира ================= */
const KEY = "conquer_world_v1";
const PALETTE = ["#5E9FE8","#EAC26B","#72BC8F","#BF8EDA","#DE9255","#DF84A8","#4FB9C9","#E97366"];
const STATE_COLORS = ["#5E9FE8","#72BC8F","#EAC26B","#DE9255","#E97366","#DF84A8","#BF8EDA","#4FB9C9"];
const EMBLEMS = ["🚩","👑","🦅","🐺","🔱","⚔️","🛡️","🌟","🔥","🐉","⚓","🏰"];
const OCEAN_TOP = "#121820", OCEAN_BOT = "#0C1016";
const TARGET_COLOR = "#DE9255";

/* ---------- utils ---------- */
const $ = (id) => document.getElementById(id);
function hex2rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function rgb2hex(c){ return "#" + c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
function mix(a,b,t){ const A=hex2rgb(a), B=hex2rgb(b); return rgb2hex([0,1,2].map(i=>A[i]+(B[i]-A[i])*t)); }
function countryColor(i){ return mix(PALETTE[(i*3)%PALETTE.length], "#13171D", 0.74); }
function nowStr(){ const d=new Date(); return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"short"})+" "+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function plural(n,a,b,c){ const m=n%100, k=n%10; return n+" "+(m>=11&&m<=14?c:k===1?a:k>=2&&k<=4?b:c); }

/* ---------- storage ---------- */
let db = { profiles: [], current: null };
function load(){ try{ const raw=localStorage.getItem(KEY); if(raw) db=JSON.parse(raw); }catch(e){} }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }

/* ---------- grid ---------- */
const gridCache = {};
function decodeGrid(deg){
  const k = String(deg);
  if (gridCache[k]) return gridCache[k];
  const src = GRID_DATA[k];
  const cells = new Int16Array(src.cols*src.rows);
  let p = 0;
  for (const part of src.rle.split(";")){
    if(!part) continue;
    const c = part.indexOf(",");
    const v = parseInt(part.slice(0,c),10), n = parseInt(part.slice(c+1),10);
    cells.fill(v, p, p+n); p += n;
  }
  const n = COUNTRIES.length;
  const counts = new Int32Array(n), sx = new Float64Array(n), sy = new Float64Array(n);
  for(let y=0;y<src.rows;y++) for(let x=0;x<src.cols;x++){
    const v = cells[y*src.cols+x];
    if(v<0) continue;
    counts[v]++; sx[v]+=x; sy[v]+=y;
  }
  const centroids = [];
  for(let i=0;i<n;i++) centroids.push(counts[i] ? {x:sx[i]/counts[i], y:sy[i]/counts[i]} : null);
  const capitals = new Int32Array(n).fill(-1);
  const best = new Float64Array(n).fill(Infinity);
  for(let y=0;y<src.rows;y++) for(let x=0;x<src.cols;x++){
    const idx=y*src.cols+x, v=cells[idx];
    if(v<0) continue;
    const c=centroids[v], d=(c.x-x)**2+(c.y-y)**2;
    if(d<best[v]){ best[v]=d; capitals[v]=idx; }
  }
  return (gridCache[k] = {deg:+deg, cols:src.cols, rows:src.rows, land:src.land, cells, counts, centroids, capitals});
}

/* ---------- runtime ---------- */
const P = { prof:null, grid:null, owned:new Set(), byCountry:null, sumX:0, sumY:0 };
let view = { s: 6, ox: 0, oy: 0 };
let hoverCountry = -1;

function activate(prof){
  P.prof = prof;
  P.grid = decodeGrid(prof.deg);
  P.owned = new Set(prof.owned);
  P.byCountry = new Int32Array(COUNTRIES.length);
  P.sumX = 0; P.sumY = 0;
  for(const i of P.owned){
    const v=P.grid.cells[i];
    if(v>=0) P.byCountry[v]++;
    P.sumX += i % P.grid.cols; P.sumY += Math.floor(i / P.grid.cols);
  }
  document.documentElement.style.setProperty("--accent", prof.color);
  document.documentElement.style.setProperty("--accent-soft", mix(prof.color, "#101012", 0.82));
  const lm = $("legendMine"); if(lm) lm.style.background = prof.color;
}
function ownedCentroid(){
  const n = P.owned.size || 1;
  return { x: P.sumX/n, y: P.sumY/n };
}
function dist2(i, pt){
  const g=P.grid, x=i%g.cols, y=Math.floor(i/g.cols);
  let dx=Math.abs(x-pt.x); dx=Math.min(dx, g.cols-dx);
  const dy=y-pt.y;
  return dx*dx+dy*dy;
}
function neighbors(i){
  const g=P.grid, x=i%g.cols, y=Math.floor(i/g.cols), out=[];
  out.push(y*g.cols + ((x+1)%g.cols));
  out.push(y*g.cols + ((x-1+g.cols)%g.cols));
  if(y>0) out.push((y-1)*g.cols+x);
  if(y<g.rows-1) out.push((y+1)*g.cols+x);
  return out;
}
function frontier(){
  const g=P.grid, out=[];
  for(const i of P.owned) for(const j of neighbors(i))
    if(g.cells[j]>=0 && !P.owned.has(j)) out.push(j);
  return [...new Set(out)];
}
function nearestTo(list, pt){
  let best=list[0], bd=Infinity;
  for(const i of list){ const d=dist2(i, pt); if(d<bd){ bd=d; best=i; } }
  return best;
}
function addCell(i){
  const g=P.grid;
  P.owned.add(i); P.prof.owned.push(i);
  const v=g.cells[i]; if(v>=0) P.byCountry[v]++;
  P.sumX += i%g.cols; P.sumY += Math.floor(i/g.cols);
}

function claimOne(){
  const g=P.grid;
  if(P.owned.size >= g.land) return false;
  if(P.owned.size === 0){
    let start = g.capitals[P.prof.country];
    if(start < 0) start = g.cells.findIndex(v=>v>=0);
    P.prof.start = start;
    addCell(start);
    return true;
  }
  const t = (P.prof.target != null && P.byCountry[P.prof.target] < g.counts[P.prof.target]) ? P.prof.target : null;
  const fr = frontier();
  let pick = null;
  if(fr.length){
    if(t != null){
      const inT = fr.filter(i => g.cells[i] === t);
      pick = inT.length ? nearestTo(inT, g.centroids[t]) : nearestTo(fr, g.centroids[t]);
    } else {
      const home = fr.filter(i => g.cells[i] === P.prof.country);
      pick = home.length ? nearestTo(home, g.centroids[P.prof.country]) : nearestTo(fr, ownedCentroid());
    }
  } else {
    const pool=[];
    for(let i=0;i<g.cells.length;i++)
      if(g.cells[i]>=0 && !P.owned.has(i) && (t==null || g.cells[i]===t)) pool.push(i);
    if(!pool.length) for(let i=0;i<g.cells.length;i++) if(g.cells[i]>=0 && !P.owned.has(i)) pool.push(i);
    if(!pool.length) return false;
    pick = nearestTo(pool, ownedCentroid());
  }
  addCell(pick);
  if(t != null && P.byCountry[t] >= g.counts[t]){
    pushLog(`Страна ${COUNTRIES[t].name} захвачена полностью`);
    P.prof.target = null;
  }
  return true;
}

function pushLog(text){
  P.prof.log.unshift({ t: nowStr(), text });
  P.prof.log = P.prof.log.slice(0, 60);
}

/* ---------- game actions ---------- */
function createProfile(stateName, countryIndex, deg, opts){
  opts = opts || {};
  const prof = {
    id: uid(),
    name: stateName || "Моя держава",
    emblem: opts.emblem || EMBLEMS[0],
    color: opts.color || STATE_COLORS[0],
    country: countryIndex,
    deg: +deg,
    start: null,
    owned: [],
    tasks: [],
    log: [],
    target: null,
    created: Date.now(),
  };
  db.profiles.unshift(prof);
  db.current = prof.id;
  activate(prof);
  pushLog(`Держава «${prof.name}» основана в стране ${COUNTRIES[countryIndex].name}`);
  claimOne();
  save(); renderAll(); fitView(); draw();
  return prof;
}

function completeTask(taskId){
  if(!P.prof) return;
  const task = P.prof.tasks.find(t=>t.id===taskId);
  if(!task) return;
  task.count = (task.count||0) + 1;
  let got = 0;
  for(let i=0;i<task.reward;i++) if(claimOne()) got++;
  pushLog(`${task.name} — +${plural(got,"клетка","клетки","клеток")}`);
  save(); renderAll(); draw();
}

function setTarget(idx){
  if(!P.prof) return;
  if(idx != null && P.byCountry[idx] >= P.grid.counts[idx]) idx = null;
  P.prof.target = idx;
  if(idx != null) pushLog(`Новая цель наступления: ${COUNTRIES[idx].name}`);
  save(); renderAll(); draw();
}

/* ---------- rendering: sidebar ---------- */
function renderAll(){
  renderCrest();
  renderOverview();
  renderTargets();
  renderTasks();
  renderLog();
  renderProfiles();
}

function renderCrest(){
  const p = P.prof;
  $("crestSigil").textContent = p ? p.emblem : "🚩";
  $("crestName").textContent = p ? p.name : "Захват мира";
  $("crestSub").textContent = p
    ? `${COUNTRIES[p.country].name} · клетка ${p.deg}°`
    : "клетка за выполненную задачу";
  $("editStateBtn").style.visibility = p ? "visible" : "hidden";
  $("mapTitle").innerHTML = p
    ? `<b>${escapeHtml(p.name)}</b> · старт: ${COUNTRIES[p.country].name} · клетка ${p.deg}°`
    : "Профиль не выбран";
}

function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

function renderOverview(){
  if(!P.prof){
    $("pct").textContent="0%"; $("cells").textContent="0 / 0 клеток";
    $("barFill").style.width="0%"; $("statCountries").textContent="0"; $("statDone").textContent="0";
    return;
  }
  const g=P.grid, own=P.owned.size, pct=own/g.land*100;
  $("pct").textContent = (pct<10 ? pct.toFixed(1) : Math.round(pct)) + "%";
  $("cells").textContent = `${own} / ${g.land} клеток`;
  $("barFill").style.width = Math.max(1, pct) + "%";
  let full=0, total=0;
  for(let i=0;i<COUNTRIES.length;i++){ if(g.counts[i]>0){ total++; if(P.byCountry[i]>=g.counts[i]) full++; } }
  $("statCountries").textContent = `${full} / ${total}`;
  $("statDone").textContent = P.prof.tasks.reduce((s,t)=>s+(t.count||0),0);
  $("winMsg").style.display = own>=g.land ? "block" : "none";
}

function renderTargets(){
  const sel=$("targetSel"), note=$("targetNote");
  sel.innerHTML="";
  if(!P.prof){ sel.disabled=true; note.textContent="Создай игру, чтобы выбирать направление."; return; }
  sel.disabled=false;
  const g=P.grid;
  const auto=document.createElement("option");
  auto.value=""; auto.textContent="Авто — ближайшие земли";
  sel.appendChild(auto);

  const neighborsSet=new Set();
  for(const i of P.owned) for(const j of neighbors(i)){
    const v=g.cells[j];
    if(v>=0 && P.byCountry[v]<g.counts[v]) neighborsSet.add(v);
  }
  const rest=[];
  for(let i=0;i<COUNTRIES.length;i++)
    if(g.counts[i]>0 && P.byCountry[i]<g.counts[i] && !neighborsSet.has(i)) rest.push(i);

  const addGroup=(label, list)=>{
    if(!list.length) return;
    const og=document.createElement("optgroup"); og.label=label;
    list.sort((a,b)=>COUNTRIES[a].name.localeCompare(COUNTRIES[b].name,"ru"));
    for(const i of list){
      const o=document.createElement("option");
      o.value=String(i);
      o.textContent=`${COUNTRIES[i].name} (${P.byCountry[i]}/${g.counts[i]})`;
      og.appendChild(o);
    }
    sel.appendChild(og);
  };
  addGroup("Соседи на границе", [...neighborsSet]);
  addGroup("Остальные страны", rest);
  sel.value = P.prof.target != null ? String(P.prof.target) : "";

  const t=P.prof.target;
  if(t==null){
    note.innerHTML = "Режим <b>Авто</b>: сначала добиваем родную страну, затем ближайшие земли. Цель можно выбрать кликом по карте.";
  } else {
    const border = neighborsSet.has(t);
    note.innerHTML = `Воюем со страной <b>${escapeHtml(COUNTRIES[t].name)}</b> — ${border?"граница общая":"идём к ней через чужие земли или морем"}. Захвачено ${P.byCountry[t]} из ${g.counts[t]} клеток.`;
  }
}

function renderTasks(){
  const box=$("taskList"); box.innerHTML="";
  if(!P.prof){ box.innerHTML='<div class="empty">Создай игру во вкладке «Игры».</div>'; return; }
  if(!P.prof.tasks.length){
    box.innerHTML='<div class="empty">Задач пока нет. Добавь свою первую задачу — например «Подтягивания» или «Учёба» — и получай клетки за её выполнение.</div>';
    return;
  }
  for(const t of P.prof.tasks){
    const row=document.createElement("div"); row.className="task";
    row.innerHTML = `<span class="name">${escapeHtml(t.name)}</span>
      <span class="cnt">×${t.count||0}</span>
      <button class="btn sm primary" data-do="${t.id}">+${t.reward}</button>
      <button class="del" data-del="${t.id}" aria-label="Удалить">×</button>`;
    box.appendChild(row);
  }
  box.querySelectorAll("[data-do]").forEach(b=>b.onclick=()=>completeTask(b.dataset.do));
  box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    P.prof.tasks = P.prof.tasks.filter(x=>x.id!==b.dataset.del);
    save(); renderTasks(); renderOverview();
  });
}

function renderLog(){
  const ul=$("log"); ul.innerHTML="";
  if(!P.prof || !P.prof.log.length){
    ul.innerHTML='<li>Пока пусто. Выполняй задачи — здесь появится хроника захвата.</li>';
    return;
  }
  for(const e of P.prof.log){
    const li=document.createElement("li");
    li.innerHTML = `<b>${escapeHtml(e.text)}</b><br>${e.t}`;
    ul.appendChild(li);
  }
}

function renderProfiles(){
  const box=$("profileList"); box.innerHTML="";
  if(!db.profiles.length){ box.innerHTML='<div class="empty">Профилей пока нет.</div>'; return; }
  for(const p of db.profiles){
    const g=decodeGrid(p.deg);
    const pct=(p.owned.length/g.land*100);
    const row=document.createElement("div");
    row.className="prof"+(db.current===p.id?" active":"");
    row.innerHTML = `<span class="sig" style="color:${p.color}">${p.emblem}</span>
      <span class="pn"><b>${escapeHtml(p.name)}</b><small>${COUNTRIES[p.country].name} · ${p.deg}° · ${pct<10?pct.toFixed(1):Math.round(pct)}%</small></span>
      <button class="del" data-del="${p.id}" aria-label="Удалить профиль">×</button>`;
    row.querySelector(".pn").onclick = ()=>{ db.current=p.id; activate(p); save(); renderAll(); fitView(); draw(); };
    row.querySelector(".sig").onclick = ()=>{ db.current=p.id; activate(p); save(); renderAll(); fitView(); draw(); };
    row.querySelector("[data-del]").onclick = (e)=>{
      e.stopPropagation();
      db.profiles = db.profiles.filter(x=>x.id!==p.id);
      if(db.current===p.id){
        db.current = db.profiles[0] ? db.profiles[0].id : null;
        if(db.profiles[0]) activate(db.profiles[0]); else { P.prof=null; P.owned=new Set(); }
      }
      save(); renderAll(); draw();
    };
    box.appendChild(row);
  }
}

/* ---------- map ---------- */
const canvas = $("map");
const ctx = canvas.getContext("2d");
let W=0, H=0;

function resize(){
  const r=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  W=r.width; H=r.height;
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}
function fitView(){
  if(!P.grid) return;
  const g=P.grid;
  view.s = Math.min(W/g.cols, H/g.rows)*0.94;
  view.ox = (W - g.cols*view.s)/2;
  view.oy = (H - g.rows*view.s)/2;
}
function centerOn(cellIndex, scale){
  if(!P.grid) return;
  const g=P.grid;
  view.s = scale || Math.max(view.s, Math.min(W/g.cols, H/g.rows)*3);
  const x=cellIndex%g.cols, y=Math.floor(cellIndex/g.cols);
  view.ox = W/2 - (x+0.5)*view.s;
  view.oy = H/2 - (y+0.5)*view.s;
}

function draw(){
  if(!ctx) return;
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,OCEAN_TOP); grad.addColorStop(1,OCEAN_BOT);
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  if(!P.grid) return;
  const g=P.grid, s=view.s;

  // graticule
  ctx.strokeStyle="rgba(255,255,255,.035)"; ctx.lineWidth=1;
  const step = Math.max(1, Math.round(30/g.deg));
  ctx.beginPath();
  for(let x=0;x<=g.cols;x+=step){ const px=view.ox+x*s; ctx.moveTo(px, view.oy); ctx.lineTo(px, view.oy+g.rows*s); }
  for(let y=0;y<=g.rows;y+=step){ const py=view.oy+y*s; ctx.moveTo(view.ox, py); ctx.lineTo(view.ox+g.cols*s, py); }
  ctx.stroke();

  const mine = P.prof ? P.prof.color : "#5E9FE8";
  const mineSoft = mix(mine, "#FFFFFF", 0.25);
  const target = P.prof ? P.prof.target : null;
  const home = P.prof ? P.prof.country : -1;
  const gap = s>=5 ? 0.5 : 0;
  const x0=Math.max(0, Math.floor((-view.ox)/s)-1), x1=Math.min(g.cols, Math.ceil((W-view.ox)/s)+1);
  const y0=Math.max(0, Math.floor((-view.oy)/s)-1), y1=Math.min(g.rows, Math.ceil((H-view.oy)/s)+1);

  for(let y=y0;y<y1;y++){
    for(let x=x0;x<x1;x++){
      const i=y*g.cols+x, v=g.cells[i];
      if(v<0) continue;
      let color;
      if(P.owned.has(i)) color = mine;
      else if(v===target) color = mix(TARGET_COLOR, "#13171D", 0.42);
      else if(v===home) color = mix(countryColor(v), "#FFFFFF", 0.26);
      else color = countryColor(v);
      ctx.fillStyle = color;
      ctx.fillRect(view.ox+x*s, view.oy+y*s, s-gap, s-gap);
      if(v===hoverCountry && hoverCountry>=0 && !P.owned.has(i)){
        ctx.fillStyle="rgba(255,255,255,.10)";
        ctx.fillRect(view.ox+x*s, view.oy+y*s, s-gap, s-gap);
      }
    }
  }

  // frontier outline of my territory
  if(s>=2.2){
    ctx.strokeStyle=mineSoft; ctx.lineWidth=Math.min(2, Math.max(1, s*0.12));
    ctx.beginPath();
    for(const i of P.owned){
      const x=i%g.cols, y=Math.floor(i/g.cols);
      if(x<x0-1||x>x1||y<y0-1||y>y1) continue;
      const px=view.ox+x*s, py=view.oy+y*s;
      if(!P.owned.has(y*g.cols+((x+1)%g.cols))){ ctx.moveTo(px+s,py); ctx.lineTo(px+s,py+s); }
      if(!P.owned.has(y*g.cols+((x-1+g.cols)%g.cols))){ ctx.moveTo(px,py); ctx.lineTo(px,py+s); }
      if(y>0 && !P.owned.has((y-1)*g.cols+x)){ ctx.moveTo(px,py); ctx.lineTo(px+s,py); }
      if(y<g.rows-1 && !P.owned.has((y+1)*g.cols+x)){ ctx.moveTo(px,py+s); ctx.lineTo(px+s,py+s); }
    }
    ctx.stroke();
  }

  // target country outline
  if(target!=null && s>=2.2){
    ctx.strokeStyle=TARGET_COLOR; ctx.lineWidth=Math.min(2, Math.max(1, s*0.14));
    ctx.beginPath();
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
      const i=y*g.cols+x;
      if(g.cells[i]!==target) continue;
      const px=view.ox+x*s, py=view.oy+y*s;
      const eq=(j)=>g.cells[j]===target;
      if(!eq(y*g.cols+((x+1)%g.cols))){ ctx.moveTo(px+s,py); ctx.lineTo(px+s,py+s); }
      if(!eq(y*g.cols+((x-1+g.cols)%g.cols))){ ctx.moveTo(px,py); ctx.lineTo(px,py+s); }
      if(y>0 && !eq((y-1)*g.cols+x)){ ctx.moveTo(px,py); ctx.lineTo(px+s,py); }
      if(y<g.rows-1 && !eq((y+1)*g.cols+x)){ ctx.moveTo(px,py+s); ctx.lineTo(px+s,py+s); }
    }
    ctx.stroke();
  }
}

/* ---------- interaction ---------- */
let dragging=false, moved=false, last=null;
canvas.addEventListener("mousedown", e=>{ dragging=true; moved=false; last={x:e.clientX,y:e.clientY}; canvas.classList.add("drag"); });
window.addEventListener("mouseup", ()=>{ dragging=false; canvas.classList.remove("drag"); });
canvas.addEventListener("mousemove", e=>{
  if(dragging){
    const dx=e.clientX-last.x, dy=e.clientY-last.y;
    if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
    view.ox+=dx; view.oy+=dy; last={x:e.clientX,y:e.clientY};
    draw(); return;
  }
  const c=cellAt(e);
  const v = c==null ? -1 : P.grid.cells[c];
  if(v!==hoverCountry){ hoverCountry=v; draw(); updateHint(v); }
});
canvas.addEventListener("mouseleave", ()=>{ hoverCountry=-1; draw(); updateHint(-1); });
canvas.addEventListener("click", e=>{
  if(moved || !P.prof) return;
  const c=cellAt(e); if(c==null) return;
  const v=P.grid.cells[c];
  if(v<0) return;
  setTarget(P.prof.target===v ? null : v);
});
canvas.addEventListener("wheel", e=>{
  e.preventDefault();
  if(!P.grid) return;
  const r=canvas.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
  const f = e.deltaY<0 ? 1.15 : 1/1.15;
  const ns = Math.max(0.6, Math.min(40, view.s*f));
  view.ox = mx - (mx-view.ox)*(ns/view.s);
  view.oy = my - (my-view.oy)*(ns/view.s);
  view.s = ns; draw();
}, {passive:false});

function cellAt(e){
  if(!P.grid) return null;
  const r=canvas.getBoundingClientRect();
  const x=Math.floor((e.clientX-r.left-view.ox)/view.s);
  const y=Math.floor((e.clientY-r.top-view.oy)/view.s);
  if(x<0||y<0||x>=P.grid.cols||y>=P.grid.rows) return null;
  return y*P.grid.cols+x;
}
function updateHint(v){
  const h=$("hint");
  if(v<0 || !P.prof){
    h.textContent="Клик по стране — выбрать цель · перетаскивание — двигать карту · колесо — масштаб";
    return;
  }
  h.innerHTML = `<b>${escapeHtml(COUNTRIES[v].name)}</b> — захвачено ${P.byCountry[v]} из ${P.grid.counts[v]} клеток · клик, чтобы наступать сюда`;
}

/* ---------- tabs ---------- */
document.querySelectorAll(".tabs button").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected", String(b===btn)));
    document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on", p.id==="pane-"+btn.dataset.tab));
  };
});

/* ---------- pickers ---------- */
function buildPicker(el, items, current, onPick, isColor){
  el.innerHTML="";
  items.forEach(val=>{
    const b=document.createElement("button");
    b.type="button";
    if(isColor){ b.style.background=val; b.setAttribute("aria-label", "Цвет "+val); }
    else b.textContent=val;
    b.setAttribute("aria-pressed", String(val===current));
    b.onclick=()=>{ [...el.children].forEach(c=>c.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); onPick(val); };
    el.appendChild(b);
  });
}

/* ---------- new game modal ---------- */
let newGame = { emblem: EMBLEMS[0], color: STATE_COLORS[0] };
let stateEdit = { emblem: EMBLEMS[0], color: STATE_COLORS[0] };

function fillCountrySelect(){
  const sel=$("gCountry"); sel.innerHTML="";
  COUNTRIES.map((c,i)=>({c,i})).sort((a,b)=>a.c.name.localeCompare(b.c.name,"ru")).forEach(({c,i})=>{
    const o=document.createElement("option"); o.value=String(i); o.textContent=c.name; sel.appendChild(o);
  });
  const ru=COUNTRIES.findIndex(c=>c.name==="Россия");
  sel.value=String(ru>=0?ru:0);
}
function updateSizeInfo(){
  const deg=$("gSize").value, g=GRID_DATA[deg];
  $("sizeInfo").textContent = `${g.land} клеток суши — столько задач нужно выполнить для полного захвата мира.`;
}
function openNewGame(){
  newGame = { emblem: EMBLEMS[0], color: STATE_COLORS[0] };
  $("gState").value="";
  buildPicker($("gEmblem"), EMBLEMS, newGame.emblem, v=>newGame.emblem=v, false);
  buildPicker($("gColor"), STATE_COLORS, newGame.color, v=>newGame.color=v, true);
  updateSizeInfo();
  $("modal").classList.add("open");
}
$("newGameBtn").onclick=openNewGame;
$("cancelGame").onclick=()=>{ if(db.profiles.length) $("modal").classList.remove("open"); };
$("gSize").onchange=updateSizeInfo;
$("startGame").onclick=()=>{
  const name=$("gState").value.trim() || "Моя держава";
  createProfile(name, +$("gCountry").value, $("gSize").value, newGame);
  $("modal").classList.remove("open");
};

/* ---------- state customization ---------- */
$("editStateBtn").onclick=()=>{
  if(!P.prof) return;
  stateEdit={ emblem:P.prof.emblem, color:P.prof.color };
  $("sState").value=P.prof.name;
  buildPicker($("sEmblem"), EMBLEMS, stateEdit.emblem, v=>stateEdit.emblem=v, false);
  buildPicker($("sColor"), STATE_COLORS, stateEdit.color, v=>stateEdit.color=v, true);
  $("stateModal").classList.add("open");
};
$("cancelState").onclick=()=>$("stateModal").classList.remove("open");
$("saveState").onclick=()=>{
  if(!P.prof) return;
  P.prof.name = $("sState").value.trim() || P.prof.name;
  P.prof.emblem = stateEdit.emblem;
  P.prof.color = stateEdit.color;
  activate(P.prof);
  save(); renderAll(); draw();
  $("stateModal").classList.remove("open");
};

/* ---------- tasks add ---------- */
$("addTaskBtn").onclick=()=>{
  if(!P.prof) return;
  const name=$("newTaskName").value.trim();
  if(!name) return;
  const reward=Math.max(1, Math.min(20, parseInt($("newTaskReward").value,10)||1));
  P.prof.tasks.push({ id:uid(), name, reward, count:0 });
  $("newTaskName").value="";
  save(); renderTasks(); renderOverview();
};
$("newTaskName").addEventListener("keydown", e=>{ if(e.key==="Enter") $("addTaskBtn").click(); });

/* ---------- zoom buttons ---------- */
$("zoomIn").onclick=()=>{ view.s=Math.min(40, view.s*1.3); view.ox=W/2-(W/2-view.ox)*1.3; view.oy=H/2-(H/2-view.oy)*1.3; draw(); };
$("zoomOut").onclick=()=>{ const f=1/1.3; view.s=Math.max(0.6, view.s*f); view.ox=W/2-(W/2-view.ox)*f; view.oy=H/2-(H/2-view.oy)*f; draw(); };
$("zoomFit").onclick=()=>{ fitView(); draw(); };
$("zoomHome").onclick=()=>{ if(P.prof && P.prof.start!=null){ centerOn(P.prof.start); draw(); } };
$("targetSel").onchange=e=>setTarget(e.target.value==="" ? null : +e.target.value);

/* ---------- boot ---------- */
load();
fillCountrySelect();
window.addEventListener("resize", resize);
if(db.profiles.length){
  const prof = db.profiles.find(p=>p.id===db.current) || db.profiles[0];
  db.current = prof.id;
  // миграция старых профилей
  prof.emblem = prof.emblem || EMBLEMS[0];
  prof.color = prof.color || STATE_COLORS[0];
  prof.log = prof.log || [];
  prof.tasks = prof.tasks || [];
  activate(prof);
  renderAll();
  resize(); fitView(); draw();
} else {
  renderAll();
  resize();
  openNewGame();
}
