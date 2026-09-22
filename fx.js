/* ================= Анимации и ощущения ================= */
(function(){
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- CSS ---------- */
  const st = document.createElement("style");
  st.id = "fxStyles";
  st.textContent = `
  :root { --ease: cubic-bezier(.2,.8,.25,1); }

  .btn, .tabs button, .picker button, .prof, .task, .edit, select, input {
    transition: background .18s ease, color .18s ease, border-color .18s ease,
                transform .12s var(--ease), box-shadow .2s ease, opacity .18s ease;
  }
  .btn:active, .tabs button:active, .picker button:active, .edit:active { transform: scale(.96); }
  .btn:hover:not(:disabled) { transform: translateY(-1px); }
  .btn.primary:hover:not(:disabled) { box-shadow: 0 6px 18px -8px var(--accent); }
  .prof:hover { transform: translateX(2px); }
  .picker button:hover { transform: translateY(-2px); }
  .picker button[aria-pressed="true"] { animation: fxPop .22s var(--ease); }
  .edit:hover { transform: rotate(-8deg) scale(1.06); }

  .pane.on { animation: fxFadeUp .28s var(--ease); }
  #log li:first-child { animation: fxSlideIn .32s var(--ease); }
  .tasks .task { animation: fxFadeUp .22s var(--ease); }

  #barFill { transition: width .6s var(--ease); position: relative; overflow: hidden; }
  #barFill::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
    transform: translateX(-100%);
    animation: fxShimmer 2.6s ease-in-out infinite;
  }
  #pct.fx-bump { animation: fxBump .45s var(--ease); display: inline-block; }
  .win { animation: fxPop .5s var(--ease); }

  .modal { transition: opacity .22s ease; }
  .modal .sheet { transition: transform .3s var(--ease), opacity .3s ease; }
  .modal:not(.open) .sheet { transform: translateY(18px) scale(.985); opacity: 0; }
  .modal.open .sheet { transform: none; opacity: 1; }

  .flagprev, .flagmini { transition: transform .2s var(--ease); }
  .flagbox:hover .flagprev { transform: scale(1.02) rotate(-.6deg); }

  #fxToasts {
    position: fixed; left: 50%; transform: translateX(-50%);
    bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    display: flex; flex-direction: column; gap: 8px; align-items: center;
    z-index: 999; pointer-events: none; width: max-content; max-width: 92vw;
  }
  .fx-toast {
    background: rgba(22,25,31,.94); color: #fff;
    border: 1px solid rgba(255,255,255,.12);
    border-left: 3px solid var(--accent);
    border-radius: 12px; padding: 10px 14px;
    font-size: 14px; font-weight: 600; letter-spacing: .1px;
    box-shadow: 0 12px 30px -12px rgba(0,0,0,.8);
    animation: fxToastIn .28s var(--ease);
    backdrop-filter: blur(8px);
  }
  .fx-toast.out { animation: fxToastOut .26s ease forwards; }

  @keyframes fxFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes fxSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
  @keyframes fxPop { 0% { transform: scale(.88); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
  @keyframes fxBump { 0% { transform: scale(1); } 35% { transform: scale(1.18); } 100% { transform: scale(1); } }
  @keyframes fxShimmer { 0% { transform: translateX(-100%); } 55%, 100% { transform: translateX(100%); } }
  @keyframes fxToastIn { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes fxToastOut { to { opacity: 0; transform: translateY(8px) scale(.97); } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
  }
  `;
  document.head.appendChild(st);

  const toastBox = document.createElement("div");
  toastBox.id = "fxToasts";
  document.body.appendChild(toastBox);

  function toast(text, ms){
    const el = document.createElement("div");
    el.className = "fx-toast";
    el.textContent = text;
    toastBox.appendChild(el);
    const life = ms || 2200;
    setTimeout(()=>{ el.classList.add("out"); setTimeout(()=>el.remove(), 300); }, life);
    while(toastBox.children.length > 3) toastBox.firstChild.remove();
  }
  window.fxToast = toast;

  /* ---------- анимационный цикл ---------- */
  const flashes = new Map();
  const FLASH_MS = 900;
  let camAnim = null, rafId = null, lastCell = null;

  function requestLoop(){ if(rafId == null) rafId = requestAnimationFrame(loop); }
  function loop(){
    rafId = null;
    if(camAnim) stepCam();
    draw();
    if(camAnim || flashes.size) requestLoop();
  }
  function animateView(to, ms){
    if(reduced){ view.ox = to.ox; view.oy = to.oy; view.s = to.s; draw(); return; }
    camAnim = { from: { ox: view.ox, oy: view.oy, s: view.s }, to, t0: performance.now(), ms: ms || 420 };
    requestLoop();
  }
  function stepCam(){
    const k = Math.min(1, (performance.now() - camAnim.t0) / camAnim.ms);
    const e = 1 - Math.pow(1 - k, 3);
    view.ox = camAnim.from.ox + (camAnim.to.ox - camAnim.from.ox) * e;
    view.oy = camAnim.from.oy + (camAnim.to.oy - camAnim.from.oy) * e;
    view.s  = camAnim.from.s  + (camAnim.to.s  - camAnim.from.s ) * e;
    if(k >= 1) camAnim = null;
  }
  function centerTarget(cx, cy, s){
    return { ox: W/2 - (cx + 0.5) * s, oy: H/2 - (cy + 0.5) * s, s };
  }

  /* ---------- вспышка новых клеток ---------- */
  const origAddCell = window.addCell;
  window.addCell = function(i){
    const had = P.owned.has(i);
    origAddCell(i);
    if(!had){
      lastCell = i;
      if(!reduced){ flashes.set(i, performance.now()); requestLoop(); }
    }
  };

  const origDraw = window.draw;
  window.draw = function(){
    origDraw();
    if(!flashes.size || !P.grid) return;
    const now = performance.now(), g = P.grid, s = view.s;
    ctx.save();
    for(const [i, t] of flashes){
      const k = (now - t) / FLASH_MS;
      if(k >= 1){ flashes.delete(i); continue; }
      const x = i % g.cols, y = Math.floor(i / g.cols);
      const px = view.ox + x * s, py = view.oy + y * s;
      if(px < -s*3 || py < -s*3 || px > W + s*3 || py > H + s*3) continue;
      const a = 1 - k;
      const grow = s * 1.2 * (1 - a);
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(px, py, s, s);
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(1, s * 0.16);
      ctx.strokeRect(px - grow/2, py - grow/2, s + grow, s + grow);
    }
    ctx.restore();
  };

  /* ---------- плавный зум и перелёты ---------- */
  window.zoomBy = function(f){
    const ns = Math.max(0.6, Math.min(40, view.s * f));
    const k = ns / view.s;
    animateView({ ox: W/2 - (W/2 - view.ox) * k, oy: H/2 - (H/2 - view.oy) * k, s: ns }, 280);
  };
  window.centerOn = function(cellIndex, scale){
    if(!P.grid) return;
    const g = P.grid;
    const s = scale || Math.max(view.s, Math.min(W/g.cols, H/g.rows) * 3);
    animateView(centerTarget(cellIndex % g.cols, Math.floor(cellIndex / g.cols), s), 520);
  };

  const zf = document.getElementById("zoomFit");
  if(zf) zf.onclick = ()=>{
    if(!P.grid || !W || !H) return;
    const g = P.grid;
    const s = Math.min(W/g.cols, H/g.rows) * 0.94;
    animateView({ ox: (W - g.cols*s)/2, oy: (H - g.rows*s)/2, s }, 440);
  };

  /* ---------- реакции на действия ---------- */
  const origComplete = window.completeTask;
  window.completeTask = function(id){
    const task = P.prof ? P.prof.tasks.find(t=>t.id===id) : null;
    const before = P.owned.size;
    origComplete(id);
    const got = P.owned.size - before;
    if(got > 0){
      toast(`${task ? task.name + ": " : ""}+${plural(got, "клетка", "клетки", "клеток")}`);
      // если захват ушёл за край экрана — плавно доворачиваем камеру
      if(lastCell != null && P.grid && !reduced){
        const g = P.grid;
        const px = view.ox + (lastCell % g.cols) * view.s;
        const py = view.oy + Math.floor(lastCell / g.cols) * view.s;
        if(px < 0 || py < 0 || px > W || py > H)
          animateView(centerTarget(lastCell % g.cols, Math.floor(lastCell / g.cols), view.s), 520);
      }
    } else {
      toast("Захватывать больше нечего");
    }
  };

  const origSetTarget = window.setTarget;
  window.setTarget = function(idx){
    const prev = P.prof ? P.prof.target : null;
    origSetTarget(idx);
    const now = P.prof ? P.prof.target : null;
    if(now !== prev){
      if(now == null) toast("Режим автонаступления");
      else {
        toast(`Цель: ${COUNTRIES[now].name}`);
        const c = P.grid && P.grid.centroids[now];
        if(c) animateView(centerTarget(c.x, c.y, view.s), 520);
      }
    }
  };

  const origSelect = window.selectProfile;
  window.selectProfile = function(p){
    origSelect(p);
    toast(`Держава «${p.name}»`);
  };

  const origSave = window.$ ? null : null;
  const saveBtn = document.getElementById("saveState");
  if(saveBtn){
    const prevHandler = saveBtn.onclick;
    saveBtn.onclick = (e)=>{ if(prevHandler) prevHandler(e); toast("Флаг державы обновлён"); };
  }

  /* ---------- живая статистика ---------- */
  let lastPct = null, wonShown = false;
  const origOverview = window.renderOverview;
  window.renderOverview = function(){
    origOverview();
    const el = document.getElementById("pct");
    if(el && el.textContent !== lastPct){
      lastPct = el.textContent;
      el.classList.remove("fx-bump");
      void el.offsetWidth;
      el.classList.add("fx-bump");
    }
    if(P.grid && P.owned.size >= P.grid.land){
      if(!wonShown){ wonShown = true; toast("Мир захвачен полностью!", 4000); }
    } else wonShown = false;
  };

  /* ---------- тактильная отдача на телефоне ---------- */
  document.addEventListener("click", (e)=>{
    if(!navigator.vibrate) return;
    const b = e.target.closest && e.target.closest("button");
    if(b) navigator.vibrate(8);
  }, { passive: true });
})();
