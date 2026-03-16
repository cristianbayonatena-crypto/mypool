import { useState } from "react";

const chems = [
  { id: "cl", label: "Cloro", unit: "ppm", ideal: "1–3" },
  { id: "ph", label: "pH", unit: "", ideal: "7.2–7.6" },
  { id: "alk", label: "Alcalinidad", unit: "ppm", ideal: "80–120" },
  { id: "hard", label: "Dureza", unit: "ppm", ideal: "200–400" },
  { id: "cya", label: "Ác. cianúrico", unit: "ppm", ideal: "30–50" },
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

const S = {
  app: { minHeight: "100vh", background: "#0a1628", color: "#e8f4fd", fontFamily: "monospace" },
  hdr: { background: "linear-gradient(135deg,#0d2240,#0a3d62)", padding: "14px 20px", borderBottom: "1px solid #1a4a7a", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 16, fontWeight: 700, color: "#00e5ff", letterSpacing: 2 },
  nb: (a) => ({ background: a ? "#00e5ff22" : "transparent", border: a ? "1px solid #00e5ff" : "1px solid #1a4a7a", color: a ? "#00e5ff" : "#7fb3d3", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: 11, marginLeft: 6 }),
  main: { maxWidth: 800, margin: "0 auto", padding: "20px 16px" },
  statRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  stat: { background: "#0f2744", border: "1px solid #1a4a7a", borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 90, textAlign: "center" },
  statN: { fontSize: 24, fontWeight: 700, color: "#00e5ff" },
  statL: { fontSize: 9, color: "#7fb3d3", letterSpacing: 2 },
  secHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  secLbl: { fontSize: 10, color: "#7fb3d3", letterSpacing: 2, textTransform: "uppercase" },
  addBtn: { background: "linear-gradient(135deg,#0077b6,#00b4d8)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", fontWeight: 600, letterSpacing: 1 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 },
  card: { background: "linear-gradient(145deg,#0f2744,#0d2240)", border: "1px solid #1a4a7a", borderRadius: 12, padding: 16, cursor: "pointer" },
  badge: (s) => ({ display: "inline-block", background: statusColors[s] + "22", color: statusColors[s], border: `1px solid ${statusColors[s]}44`, borderRadius: 20, padding: "2px 8px", fontSize: 10, letterSpacing: 1, marginRight: 4, marginBottom: 3 }),
  empty: { textAlign: "center", color: "#3a6a8a", padding: "40px 16px", fontSize: 13 },
  lbl: { fontSize: 10, color: "#7fb3d3", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, display: "block", marginTop: 16 },
  inp: { background: "#0d2240", border: "1px solid #1a4a7a", borderRadius: 8, padding: "9px 12px", color: "#e8f4fd", fontSize: 13, fontFamily: "monospace", width: "100%", outline: "none", boxSizing: "border-box" },
  sel: { background: "#0d2240", border: "1px solid #1a4a7a", borderRadius: 8, padding: "9px 12px", color: "#e8f4fd", fontSize: 13, fontFamily: "monospace", width: "100%", outline: "none", boxSizing: "border-box" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  saveBtn: { background: "linear-gradient(135deg,#00b4d8,#0077b6)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 13, cursor: "pointer", fontFamily: "monospace", fontWeight: 700, marginTop: 20 },
  cancelBtn: { background: "transparent", color: "#7fb3d3", border: "1px solid #1a4a7a", borderRadius: 10, padding: "11px 18px", fontSize: 13, cursor: "pointer", fontFamily: "monospace", marginTop: 20, marginLeft: 8 },
  chip: (s) => ({ display: "inline-block", background: s ? "#00b4d822" : "#0f2744", border: `1px solid ${s ? "#00b4d8" : "#1a4a7a"}`, color: s ? "#00e5ff" : "#7fb3d3", borderRadius: 20, padding: "4px 11px", fontSize: 11, cursor: "pointer", margin: 3 }),
  chemGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginTop: 6 },
  chemBox: (v, id) => { const s = v ? getStatus(id, v) : null; return { background: "#0d2240", border: `1px solid ${v ? statusColors[s] + "66" : "#1a4a7a"}`, borderRadius: 10, padding: 12 }; },
  chemInp: (v, id) => ({ background: "transparent", border: "none", color: v ? statusColors[getStatus(id, v)] : "#e8f4fd", fontSize: 16, fontFamily: "monospace", width: "100%", outline: "none" }),
  logEntry: { background: "#0f2744", border: "1px solid #1a4a7a", borderRadius: 12, padding: 16, marginBottom: 10 },
  ptitle: { color: "#00e5ff", fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 4 },
  psub: { fontSize: 11, color: "#7fb3d3", marginBottom: 20, letterSpacing: 1 },
};

export default function App() {
  const [pools, setPools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [selPool, setSelPool] = useState(null);
  const [np, setNp] = useState({ name: "", location: "", volume: "", type: "Residencial" });
  const [nl, setNl] = useState({ tasks: [], chemicals: {}, notes: "", date: new Date().toISOString().slice(0, 10) });
  const [filterPool, setFilterPool] = useState("all");

  const now = new Date();
  const thisMonth = logs.filter(l => { const d = new Date(l.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

  function savePool() {
    if (!np.name.trim()) return;
    setPools(p => [...p, { ...np, id: Date.now().toString() }]);
    setNp({ name: "", location: "", volume: "", type: "Residencial" });
    setView("dashboard");
  }

  function saveLog() {
    if (!selPool) return;
    setLogs(l => [{ ...nl, id: Date.now().toString(), poolId: selPool.id, poolName: selPool.name, createdAt: new Date().toISOString() }, ...l]);
    setNl({ tasks: [], chemicals: {}, notes: "", date: new Date().toISOString().slice(0, 10) });
    setView("dashboard");
  }

  function toggleTask(t) {
    setNl(l => ({ ...l, tasks: l.tasks.includes(t) ? l.tasks.filter(x => x !== t) : [...l.tasks, t] }));
  }

  function lastLog(pid) { return logs.find(l => l.poolId === pid); }

  if (view === "dashboard") return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={S.logo}>🏊 AquaLog Pro</div>
        <div>
          <button style={S.nb(true)}>Dashboard</button>
          <button style={S.nb(false)} onClick={() => setView("history")}>Historial</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={S.statRow}>
          <div style={S.stat}><div style={S.statN}>{pools.length}</div><div style={S.statL}>PISCINAS</div></div>
          <div style={S.stat}><div style={S.statN}>{logs.length}</div><div style={S.statL}>REGISTROS</div></div>
          <div style={S.stat}><div style={S.statN}>{thisMonth}</div><div style={S.statL}>ESTE MES</div></div>
        </div>
        <div style={S.secHead}>
          <span style={S.secLbl}>Mis Piscinas</span>
          <button style={S.addBtn} onClick={() => setView("addPool")}>+ Nueva Piscina</button>
        </div>
        {pools.length === 0
          ? <div style={S.empty}><div style={{ fontSize: 36, marginBottom: 10 }}>🏊‍♂️</div>Añade tu primera piscina para empezar</div>
          : <div style={S.grid}>{pools.map(pool => {
            const last = lastLog(pool.id);
            const cl = last ? getStatus("cl", last.chemicals?.cl) : "No medido";
            const ph = last ? getStatus("ph", last.chemicals?.ph) : "No medido";
            return (
              <div key={pool.id} style={S.card} onClick={() => { setSelPool(pool); setNl({ tasks: [], chemicals: {}, notes: "", date: new Date().toISOString().slice(0, 10) }); setView("addLog"); }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>🏊</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f4fd", marginBottom: 3 }}>{pool.name}</div>
                <div style={{ fontSize: 10, color: "#7fb3d3", marginBottom: 10, letterSpacing: 1 }}>{[pool.location, pool.type].filter(Boolean).join(" · ")}</div>
                {pool.volume && <div style={{ fontSize: 10, color: "#5a9abf", marginBottom: 8 }}>Vol: {pool.volume} m³</div>}
                <div><span style={S.badge(cl)}>Cl: {cl}</span><span style={S.badge(ph)}>pH: {ph}</span></div>
                <div style={{ fontSize: 10, color: "#3a6a8a", marginTop: 8 }}>{last ? `Último: ${fmtDate(last.createdAt)}` : "Sin registros aún"}</div>
                <div style={{ fontSize: 10, color: "#00b4d8", marginTop: 8, letterSpacing: 1 }}>TAP PARA REGISTRAR →</div>
              </div>
            );
          })}</div>
        }
      </div>
    </div>
  );

  if (view === "addPool") return (
    <div style={S.app}>
      <div style={S.hdr}><div style={S.logo}>🏊 AquaLog Pro</div></div>
      <div style={S.main}>
        <div style={S.ptitle}>NUEVA PISCINA</div>
        <div style={S.psub}>Rellena los datos de la instalación</div>
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
        <button style={S.saveBtn} onClick={savePool}>Guardar Piscina</button>
        <button style={S.cancelBtn} onClick={() => setView("dashboard")}>Cancelar</button>
      </div>
    </div>
  );

  if (view === "addLog") return (
    <div style={S.app}>
      <div style={S.hdr}><div style={S.logo}>🏊 AquaLog Pro</div></div>
      <div style={S.main}>
        <div style={S.ptitle}>{selPool?.name}</div>
        <div style={S.psub}>Nuevo registro de mantenimiento</div>
        <label style={S.lbl}>Fecha</label>
        <input style={{ ...S.inp, maxWidth: 200 }} type="date" value={nl.date} onChange={e => setNl(l => ({ ...l, date: e.target.value }))} />
        <label style={S.lbl}>Tareas realizadas</label>
        <div>{taskOptions.map(t => <span key={t} style={S.chip(nl.tasks.includes(t))} onClick={() => toggleTask(t)}>{t}</span>)}</div>
        <label style={S.lbl}>Mediciones químicas</label>
        <div style={S.chemGrid}>
          {chems.map(c => {
            const v = nl.chemicals[c.id] || "";
            const s = v ? getStatus(c.id, v) : null;
            return (
              <div key={c.id} style={S.chemBox(v, c.id)}>
                <div style={{ fontSize: 10, color: "#7fb3d3", marginBottom: 6, letterSpacing: 1 }}>{c.label}{c.unit ? ` (${c.unit})` : ""}</div>
                <input style={S.chemInp(v, c.id)} type="number" step="0.1" value={v} placeholder="—" onChange={e => setNl(l => ({ ...l, chemicals: { ...l.chemicals, [c.id]: e.target.value } }))} />
                <div style={{ fontSize: 9, color: "#3a6a8a", marginTop: 4 }}>Ideal: {c.ideal}</div>
                {s && <span style={{ ...S.badge(s), marginTop: 4, display: "inline-block" }}>{s}</span>}
              </div>
            );
          })}
        </div>
        <label style={S.lbl}>Notas</label>
        <textarea style={{ ...S.inp, minHeight: 70, resize: "vertical" }} value={nl.notes} onChange={e => setNl(l => ({ ...l, notes: e.target.value }))} placeholder="Observaciones, incidencias..." />
        <button style={S.saveBtn} onClick={saveLog}>Guardar Registro</button>
        <button style={S.cancelBtn} onClick={() => setView("dashboard")}>Cancelar</button>
      </div>
    </div>
  );

  const filtered = filterPool === "all" ? logs : logs.filter(l => l.poolId === filterPool);
  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={S.logo}>🏊 AquaLog Pro</div>
        <div>
          <button style={S.nb(false)} onClick={() => setView("dashboard")}>Dashboard</button>
          <button style={S.nb(true)}>Historial</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={S.ptitle}>HISTORIAL</span>
          <select style={{ ...S.sel, width: "auto", padding: "7px 12px", fontSize: 11 }} value={filterPool} onChange={e => setFilterPool(e.target.value)}>
            <option value="all">Todas las piscinas</option>
            {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {filtered.length === 0
          ? <div style={S.empty}><div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>No hay registros aún</div>
          : filtered.map(l => (
            <div key={l.id} style={S.logEntry}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#00e5ff", fontWeight: 700, fontSize: 14 }}>{l.poolName}</div>
                  <div style={{ fontSize: 10, color: "#7fb3d3", marginTop: 2, letterSpacing: 1 }}>{fmtDate(l.createdAt)}</div>
                </div>
                <div>{chems.slice(0, 2).map(c => { const v = l.chemicals?.[c.id]; if (!v) return null; const s = getStatus(c.id, v); return <span key={c.id} style={S.badge(s)}>{c.label}: {v}</span>; })}</div>
              </div>
              {l.tasks?.length > 0 && <div style={{ marginBottom: 8 }}>{l.tasks.map(t => <span key={t} style={{ display: "inline-block", background: "#00b4d811", border: "1px solid #00b4d833", color: "#00b4d8", borderRadius: 20, padding: "3px 9px", fontSize: 10, margin: 2 }}>{t}</span>)}</div>}
              {Object.keys(l.chemicals || {}).length > 0 && <div style={{ marginBottom: 8 }}>{chems.map(c => { const v = l.chemicals?.[c.id]; if (!v) return null; const s = getStatus(c.id, v); return <span key={c.id} style={S.badge(s)}>{c.label}: {v}{c.unit ? " " + c.unit : ""}</span>; })}</div>}
              {l.notes && <div style={{ fontSize: 11, color: "#7fb3d3", background: "#0a1e38", borderRadius: 6, padding: "8px 10px", borderLeft: "3px solid #1a4a7a" }}>{l.notes}</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}