/* ================= Захват мира ================= */
const KEY = "conquer_world_v1";
const PALETTE = ["#5E9FE8","#EAC26B","#72BC8F","#BF8EDA","#DE9255","#DF84A8","#4FB9C9","#E97366"];
const FLAG_COLORS = [
  "#5E9FE8","#3C6FD0","#1E3A8A","#4FB9C9",
  "#72BC8F","#2F8F5B","#EAC26B","#E8A33D",
  "#DE9255","#E23A3A","#A32222","#DF84A8",
  "#BF8EDA","#7B57D6","#F5F5F4","#16181C"
];
const EMBLEMS = ["","🚩","👑","🦅","🐺","🔱","⚔️","🛡️","🌟","⭐","🔥","🐉","⚓","🏰","☀️","🌙","🍀","⚙️"];
const PATTERNS = ["solid","hstripes","vstripes","cross","nordic","diag","quad","border","sun"];
const OCEAN_TOP = "#121820", OCEAN_BOT = "#0C1016";
const TARGET_COLOR = "#DE9255";
const DEFAULT_FLAG = { pattern:"hstripes", colors:["#5E9FE8","#F5F5F4","#E23A3A"], emblem:"🚩" };

/* ---------- utils ---------- */
const $ = (id) => document.getElementById(id);
function hex2rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function rgb2hex(c){ return "#" + c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join(""); }
function mix(a,b,t){ const A=hex2rgb(a), B=hex2rgb(b); return rgb2hex([0,1,2].map(i=>A[i]+(B[i]-A[i])*t)); }
function countryColor(i){ return mix(PALETTE[(i*3)%PALETTE.length], "#13171D", 0.74); }
function nowStr(){ const d=new Date(); return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"short"})+" "+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function plural(n,a,b,c){ const m=n%100, k=n%10; return n+" "+(m>=11&&m<=14?c:k===1?a:k>=2&&k<=4?b:c); }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

/* ---------- storage ---------- */
let db = { profiles: [], current: null };
function normalizeFlag(f, fallbackColor, fallbackEmblem){
  const base = clone(DEFAULT_FLAG);
  if(fallbackColor) base.colors[0] = fallbackColor;
  if(fallbackEmblem) base.emblem = fallbackEmblem;
  if(!f || typeof f !== "object") return base;
  const pattern = PATTERNS.includes(f.pattern) ? f.pattern : base.pattern;
  const colors = [0,1,2].map(i => (typeof f.colors?.[i] === "string" && /^#[0-9a-fA-F]{6}$/.test(f.colors[i])) ? f.colors[i] : base.colors[i]);
  const emblem = typeof f.emblem === "string" ? f.emblem : base.emblem;
  return { pattern, colors, emblem };
}
function normalizeProfile(p){
  if(!p || typeof p !== "object") return null;
  p.id = p.id || uid();
  p.name = typeof p.name === "string" && p.name.trim() ? p.name : "Моя держава";
  if(typeof p.country !== "number" || p.country < 0 || p.country >= COUNTRIES.length) p.country = 0;
  if(!GRID_DATA[String(p.deg)]) p.deg = 2;
  p.deg = +p.deg;
  p.flag = normalizeFlag(p.flag, typeof p.color === "string" ? p.color : null, p.emblem);
  p.color = p.flag.colors[0];
  p.emblem = p.flag.emblem || "🚩";
  p.owned = Array.isArray(p.owned) ? [...new Set(p.owned.filter(n=>Number.isInteger(n) && n>=0))] : [];
  p.tasks = Array.isArray(p.tasks) ? p.tasks.filter(t=>t && t.name).map(t=>({
    id: t.id || uid(),
    name: String(t.name),
    reward: Math.max(1, Math.min(20, parseInt(t.reward,10) || 1)),
    count: Math.max(0, parseInt(t.count,10) || 0),
  })) : [];
  p.log = Array.isArray(p.log) ? p.log.slice(0,60) : [];
  if(typeof p.target !== "number" || p.target < 0 || p.target >= COUNTRIES.length) p.target = null;
  if(typeof p.start !== "number") p.start = null;
  p.created = p.created || Date.now();
  return p;
}
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === "object"){
        db.profiles = Array.isArray(parsed.profiles) ? parsed.profiles.map(normalizeProfile).filter(Boolean) : [];
        db.current = parsed.current || null;
      }
    }
  }catch(e){ db = { profiles: [], current: null }; }
  if(!db.profiles.some(p=>p.id===db.current)) db.current = db.profiles[0] ? db.profiles[0].id : null;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }

/* ---------- flags ---------- */
function drawFlag(c2d, x, y, w, h, flag){
  const f = normalizeFlag(flag);
  const [c1, c2, c3] = f.colors;
  c2d.save();
  c2d.beginPath(); c2d.rect(x, y, w, h); c2d.clip();
  c2d.fillStyle = c1; c2d.fillRect(x, y, w, h);
  switch(f.pattern){
    case "hstripes":
      c2d.fillStyle = c2; c2d.fillRect(x, y + h/3, w, h/3);
      c2d.fillStyle = c3; c2d.fillRect(x, y + 2*h/3, w, h/3);
      break;
    case "vstripes":
      c2d.fillStyle = c2; c2d.fillRect(x + w/3, y, w/3, h);
      c2d.fillStyle = c3; c2d.fillRect(x + 2*w/3, y, w/3, h);
      break;
    case "cross":
      c2d.fillStyle = c3; c2d.fillRect(x + w*0.36, y, w*0.28, h);
      c2d.fillRect(x, y + h*0.36, w, h*0.28);
      c2d.fillStyle = c2; c2d.fillRect(x + w*0.41, y, w*0.18, h);
      c2d.fillRect(x, y + h*0.41, w, h*0.18);
      break;
    case "nordic":
      c2d.fillStyle = c3; c2d.fillRect(x + w*0.23, y, w*0.26, h);
      c2d.fillRect(x, y + h*0.36, w, h*0.28);
      c2d.fillStyle = c2; c2d.fillRect(x + w*0.28, y, w*0.16, h);
      c2d.fillRect(x, y + h*0.42, w, h*0.16);
      break;
    case "diag":
      c2d.fillStyle = c2;
      c2d.beginPath(); c2d.moveTo(x, y); c2d.lineTo(x + w, y); c2d.lineTo(x, y + h); c2d.closePath(); c2d.fill();
      c2d.strokeStyle = c3; c2d.lineWidth = Math.max(1, h*0.06);
      c2d.beginPath(); c2d.moveTo(x + w, y); c2d.lineTo(x, y + h); c2d.stroke();
      break;
    case "quad":
      c2d.fillStyle = c2; c2d.fillRect(x + w/2, y, w/2, h/2); c2d.fillRect(x, y + h/2, w/2, h/2);
      c2d.fillStyle = c3; c2d.fillRect(x, y, w*0.06, h);
      break;
    case "border":
      c2d.fillStyle = c2; c2d.fillRect(x + w*0.09, y + h*0.12, w*0.82, h*0.76);
      c2d.fillStyle = c3; c2d.fillRect(x + w*0.16, y + h*0.22, w*0.68, h*0.56);
      break;
    case "sun":
      c2d.fillStyle = c2;
      c2d.beginPath(); c2d.arc(x + w/2, y + h/2, Math.min(w,h)*0.28, 0, Math.PI*2); c2d.fill();
      c2d.strokeStyle = c3; c2d.lineWidth = Math.max(1, h*0.05);
      c2d.beginPath(); c2d.arc(x + w/2, y + h/2, Math.min(w,h)*0.36, 0, Math.PI*2); c2d.stroke();
      break;
    default: break;
  }
  if(f.emblem){
    c2d.font = `${Math.round(h*0.42)}px -apple-system, "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    c2d.textAlign = "center"; c2d.textBaseline = "middle";
    c2d.fillText(f.emblem, x + w/2, y + h*0.53);
  }
  c2d.restore();
  c2d.strokeStyle = "rgba(0,0,0,.35)"; c2d.lineWidth = 1;
  c2d.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function paintFlagCanvas(cv, flag){
  if(!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round((r.width || cv.width) * dpr));
  const h = Math.max(1, Math.round((r.height || cv.height) * dpr));
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const c2d = cv.getContext("2d");
  c2d.setTransform(1,0,0,1,0,0);
  c2d.clearRect(0,0,cv.width,cv.height);
  drawFlag(c2d, 0, 0, cv.width, cv.height, flag);
}
function flagColor(prof){ return prof ? normalizeFlag(prof.flag).colors[0] : "#5E9FE8"; }

/* ---------- grid ---------- */
const gridCache = {};
function decodeGrid(deg){
  const k = String(deg);
  if (gridCache[k]) return gridCache[k];
  const src = GRID_DATA[k];
  if(!src) return null;
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
const P = { prof:null, grid:null, owned:new Set(), front:new Set(), byCountry:null, sumX:0, sumY:0 };
let view = { s: 6, ox: 0, oy: 0 };
let hoverCountry = -1;

function resetRuntime(){
  P.prof = null; P.grid = null;
  P.owned = new Set(); P.front = new Set();
  P.byCountry = new Int32Array(COUNTRIES.length);
  P.sumX = 0; P.sumY = 0;
  hoverCountry = -1;
}
function activate(prof){
  if(!prof){ resetRuntime(); return; }
  const grid = decodeGrid(prof.deg);
  if(!grid){ resetRuntime(); return; }
  P.prof = prof;
  P.grid = grid;
  P.owned = new Set(prof.owned.filter(i=>i>=0 && i<grid.cells.length && grid.cells[i]>=0));
  prof.owned = [...P.owned];
  P.byCountry = new Int32Array(COUNTRIES.length);
  P.sumX = 0; P.sumY = 0;
  for(const i of P.owned){
    const v=grid.cells[i];
    if(v>=0) P.byCountry[v]++;
    P.sumX += i % grid.cols; P.sumY += Math.floor(i / grid.cols);
  }
  rebuildFrontier();
  if(prof.target != null && (grid.counts[prof.target] === 0 || P.byCountry[prof.target] >= grid.counts[prof.target])) prof.target = null;
  if(prof.start == null && P.owned.size) prof.start = [...P.owned][0];
  const color = flagColor(prof);
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-soft", mix(color, "#101012", 0.82));
  const lm = $("legendMine"); if(lm) lm.style.background = color;
}
function rebuildFrontier(){
  P.front = new Set();
  const g = P.grid;
  if(!g) return;
  for(const i of P.owned) for(const j of neighbors(i))
    if(g.cells[j]>=0 && !P.owned.has(j)) P.front.add(j);
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
function nearestTo(list, pt){
  if(!list.length) return null;
  if(!pt) return list[0];
  let best=list[0], bd=Infinity;
  for(const i of list){ const d=dist2(i, pt); if(d<bd){ bd=d; best=i; } }
  return best;
}
function addCell(i){
  const g=P.grid;
  if(P.owned.has(i)) return;
  P.owned.add(i); P.prof.owned.push(i);
  P.front.delete(i);
  const v=g.cells[i]; if(v>=0) P.byCountry[v]++;
  P.sumX += i%g.cols; P.sumY += Math.floor(i/g.cols);
  for(const j of neighbors(i)) if(g.cells[j]>=0 && !P.owned.has(j)) P.front.add(j);
}

function claimOne(){
  const g=P.grid;
  if(!g || !P.prof) return false;
  if(P.owned.size >= g.land) return false;
  if(P.owned.size === 0){
    let start = g.capitals[P.prof.country];
    if(start < 0){
      start = -1;
      for(let i=0;i<g.cells.length;i++) if(g.cells[i]>=0){ start=i; break; }
    }
    if(start < 0) return false;
    P.prof.start = start;
    addCell(start);
    return true;
  }
  const t = (P.prof.target != null && P.byCountry[P.prof.target] < g.counts[P.prof.target]) ? P.prof.target : null;
  const fr = [...P.front];
  let pick = null;
  if(fr.length){
    if(t != null){
      const inT = fr.filter(i => g.cells[i] === t);
      pick = inT.length ? nearestTo(inT, g.centroids[t]) : nearestTo(fr, g.centroids[t] || ownedCentroid());
    } else {
      const home = fr.filter(i => g.cells[i] === P.prof.country);
      pick = home.length ? nearestTo(home, g.centroids[P.prof.country] || ownedCentroid()) : nearestTo(fr, ownedCentroid());
    }
  } else {
    const pool=[];
    for(let i=0;i<g.cells.length;i++)
      if(g.cells[i]>=0 && !P.owned.has(i) && (t==null || g.cells[i]===t)) pool.push(i);
    if(!pool.length) for(let i=0;i<g.cells.length;i++) if(g.cells[i]>=0 && !P.owned.has(i)) pool.push(i);
    if(!pool.length) return false;
    pick = nearestTo(pool, ownedCentroid());
  }
  if(pick == null) return false;
  addCell(pick);
  if(t != null && P.byCountry[t] >= g.counts[t]){
    pushLog(`Страна ${COUNTRIES[t].name} захвачена полностью`);
    P.prof.target = null;
  }
  return true;
}

function pushLog(text){
  if(!P.prof) return;
  P.prof.log.unshift({ t: nowStr(), text });
  P.prof.log = P.prof.log.slice(0, 60);
}

/* ---------- game actions ---------- */
function createProfile(stateName, countryIndex, deg, opts){
  opts = opts || {};
  const flag = normalizeFlag(opts.flag);
  const prof = {
    id: uid(),
    name: stateName || "Моя держава",
    flag,
    emblem: flag.emblem || "🚩",
    color: flag.colors[0],
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
  pushLog(got ? `${task.name} — +${plural(got,"клетка","клетки","клеток")}` : `${task.name} — захватывать больше нечего`);
  save(); renderAll(); draw();
}

function setTarget(idx){
  if(!P.prof || !P.grid) return;
  if(idx != null && (P.grid.counts[idx] === 0 || P.byCountry[idx] >= P.grid.counts[idx])) idx = null;
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
  paintFlagCanvas($("crestFlag"), p ? p.flag : DEFAULT_FLAG);
  $("crestName").textContent = p ? p.name : "Захват мира";
  $("crestSub").textContent = p
    ? `${COUNTRIES[p.country].name} · клетка ${p.deg}°`
    : "клетка за выполненную задачу";
  $("editStateBtn").style.visibility = p ? "visible" : "hidden";
  $("mapTitle").innerHTML = p
    ? `<b>${escapeHtml(p.name)}</b> · старт: ${escapeHtml(COUNTRIES[p.country].name)} · клетка ${p.deg}°`
    : "Профиль не выбран";
}

function renderOverview(){
  if(!P.prof || !P.grid){
    $("pct").textContent="0%"; $("cells").textContent="0 / 0 клеток";
    $("barFill").style.width="0%"; $("statCountries").textContent="0"; $("statDone").textContent="0";
    $("winMsg").style.display="none";
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
  if(!P.prof || !P.grid){ sel.disabled=true; note.textContent="Создай игру, чтобы выбирать направление."; return; }
  sel.disabled=false;
  const g=P.grid;
  const auto=document.createElement("option");
  auto.value=""; auto.textContent="Авто — ближайшие земли";
  sel.appendChild(auto);

  const neighborsSet=new Set();
  for(const j of P.front){
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
    note.innerHTML = "Режим <b>Авто</b>: сначала добиваем родную страну, затем ближайшие земли. Цель можно выбрать нажатием на карту.";
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
    li.innerHTML = `<b>${escapeHtml(e.text)}</b><br>${escapeHtml(e.t || "")}`;
    ul.appendChild(li);
  }
}

function selectProfile(p){
  db.current = p.id;
  activate(p);
  save(); renderAll(); fitView(); draw();
}

function renderProfiles(){
  const box=$("profileList"); box.innerHTML="";
  if(!db.profiles.length){ box.innerHTML='<div class="empty">Профилей пока нет.</div>'; return; }
  for(const p of db.profiles){
    const g=decodeGrid(p.deg);
    const pct = g ? (p.owned.length/g.land*100) : 0;
    const row=document.createElement("div");
    row.className="prof"+(db.current===p.id?" active":"");
    row.innerHTML = `<canvas class="flagmini" width="88" height="56"></canvas>
      <span class="pn"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(COUNTRIES[p.country].name)} · ${p.deg}° · ${pct<10?pct.toFixed(1):Math.round(pct)}%</small></span>
      <button class="del" data-del="${p.id}" aria-label="Удалить профиль">×</button>`;
    const cv = row.querySelector("canvas");
    row.querySelector(".pn").onclick = ()=>selectProfile(p);
    cv.onclick = ()=>selectProfile(p);
    row.querySelector("[data-del]").onclick = (e)=>{
      e.stopPropagation();
      db.profiles = db.profiles.filter(x=>x.id!==p.id);
      if(db.current===p.id){
        const next = db.profiles[0] || null;
        db.current = next ? next.id : null;
        activate(next);
      }
      save(); renderAll(); fitView(); draw();
      if(!db.profiles.length) openNewGame();
    };
    box.appendChild(row);
    paintFlagCanvas(cv, p.flag);
  }
}

/* ---------- map ---------- */
const canvas = $("map");
const ctx = canvas.getContext("2d");
let W=0, H=0;

function resize(){
  const r=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  W=r.width; H=r.height;
  canvas.width=Math.max(1, Math.round(W*dpr)); canvas.height=Math.max(1, Math.round(H*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}
function fitView(){
  if(!P.grid || !W || !H) return;
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

  const mine = flagColor(P.prof);
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

  // my flag planted on the capital cell
  if(P.prof && P.prof.start != null){
    const x=P.prof.start%g.cols, y=Math.floor(P.prof.start/g.cols);
    const px=view.ox+(x+0.5)*s, py=view.oy+(y+0.5)*s;
    if(px>-60 && px<W+60 && py>-60 && py<H+60){
      const fw=Math.max(22, Math.min(46, s*3)), fh=fw*0.625;
      const poleH=fh*1.5;
      ctx.save();
      ctx.strokeStyle="rgba(255,255,255,.85)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py-poleH); ctx.stroke();
      drawFlag(ctx, px+1, py-poleH, fw, fh, P.prof.flag);
      ctx.restore();
    }
  }
}

/* ---------- interaction (mouse + touch) ---------- */
const pointers = new Map();
let dragging=false, moved=false, last=null, pinchDist=0, pinchMid=null;

function localPoint(e){
  const r=canvas.getBoundingClientRect();
  return { x:e.clientX-r.left, y:e.clientY-r.top };
}
canvas.addEventListener("pointerdown", e=>{
  canvas.setPointerCapture?.(e.pointerId);
  pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(pointers.size === 1){
    dragging=true; moved=false; last={x:e.clientX,y:e.clientY};
    canvas.classList.add("drag");
  } else if(pointers.size === 2){
    dragging=false; moved=true;
    const [a,b]=[...pointers.values()];
    pinchDist=Math.hypot(a.x-b.x, a.y-b.y);
    const r=canvas.getBoundingClientRect();
    pinchMid={ x:(a.x+b.x)/2-r.left, y:(a.y+b.y)/2-r.top };
  }
});
canvas.addEventListener("pointermove", e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

  if(pointers.size >= 2){
    const [a,b]=[...pointers.values()];
    const d=Math.hypot(a.x-b.x, a.y-b.y);
    const r=canvas.getBoundingClientRect();
    const mid={ x:(a.x+b.x)/2-r.left, y:(a.y+b.y)/2-r.top };
    if(pinchDist>0 && d>0){
      const ns=Math.max(0.6, Math.min(40, view.s*(d/pinchDist)));
      const k=ns/view.s;
      view.ox = pinchMid.x - (pinchMid.x-view.ox)*k + (mid.x-pinchMid.x);
      view.oy = pinchMid.y - (pinchMid.y-view.oy)*k + (mid.y-pinchMid.y);
      view.s = ns;
    }
    pinchDist=d; pinchMid=mid;
    draw();
    return;
  }

  if(dragging && last){
    const dx=e.clientX-last.x, dy=e.clientY-last.y;
    if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
    view.ox+=dx; view.oy+=dy; last={x:e.clientX,y:e.clientY};
    draw(); return;
  }

  if(e.pointerType === "mouse"){
    const c=cellAt(e);
    const v = (c==null || !P.grid) ? -1 : P.grid.cells[c];
    if(v!==hoverCountry){ hoverCountry=v; draw(); updateHint(v); }
  }
});
function endPointer(e){
  const wasSingle = pointers.size === 1;
  pointers.delete(e.pointerId);
  if(pointers.size < 2){ pinchDist=0; pinchMid=null; }
  if(pointers.size === 0){
    canvas.classList.remove("drag");
    if(dragging && wasSingle && !moved && e.type === "pointerup") tapAt(e);
    dragging=false; last=null;
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", e=>{
  if(e.pointerType === "mouse" && !dragging && hoverCountry!==-1){ hoverCountry=-1; draw(); updateHint(-1); }
});

function tapAt(e){
  if(!P.prof || !P.grid) return;
  const c=cellAt(e); if(c==null) return;
  const v=P.grid.cells[c];
  if(v<0) return;
  updateHint(v);
  setTarget(P.prof.target===v ? null : v);
}

canvas.addEventListener("wheel", e=>{
  e.preventDefault();
  if(!P.grid) return;
  const p=localPoint(e);
  const f = e.deltaY<0 ? 1.15 : 1/1.15;
  const ns = Math.max(0.6, Math.min(40, view.s*f));
  view.ox = p.x - (p.x-view.ox)*(ns/view.s);
  view.oy = p.y - (p.y-view.oy)*(ns/view.s);
  view.s = ns; draw();
}, {passive:false});
canvas.addEventListener("dblclick", e=>e.preventDefault());

function cellAt(e){
  if(!P.grid) return null;
  const p=localPoint(e);
  const x=Math.floor((p.x-view.ox)/view.s);
  const y=Math.floor((p.y-view.oy)/view.s);
  if(x<0||y<0||x>=P.grid.cols||y>=P.grid.rows) return null;
  return y*P.grid.cols+x;
}
function updateHint(v){
  const h=$("hint");
  if(v<0 || !P.prof || !P.grid){
    h.textContent="Нажми на страну — выбрать цель · перетаскивание — двигать карту · колесо или щипок — масштаб";
    return;
  }
  h.innerHTML = `<b>${escapeHtml(COUNTRIES[v].name)}</b> — захвачено ${P.byCountry[v]} из ${P.grid.counts[v]} клеток`;
}

/* ---------- tabs ---------- */
document.querySelectorAll(".tabs button").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected", String(b===btn)));
    document.querySelectorAll(".pane").forEach(p=>p.classList.toggle("on", p.id==="pane-"+btn.dataset.tab));
    if(btn.dataset.tab === "games") renderProfiles();
  };
});

/* ---------- pickers ---------- */
function buildPicker(el, items, current, onPick, kind){
  el.innerHTML="";
  items.forEach(val=>{
    const b=document.createElement("button");
    b.type="button";
    if(kind==="color"){ b.style.background=val; b.setAttribute("aria-label", "Цвет "+val); }
    else if(kind==="pattern"){
      const cv=document.createElement("canvas");
      cv.width=104; cv.height=66;
      b.appendChild(cv);
      b.setAttribute("aria-label", "Рисунок флага "+val);
      requestAnimationFrame(()=>drawFlag(cv.getContext("2d"), 0, 0, cv.width, cv.height, { pattern: val, colors: currentColors(), emblem: "" }));
      b.dataset.pattern = val;
    }
    else b.textContent = val || "—";
    b.setAttribute("aria-pressed", String(val===current));
    b.onclick=()=>{ [...el.children].forEach(c=>c.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); onPick(val); };
    el.appendChild(b);
  });
}
let currentColors = ()=>DEFAULT_FLAG.colors;

function repaintPatternButtons(el, colors){
  el.querySelectorAll("button").forEach(b=>{
    const cv=b.querySelector("canvas");
    if(cv) drawFlag(cv.getContext("2d"), 0, 0, cv.width, cv.height, { pattern: b.dataset.pattern, colors, emblem: "" });
  });
}

/* flag editor wiring: prefix "g" (new game) or "s" (edit state) */
function bindFlagEditor(prefix, state, onChange){
  const patternEl = $(prefix+"Pattern");
  const prev = $(prefix+"FlagPrev");
  const refresh = ()=>{
    paintFlagCanvas(prev, state.flag);
    repaintPatternButtons(patternEl, state.flag.colors);
    if(onChange) onChange();
  };
  currentColors = ()=>state.flag.colors;
  buildPicker(patternEl, PATTERNS, state.flag.pattern, v=>{ state.flag.pattern=v; refresh(); }, "pattern");
  [1,2,3].forEach(n=>{
    buildPicker($(prefix+"Color"+n), FLAG_COLORS, state.flag.colors[n-1], v=>{ state.flag.colors[n-1]=v; refresh(); }, "color");
  });
  buildPicker($(prefix+"Emblem"), EMBLEMS, state.flag.emblem, v=>{ state.flag.emblem=v; refresh(); }, "emblem");
  refresh();
}

/* ---------- new game modal ---------- */
let newGame = { flag: clone(DEFAULT_FLAG) };
let stateEdit = { flag: clone(DEFAULT_FLAG) };

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
  $("sizeInfo").textContent = g ? `${g.land} клеток суши — столько задач нужно выполнить для полного захвата мира.` : "";
}
function openNewGame(){
  newGame = { flag: clone(DEFAULT_FLAG) };
  $("gState").value="";
  $("cancelGame").style.display = db.profiles.length ? "" : "none";
  bindFlagEditor("g", newGame);
  updateSizeInfo();
  $("modal").classList.add("open");
}
$("newGameBtn").onclick=openNewGame;
$("cancelGame").onclick=()=>{ if(db.profiles.length) $("modal").classList.remove("open"); };
$("gSize").onchange=updateSizeInfo;
$("startGame").onclick=()=>{
  const name=$("gState").value.trim() || "Моя держава";
  createProfile(name, +$("gCountry").value, $("gSize").value, { flag: newGame.flag });
  $("modal").classList.remove("open");
};

/* ---------- state customization ---------- */
$("editStateBtn").onclick=()=>{
  if(!P.prof) return;
  stateEdit={ flag: normalizeFlag(P.prof.flag) };
  $("sState").value=P.prof.name;
  bindFlagEditor("s", stateEdit);
  $("stateModal").classList.add("open");
};
$("cancelState").onclick=()=>$("stateModal").classList.remove("open");
$("saveState").onclick=()=>{
  if(!P.prof) return;
  P.prof.name = $("sState").value.trim() || P.prof.name;
  P.prof.flag = normalizeFlag(stateEdit.flag);
  P.prof.color = P.prof.flag.colors[0];
  P.prof.emblem = P.prof.flag.emblem || "🚩";
  activate(P.prof);
  save(); renderAll(); draw();
  $("stateModal").classList.remove("open");
};

/* close modals by backdrop tap */
document.querySelectorAll(".modal").forEach(m=>{
  m.addEventListener("click", e=>{
    if(e.target !== m) return;
    if(m.id === "modal" && !db.profiles.length) return;
    m.classList.remove("open");
  });
});
document.addEventListener("keydown", e=>{
  if(e.key !== "Escape") return;
  $("stateModal").classList.remove("open");
  if(db.profiles.length) $("modal").classList.remove("open");
});

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
function zoomBy(f){
  const ns=Math.max(0.6, Math.min(40, view.s*f));
  const k=ns/view.s;
  view.ox=W/2-(W/2-view.ox)*k; view.oy=H/2-(H/2-view.oy)*k;
  view.s=ns; draw();
}
$("zoomIn").onclick=()=>zoomBy(1.3);
$("zoomOut").onclick=()=>zoomBy(1/1.3);
$("zoomFit").onclick=()=>{ fitView(); draw(); };
$("zoomHome").onclick=()=>{ if(P.prof && P.prof.start!=null){ centerOn(P.prof.start); draw(); } };
$("targetSel").onchange=e=>setTarget(e.target.value==="" ? null : +e.target.value);

/* ---------- boot ---------- */
resetRuntime();
load();
fillCountrySelect();

let resizeTimer=null;
function onResize(){
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    resize();
    renderCrest();
    renderProfiles();
  }, 80);
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", onResize);

if(db.profiles.length){
  const prof = db.profiles.find(p=>p.id===db.current) || db.profiles[0];
  db.current = prof.id;
  activate(prof);
  renderAll();
  resize(); fitView(); draw();
  save();
} else {
  renderAll();
  resize();
  openNewGame();
}
