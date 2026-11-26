(() => {
  "use strict";

  const EMOJI = { sadness:"😢", joy:"😄", love:"❤️", anger:"😠", fear:"😨", surprise:"😲" };
  const COLOR = { sadness:"#4f72d9", joy:"#e0a400", love:"#d94a68", anger:"#d8501f", fear:"#8352b8", surprise:"#0fa8a5" };
  const ORDER = ["joy","love","surprise","fear","anger","sadness"]; // radar axis order

  const $ = (id) => document.getElementById(id);
  const el = {
    dot:$("statusDot"), status:$("statusText"), input:$("textInput"), count:$("charCount"),
    analyze:$("analyzeBtn"), label:$("btnLabel"), clear:$("clearBtn"), err:$("errorMsg"),
    empty:$("emptyState"), result:$("result"), emoji:$("emoji"), word:$("word"), conf:$("conf"),
    radar:$("radar"), bars:$("bars"), theme:$("themeBtn"), chips:$("chips"),
    histSec:$("historySection"), histList:$("historyList"), histClear:$("clearHistory"),
  };

  let modelReady = false;
  let history = [];

  /* ---------- storage helpers (safe) ---------- */
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  };

  /* ---------- theme ---------- */
  function applyTheme(t){ document.documentElement.setAttribute("data-theme", t); }
  applyTheme(store.get("moodline-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  el.theme.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next); store.set("moodline-theme", next);
  });

  /* ---------- health ---------- */
  async function checkHealth(){
    try {
      const r = await fetch("/health");
      if (!r.ok) throw new Error();
      const d = await r.json();
      modelReady = !!d.model_loaded;
      if (modelReady) setStatus("live","model ready");
      else { setStatus("warming","loading model…"); setTimeout(checkHealth,3000); }
    } catch(e){
      setStatus("down","server unreachable"); setTimeout(checkHealth,5000);
    }
    sync();
  }
  function setStatus(kind,text){ el.dot.className = "dot " + kind; el.status.textContent = text; }

  /* ---------- input ---------- */
  function sync(){ el.analyze.disabled = !(modelReady && el.input.value.trim()); }
  el.input.addEventListener("input", () => { el.count.textContent = el.input.value.length; sync(); });
  el.input.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter"){ e.preventDefault(); analyze(); }
  });
  el.analyze.addEventListener("click", analyze);
  el.clear.addEventListener("click", () => {
    el.input.value = ""; el.count.textContent = "0"; sync(); el.input.focus();
  });
  el.chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    el.input.value = b.dataset.text; el.count.textContent = el.input.value.length; sync();
    if (modelReady) analyze();
  });

  /* ---------- analyze ---------- */
  async function analyze(){
    const text = el.input.value.trim();
    if (!text || !modelReady) return;
    el.err.hidden = true;
    el.analyze.disabled = true; el.analyze.classList.add("loading"); el.label.textContent = "Reading…";
    if (el.result.hidden) el.empty.classList.add("thinking");

    try {
      const r = await fetch("/predict", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok){
        const b = await r.json().catch(() => ({}));
        throw new Error(typeof b.detail === "string" ? b.detail : `Request failed (${r.status})`);
      }
      const data = await r.json();
      render(data);
      pushHistory(text, data);
    } catch(e){
      el.err.textContent = e.message || "Something went wrong."; el.err.hidden = false;
    } finally {
      el.empty.classList.remove("thinking");
      el.analyze.classList.remove("loading"); el.label.textContent = "Analyze"; sync();
    }
  }

  /* ---------- render ---------- */
  function render(data){
    const emo = data.predicted_emotion;
    document.documentElement.setAttribute("data-emotion", emo);

    el.emoji.textContent = EMOJI[emo] || "🙂";
    el.word.textContent = emo.charAt(0).toUpperCase() + emo.slice(1);
    el.conf.textContent = `${(data.confidence*100).toFixed(1)}% confidence`;

    drawRadar(data.all_probabilites);
    drawBars(data.all_probabilites, emo);

    el.empty.hidden = true; el.result.hidden = false;
    el.result.classList.remove("enter"); void el.result.offsetWidth; el.result.classList.add("enter");
  }

  function drawBars(p, top){
    el.bars.innerHTML = "";
    Object.entries(p).sort((a,b) => b[1]-a[1]).forEach(([k,v],i) => {
      const row = document.createElement("div");
      row.className = "bar" + (k === top ? " top" : "");
      row.innerHTML = `<span class="name">${EMOJI[k]||""} ${k}</span>
        <span class="track"><span class="fill" style="background:${COLOR[k]}"></span></span>
        <span class="pct">${(v*100).toFixed(1)}%</span>`;
      el.bars.appendChild(row);
      const f = row.querySelector(".fill");
      setTimeout(() => f.style.width = (v*100)+"%", 60 + i*70);
    });
  }

  function drawRadar(p){
    const R = 100, n = ORDER.length, NS = "http://www.w3.org/2000/svg";
    const pt = (i, r) => {
      const a = (-90 + i*360/n) * Math.PI/180;
      return [Math.cos(a)*r, Math.sin(a)*r];
    };
    let s = "";
    [0.33,0.66,1].forEach(f => {
      s += `<polygon class="grid-line" points="${ORDER.map((_,i)=>pt(i,R*f).join(",")).join(" ")}"/>`;
    });
    ORDER.forEach((k,i) => {
      const [x,y] = pt(i,R), [lx,ly] = pt(i,R+22);
      s += `<line class="axis" x1="0" y1="0" x2="${x}" y2="${y}"/>`;
      s += `<text class="axis-label" x="${lx}" y="${ly}">${EMOJI[k]}</text>`;
    });
    // sqrt scale so small probabilities stay visible
    const pts = ORDER.map((k,i) => pt(i, R*Math.sqrt(p[k]||0)));
    s += `<polygon class="shape" points="${pts.map(q=>q.join(",")).join(" ")}"/>`;
    pts.forEach(q => { s += `<circle class="node" cx="${q[0]}" cy="${q[1]}" r="3.5"/>`; });
    el.radar.innerHTML = s;
  }

  /* ---------- history ---------- */
  function pushHistory(text, data){
    history.unshift({ text, data });
    history = history.slice(0,6);
    store.set("moodline-history", JSON.stringify(history));
    drawHistory();
  }
  function drawHistory(){
    el.histSec.hidden = history.length === 0;
    el.histList.innerHTML = "";
    history.forEach((h) => {
      const li = document.createElement("li");
      const emo = h.data.predicted_emotion;
      li.innerHTML = `<span class="h-emoji">${EMOJI[emo]||"🙂"}</span>
        <span class="h-text"></span>
        <span class="h-tag">${emo} · ${(h.data.confidence*100).toFixed(0)}%</span>`;
      li.querySelector(".h-text").textContent = h.text;
      li.addEventListener("click", () => {
        el.input.value = h.text; el.count.textContent = h.text.length; sync(); render(h.data);
      });
      el.histList.appendChild(li);
    });
  }
  el.histClear.addEventListener("click", () => {
    history = []; store.set("moodline-history","[]"); drawHistory();
  });
  try { history = JSON.parse(store.get("moodline-history") || "[]"); } catch(e){ history = []; }
  drawHistory();

  checkHealth();
})();
