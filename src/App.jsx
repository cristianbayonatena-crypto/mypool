import { useState, useRef } from "react";

const chems = [
  { id: "cl", label: "Cloro", unit: "ppm", ideal: "1–3", prod: "Hipoclorito" },
  { id: "ph", label: "pH", unit: "", ideal: "7.2–7.6", prod: "pH+ / pH-" },
  { id: "alk", label: "Alcalinidad", unit: "ppm", ideal: "80–120", prod: "Bicarbonato" },
  { id: "hard", label: "Dureza", unit: "ppm", ideal: "200–400", prod: "Cloruro cálcico" },
  { id: "cya", label: "Ác. cianúrico", unit: "ppm", ideal: "30–50", prod: "Estabilizador" },
];

const taskOptions = [
  "Limpieza de filtro", "Aspirado de fondo", "Cepillado de paredes",
  "Vaciado de skimmer", "Adición de cloro", "Adición de pH+",
  "Adición de pH-", "Contrachoque", "Revisión de bomba",
  "Revisión de iluminación", "Cambio de agua parcial",
];

const statusColors = {
  Óptimo: "#00e5a0", Bajo: "#ffcc00", Alto: "#ff6b35", "No medido": "#666"
};

function getStatus(id, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return "No medido";
  if (id === "cl") return v < 1 ? "Bajo" : v > 3 ? "Alto" : "Óptimo";
  if (id === "ph") return v < 7.2 ? "Bajo" : v > 7.6 ? "Alto" : "Óptimo";
  if (id === "alk") return v < 80 ? "Bajo" : v > 120 ? "Alto" : "Óptimo";
  if (id === "hard") return v < 200 ? "Bajo" : v > 400 ? "Alto" : "Óptimo";
  if (id === "cya") return v < 30 ? "Bajo" : v > 50 ? "Alto" : "Óptimo";
  return "Óptimo";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function exportPDF(pool, logs) {
  const poolLogs = logs.filter(l => l.poolId === pool.id);
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Informe ${pool.name}</title>
    <style>
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a2e; }
      h1 { color: #0077b6; border-bottom: 2px solid #0077b6; padding-bottom: 10px; }
      h2 { color: #023e8a; margin-top: 30px; font-size: 16px; }
      .meta { color: #666; font-size: 13px; margin-bottom: 30px; }
      .entry { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
      .date { font-weight: 700; color: #0077b6; margin-bottom: 8px; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; margin: 2px; }
      .optimo { background: #00e5a022; color: #00a070; border: 1px solid #00e5a044; }
      .bajo { background: #ffcc0022; color: #aa8800; border: 1px solid #ffcc0044; }
      .alto { background: #ff6b3522; color: #cc4400; border: 1px solid #ff6b3544; }
      .task { display: inline-block; background: #e8f4fd; color: #0077b6; padding: 2px 10px; border-radius: 20px; font-size: 11px; margin: 2px; }
      .notes { background: #f8f9fa; border-left: 3px solid #0077b6; padding: 8px 12px; font-size: 13px; margin-top: 8px; border-radius: 0 6px 6px 0; }
      .product { font-size: 12px; color: #555; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { padding: 6px 10px; border: 1px solid #eee; font-size: 12px; text-align: left; }
      th { background: #e8f4fd; color: #0077b6; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>🏊 Informe de Piscina — ${pool.name}</h1>
    <div class="meta">
      ${pool.location ? `📍 ${pool.location}` : ""} 
      ${pool.volume ? `· Vol: ${pool.volume} m³` : ""} 
      · ${pool.type || ""}
      · Generado: ${new Date().toLocaleDateString("es-ES")}
    </div>
    <p><strong>Total registros:</strong> ${poolLogs.length}</p>
    <h2>Historial de mantenimientos</h2>
    ${poolLogs.length === 0 ? "<p>No hay registros aún.</p>" : poolLogs.map(l => `
      <div class="entry">
        <div class="date">📅 ${fmtDate(l.createdAt)}</div>
        ${l.tasks?.length ? `<div>${l.tasks.map(t => `<span class="task">${t}</span>`).join("")}</div>` : ""}
        ${Object.keys(l.chemicals || {}).length ? `
          <table style="margin-top:10px">
            <tr><th>Parámetro</th><th>Valor</th><th>Estado</th><th>Producto</th><th>Cantidad</th></tr>
            ${chems.map(c => {
              const v = l.chemicals?.[c.id];
              const q = l.quantities?.[c.id];
              if (!v) return "";
              const s = getStatus(c.id, v);
              return `<tr>
                <td>${c.label}</td>
                <td>${v} ${c.unit}</td>
                <td><span class="badge ${s.toLowerCase()}">${s}</span></td>
                <td>${c.prod}</td>
                <td>${q ? q + " kg/L" : "—"}</td>
              </tr>`;
            }).join("")}
          </table>` : ""}
        ${l.notes ? `<div class="notes">📝 ${l.notes}</div>` : ""}
      </div>`).join("")}
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; }
  .water-bg {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(180deg, #0077b6 0%, #00b4d8 40%, #90e0ef 70%, #caf0f8 100%);
    z-index: 0; overflow: hidden;
  }
  .water-bg::before {
    content: ''; position: absolute; top: 0; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%),
                radial-gradient(ellipse at 50% 80%, rgba(0,180,216,0.3) 0%, transparent 50%);
    animation: waterMove 8s ease-in-out infinite alternate;
  }
  .water-bg::after {
    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 40px,
      rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px
    );
  }
  @keyframes waterMove {
    0% { transform: translate(0, 0) rotate(0deg); }
    100% { transform: translate(30px, 20px) rotate(2deg); }
  }
  .app { position: relative; z-index: 1; min-height: 100vh; font-family: 'Inter', sans-serif; }
  .glass {
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.3);
  }
  .glass-dark {
    background: rgba(0,30,60,0.5);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.15);
  }
  .card-hover:hover { transform: translateY(-2px); transition: transform .2s; border-color: rgba(255,255,255,0.5) !important; }
`;

export default function App() {
  const [pools, setPools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [selPool, setSelPool] = useState(null);
  const [np, setNp] = useState({ name: "", location: "", volume: "", type: "Residencial", photo: null });
  const [nl, setNl] = useState({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) });
  const [filterPool, setFilterPool] = useState("all");
  const photoRef = useRef();

  const now = new Date();
  const thisMonth = logs.filter(l => { const d = new Date(l.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

  function savePool() {
    if (!np.name.trim()) return;
    setPools(p => [...p, { ...np, id: Date.now().toString() }]);
    setNp({ name: "", location: "", volume: "", type: "Residencial", photo: null });
    setView("dashboard");
  }

  function saveLog() {
    if (!selPool) return;
    setLogs(l => [{ ...nl, id: Date.now().toString(), poolId: selPool.id, poolName: selPool.name, createdAt: new Date().toISOString() }, ...l]);
    setNl({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) });
    setView("dashboard");
  }

  function toggleTask(t) {
    setNl(l => ({ ...l, tasks: l.tasks.includes(t) ? l.tasks.filter(x => x !== t) : [...l.tasks, t] }));
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNp(p => ({ ...p, photo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function lastLog(pid) { return logs.find(l => l.poolId === pid); }

  const S = {
    hdr: { padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 },
    nb: (a) => ({ background: a ? "rgba(255,255,255,0.25)" : "transparent", border: a ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, marginLeft: 6 }),
    main: { maxWidth: 820, margin: "0 auto", padding: "24px 16px" },
    statRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" },
    stat: { borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 100, textAlign: "center" },
    statN: { fontSize: 28, fontWeight: 700, color: "#fff" },
    statL: { fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 2, marginTop: 2, textTransform: "uppercase" },
    secHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    secLbl: { fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 },
    addBtn: { background: "#0077b6", color: "#fff", border: "2px solid #fff", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 700, letterSpacing: 0.5, boxShadow: "0 4px 15px rgba(0,0,0,0.3)" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 },
    card: { borderRadius: 16, padding: 18, cursor: "pointer", transition: "all .2s", overflow: "hidden" },
    badge: (s) => ({ display: "inline-block", background: statusColors[s] + "33", color: statusColors[s], border: `1px solid ${statusColors[s]}66`, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 600, marginRight: 4, marginBottom: 3 }),
    empty: { textAlign: "center", color: "rgba(255,255,255,0.7)", padding: "50px 16px", fontSize: 14 },
    lbl: { fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, display: "block", marginTop: 18, fontWeight: 500 },
    inp: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Inter, sans-serif", width: "100%", outline: "none", boxSizing: "border-box" },
    sel: { background: "rgba(0,30,60,0.6)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Inter, sans-serif", width: "100%", outline: "none", boxSizing: "border-box" },
    twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    saveBtn: { background: "rgba(255,255,255,0.9)", color: "#0077b6", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 700, marginTop: 22 },
    cancelBtn: { background: "transparent", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "12px 20px", fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", marginTop: 22, marginLeft: 10 },
    chip: (s) => ({ display: "inline-block", background: s ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)", border: `1px solid ${s ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)"}`, color: s ? "#fff" : "rgba(255,255,255,0.6)", borderRadius: 20, padding: "5px 13px", fontSize: 12, cursor: "pointer", margin: 3, fontWeight: s ? 600 : 400 }),
    chemGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginTop: 6 },
    chemBox: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: 14 },
    logEntry: { borderRadius: 14, padding: 18, marginBottom: 12 },
    ptitle: { color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 },
    psub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 22 },
    pdfBtn: { background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
  };

  const WaterBg = () => (
    <>
      <style>{G}</style>
      <div className="water-bg" />
    </>
  );

  if (view === "dashboard") return (
    <div className="app">
      <WaterBg />
      <div className="glass" style={S.hdr}>
        <div style={S.logo}>🏊 AquaLog Pro</div>
        <div>
          <button style={S.nb(true)}>Dashboard</button>
          <button style={S.nb(false)} onClick={() => setView("history")}>Historial</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={S.statRow}>
          {[["🏊", pools.length, "Piscinas"], ["📋", logs.length, "Registros"], ["📅", thisMonth, "Este mes"]].map(([icon, n, lbl]) => (
            <div key={lbl} className="glass" style={{ ...S.stat, borderRadius: 14 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={S.statN}>{n}</div>
              <div style={S.statL}>{lbl}</div>
            </div>
          ))}
        </div>
        <div style={S.secHead}>
          <span style={S.secLbl}>Mis Piscinas</span>
          <button style={S.addBtn} onClick={() => setView("addPool")}>+ Nueva Piscina</button>
        </div>
        {pools.length === 0
          ? <div className="glass" style={{ ...S.empty, borderRadius: 16, padding: 40 }}><div style={{ fontSize: 48, marginBottom: 12 }}>🏊‍♂️</div><div style={{ color: "#fff", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Aún no tienes piscinas</div><div>Pulsa "+ Nueva Piscina" para empezar</div></div>
          : <div style={S.grid}>{pools.map(pool => {
            const last = lastLog(pool.id);
            const cl = last ? getStatus("cl", last.chemicals?.cl) : "No medido";
            const ph = last ? getStatus("ph", last.chemicals?.ph) : "No medido";
            return (
              <div key={pool.id} className="glass card-hover" style={S.card} onClick={() => { setSelPool(pool); setNl({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) }); setView("addLog"); }}>
                {pool.photo
                  ? <img src={pool.photo} alt={pool.name} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
                  : <div style={{ width: "100%", height: 80, background: "rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 10 }}>🏊</div>
                }
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{pool.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 10 }}>{[pool.location, pool.type].filter(Boolean).join(" · ")}</div>
                {pool.volume && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Vol: {pool.volume} m³</div>}
                <div><span style={S.badge(cl)}>Cl: {cl}</span><span style={S.badge(ph)}>pH: {ph}</span></div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>{last ? `Último: ${fmtDate(last.createdAt)}` : "Sin registros aún"}</div>
              </div>
            );
          })}</div>
        }
      </div>
    </div>
  );

  if (view === "addPool") return (
    <div className="app">
      <WaterBg />
      <div className="glass" style={S.hdr}><div style={S.logo}>🏊 AquaLog Pro</div></div>
      <div style={S.main}>
        <div style={S.ptitle}>Nueva Piscina</div>
        <div style={S.psub}>Añade los datos de la instalación</div>
        <div className="glass-dark" style={{ borderRadius: 16, padding: 24 }}>
          <label style={S.lbl}>Foto de la piscina</label>
          <div onClick={() => photoRef.current.click()} style={{ width: "100%", height: 140, background: "rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.3)", overflow: "hidden" }}>
            {np.photo ? <img src={np.photo} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}><div style={{ fontSize: 32 }}>📷</div><div style={{ fontSize: 12, marginTop: 6 }}>Pulsa para añadir foto</div></div>}
          </div>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
          <label style={S.lbl}>Nombre</label>
          <input style={S.inp} value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Villa Monterrey" />
          <label style={S.lbl}>Ubicación</label>
          <input style={S.inp} value={np.location} onChange={e => setNp(p => ({ ...p, location: e.target.value }))} placeholder="Dirección o referencia" />
          <div style={S.twoCol}>
            <div>
              <label style={S.lbl}>Volumen (m³)</label>
              <input style={S.inp} type="number" value={np.volume} onChange={e => setNp(p => ({ ...p, volume: e.target.value }))} placeholder="Ej: 50" />
            </div>
            <div>
              <label style={S.lbl}>Tipo</label>
              <select style={S.sel} value={np.type} onChange={e => setNp(p => ({ ...p, type: e.target.value }))}>
                <option>Residencial</option><option>Comercial</option><option>Deportiva</option><option>Hotel</option><option>Club</option>
              </select>
            </div>
          </div>
        </div>
        <button style={S.saveBtn} onClick={savePool}>Guardar Piscina</button>
        <button style={S.cancelBtn} onClick={() => setView("dashboard")}>Cancelar</button>
      </div>
    </div>
  );

  if (view === "addLog") return (
    <div className="app">
      <WaterBg />
      <div className="glass" style={S.hdr}><div style={S.logo}>🏊 AquaLog Pro</div></div>
      <div style={S.main}>
        <div style={S.ptitle}>{selPool?.name}</div>
        <div style={S.psub}>Nuevo registro de mantenimiento</div>
        <div className="glass-dark" style={{ borderRadius: 16, padding: 24 }}>
          <label style={S.lbl}>Fecha</label>
          <input style={{ ...S.inp, maxWidth: 200 }} type="date" value={nl.date} onChange={e => setNl(l => ({ ...l, date: e.target.value }))} />
          <label style={S.lbl}>Tareas realizadas</label>
          <div>{taskOptions.map(t => <span key={t} style={S.chip(nl.tasks.includes(t))} onClick={() => toggleTask(t)}>{t}</span>)}</div>
          <label style={S.lbl}>Mediciones y productos añadidos</label>
          <div style={S.chemGrid}>
            {chems.map(c => {
              const v = nl.chemicals[c.id] || "";
              const q = nl.quantities[c.id] || "";
              const s = v ? getStatus(c.id, v) : null;
              return (
                <div key={c.id} style={{ ...S.chemBox, borderColor: v ? statusColors[s] + "66" : "rgba(255,255,255,0.2)" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 6, fontWeight: 600 }}>{c.label}{c.unit ? ` (${c.unit})` : ""}</div>
                  <input style={{ background: "transparent", border: "none", color: v ? statusColors[s] : "#fff", fontSize: 18, fontFamily: "Inter, sans-serif", fontWeight: 700, width: "100%", outline: "none" }} type="number" step="0.1" value={v} placeholder="—" onChange={e => setNl(l => ({ ...l, chemicals: { ...l.chemicals, [c.id]: e.target.value } }))} />
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: "4px 0" }}>Ideal: {c.ideal}</div>
                  {s && <span style={{ ...S.badge(s), display: "inline-block", marginBottom: 6 }}>{s}</span>}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Cantidad añadida</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input style={{ ...S.inp, padding: "4px 8px", fontSize: 12, flex: 1 }} type="number" step="0.1" value={q} placeholder="0" onChange={e => setNl(l => ({ ...l, quantities: { ...l.quantities, [c.id]: e.target.value } }))} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>kg/L</span>
                  </div>
                </div>
              );
            })}
          </div>
          <label style={S.lbl}>Notas</label>
          <textarea style={{ ...S.inp, minHeight: 80, resize: "vertical" }} value={nl.notes} onChange={e => setNl(l => ({ ...l, notes: e.target.value }))} placeholder="Observaciones, incidencias..." />
        </div>
        <button style={S.saveBtn} onClick={saveLog}>Guardar Registro</button>
        <button style={S.cancelBtn} onClick={() => setView("dashboard")}>Cancelar</button>
      </div>
    </div>
  );

  const filtered = filterPool === "all" ? logs : logs.filter(l => l.poolId === filterPool);
  return (
    <div className="app">
      <WaterBg />
      <div className="glass" style={S.hdr}>
        <div style={S.logo}>🏊 AquaLog Pro</div>
        <div>
          <button style={S.nb(false)} onClick={() => setView("dashboard")}>Dashboard</button>
          <button style={S.nb(true)}>Historial</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <span style={S.ptitle}>Historial</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select style={{ ...S.sel, width: "auto", padding: "8px 14px", fontSize: 12 }} value={filterPool} onChange={e => setFilterPool(e.target.value)}>
              <option value="all">Todas las piscinas</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {filterPool !== "all" && (
              <button style={S.pdfBtn} onClick={() => exportPDF(pools.find(p => p.id === filterPool), logs)}>
                📄 Exportar PDF
              </button>
            )}
          </div>
        </div>
        {filtered.length === 0
          ? <div className="glass" style={{ ...S.empty, borderRadius: 16, padding: 40 }}><div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>No hay registros aún</div>
          : filtered.map(l => (
            <div key={l.id} className="glass" style={S.logEntry}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{l.poolName}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{fmtDate(l.createdAt)}</div>
                </div>
                <div>{chems.slice(0, 2).map(c => { const v = l.chemicals?.[c.id]; if (!v) return null; const s = getStatus(c.id, v); return <span key={c.id} style={S.badge(s)}>{c.label}: {v}</span>; })}</div>
              </div>
              {l.tasks?.length > 0 && <div style={{ marginBottom: 8 }}>{l.tasks.map(t => <span key={t} style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, margin: 2 }}>{t}</span>)}</div>}
              {Object.keys(l.chemicals || {}).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {chems.map(c => {
                    const v = l.chemicals?.[c.id];
                    const q = l.quantities?.[c.id];
                    if (!v) return null;
                    const s = getStatus(c.id, v);
                    return <span key={c.id} style={S.badge(s)}>{c.label}: {v}{c.unit ? " " + c.unit : ""}{q ? ` · ${q} kg/L` : ""}</span>;
                  })}
                </div>
              )}
              {l.notes && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", borderLeft: "3px solid rgba(255,255,255,0.4)" }}>{l.notes}</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}