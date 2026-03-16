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

const statusColors = { Óptimo: "#00e5a0", Bajo: "#ffcc00", Alto: "#ff6b35", "No medido": "#666" };

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
  win.document.write(`<html><head><title>Informe ${pool.name}</title>
  <style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a2e}h1{color:#0077b6;border-bottom:2px solid #0077b6;padding-bottom:10px}.meta{color:#666;font-size:13px;margin-bottom:30px}.entry{border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:16px}.date{font-weight:700;color:#0077b6;margin-bottom:8px}.task{display:inline-block;background:#e8f4fd;color:#0077b6;padding:2px 10px;border-radius:20px;font-size:11px;margin:2px}.notes{background:#f8f9fa;border-left:3px solid #0077b6;padding:8px 12px;font-size:13px;margin-top:8px}table{width:100%;border-collapse:collapse;margin-top:8px}td,th{padding:6px 10px;border:1px solid #eee;font-size:12px;text-align:left}th{background:#e8f4fd;color:#0077b6}</style>
  </head><body>
  <h1>🏊 Informe — ${pool.name}</h1>
  <div class="meta">${pool.location ? "📍 " + pool.location : ""} ${pool.volume ? "· Vol: " + pool.volume + " m³" : ""} · Generado: ${new Date().toLocaleDateString("es-ES")}</div>
  <p><strong>Total registros:</strong> ${poolLogs.length}</p>
  ${poolLogs.map(l => `<div class="entry"><div class="date">📅 ${fmtDate(l.createdAt)}</div>${l.tasks?.length ? `<div>${l.tasks.map(t => `<span class="task">${t}</span>`).join("")}</div>` : ""}${Object.keys(l.chemicals || {}).length ? `<table><tr><th>Parámetro</th><th>Valor</th><th>Producto</th><th>Cantidad</th></tr>${chems.map(c => { const v = l.chemicals?.[c.id]; const q = l.quantities?.[c.id]; if (!v) return ""; return `<tr><td>${c.label}</td><td>${v} ${c.unit}</td><td>${c.prod}</td><td>${q ? q + " kg/L" : "—"}</td></tr>`; }).join("")}</table>` : ""}${l.notes ? `<div class="notes">📝 ${l.notes}</div>` : ""}</div>`).join("")}
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

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

  const bg = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(160deg,#0077b6 0%,#00b4d8 50%,#90e0ef 100%)", zIndex: 0 };
  const wrap = { position: "relative", zIndex: 1, minHeight: "100vh", fontFamily: "Inter, Arial, sans-serif" };
  const glass = { background: "rgba(255,255,255,0.18)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.35)" };
  const glassDark = { background: "rgba(0,20,50,0.45)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.2)" };
  const hdr = { ...glass, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" };
  const main = { maxWidth: 820, margin: "0 auto", padding: "24px 16px" };
  const inp = { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Inter, Arial, sans-serif", width: "100%", outline: "none", boxSizing: "border-box" };
  const sel = { background: "rgba(0,20,50,0.7)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Inter, Arial, sans-serif", width: "100%", outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 11, color: "rgba(255,255,255,0.75)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, display: "block", marginTop: 18, fontWeight: 600 };
  const badge = (s) => ({ display: "inline-block", background: statusColors[s] + "33", color: statusColors[s], border: `1px solid ${statusColors[s]}66`, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 600, marginRight: 4, marginBottom: 3 });
  const chip = (s) => ({ display: "inline-block", background: s ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)", border: `1px solid ${s ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)"}`, color: s ? "#fff" : "rgba(255,255,255,0.6)", borderRadius: 20, padding: "5px 13px", fontSize: 12, cursor: "pointer", margin: 3, fontWeight: s ? 600 : 400 });
  const navBtn = (a) => ({ background: a ? "rgba(255,255,255,0.25)" : "transparent", border: a ? "1px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "Inter, Arial, sans-serif", fontSize: 12, fontWeight: a ? 600 : 400, marginLeft: 6 });

  const btnRow = { display: "flex", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)" };
  const btnSave = { background: "#003f88", color: "#fff", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, Arial, sans-serif", flex: 1, boxShadow: "0 4px 15px rgba(0,0,0,0.3)" };
  const btnCancel = { background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "13px 0", fontSize: 15, cursor: "pointer", fontFamily: "Inter, Arial, sans-serif", flex: 1 };
  const btnAdd = { background: "#003f88", color: "#fff", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 10, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, Arial, sans-serif", boxShadow: "0 4px 15px rgba(0,0,0,0.35)" };

  // DASHBOARD
  if (view === "dashboard") return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={hdr}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>🏊 AquaLog Pro</div>
        <div>
          <button style={navBtn(true)}>Dashboard</button>
          <button style={navBtn(false)} onClick={() => setView("history")}>Historial</button>
        </div>
      </div>
      <div style={main}>
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[["🏊", pools.length, "Piscinas"], ["📋", logs.length, "Registros"], ["📅", thisMonth, "Este mes"]].map(([icon, n, l]) => (
            <div key={l} style={{ ...glass, borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 100, textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{n}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Mis Piscinas</span>
          <button style={btnAdd} onClick={() => setView("addPool")}>+ Nueva Piscina</button>
        </div>
        {pools.length === 0
          ? <div style={{ ...glass, borderRadius: 16, padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏊‍♂️</div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Aún no tienes piscinas</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 22 }}>Pulsa el botón para añadir la primera</div>
              <button style={btnAdd} onClick={() => setView("addPool")}>+ Nueva Piscina</button>
            </div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
              {pools.map(pool => {
                const last = lastLog(pool.id);
                const cl = last ? getStatus("cl", last.chemicals?.cl) : "No medido";
                const ph = last ? getStatus("ph", last.chemicals?.ph) : "No medido";
                return (
                  <div key={pool.id} style={{ ...glass, borderRadius: 16, padding: 18, cursor: "pointer" }} onClick={() => { setSelPool(pool); setNl({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) }); setView("addLog"); }}>
                    {pool.photo
                      ? <img src={pool.photo} alt={pool.name} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
                      : <div style={{ width: "100%", height: 80, background: "rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 10 }}>🏊</div>
                    }
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{pool.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>{[pool.location, pool.type].filter(Boolean).join(" · ")}</div>
                    {pool.volume && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Vol: {pool.volume} m³</div>}
                    <div><span style={badge(cl)}>Cl: {cl}</span><span style={badge(ph)}>pH: {ph}</span></div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>{last ? `Último: ${fmtDate(last.createdAt)}` : "Sin registros aún"}</div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );

  // ADD POOL
  if (view === "addPool") return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={hdr}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>🏊 AquaLog Pro</div>
        <button style={navBtn(false)} onClick={() => setView("dashboard")}>← Volver</button>
      </div>
      <div style={main}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Nueva Piscina</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 22 }}>Añade los datos de la instalación</div>
        <div style={{ ...glassDark, borderRadius: 16, padding: 24 }}>
          <label style={lbl}>Foto de la piscina</label>
          <div onClick={() => photoRef.current.click()} style={{ width: "100%", height: 130, background: "rgba(255,255,255,0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.3)", overflow: "hidden" }}>
            {np.photo
              ? <img src={np.photo} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}><div style={{ fontSize: 28 }}>📷</div><div style={{ fontSize: 12, marginTop: 6 }}>Pulsa para añadir foto</div></div>
            }
          </div>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
          <label style={lbl}>Nombre</label>
          <input style={inp} value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Villa Monterrey" />
          <label style={lbl}>Ubicación</label>
          <input style={inp} value={np.location} onChange={e => setNp(p => ({ ...p, location: e.target.value }))} placeholder="Dirección o referencia" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Volumen (m³)</label>
              <input style={inp} type="number" value={np.volume} onChange={e => setNp(p => ({ ...p, volume: e.target.value }))} placeholder="Ej: 50" />
            </div>
            <div>
              <label style={lbl}>Tipo</label>
              <select style={sel} value={np.type} onChange={e => setNp(p => ({ ...p, type: e.target.value }))}>
                <option>Residencial</option><option>Comercial</option><option>Deportiva</option><option>Hotel</option><option>Club</option>
              </select>
            </div>
          </div>
          <div style={btnRow}>
            <button style={btnSave} onClick={savePool}>✓ Guardar Piscina</button>
            <button style={btnCancel} onClick={() => setView("dashboard")}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ADD LOG
  if (view === "addLog") return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={hdr}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>🏊 AquaLog Pro</div>
        <button style={navBtn(false)} onClick={() => setView("dashboard")}>← Volver</button>
      </div>
      <div style={main}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{selPool?.name}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 22 }}>Nuevo registro de mantenimiento</div>
        <div style={{ ...glassDark, borderRadius: 16, padding: 24 }}>
          <label style={lbl}>Fecha</label>
          <input style={{ ...inp, maxWidth: 200 }} type="date" value={nl.date} onChange={e => setNl(l => ({ ...l, date: e.target.value }))} />
          <label style={lbl}>Tareas realizadas</label>
          <div style={{ marginBottom: 8 }}>{taskOptions.map(t => <span key={t} style={chip(nl.tasks.includes(t))} onClick={() => toggleTask(t)}>{t}</span>)}</div>
          <label style={lbl}>Mediciones y productos</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginTop: 6 }}>
            {chems.map(c => {
              const v = nl.chemicals[c.id] || "";
              const q = nl.quantities[c.id] || "";
              const s = v ? getStatus(c.id, v) : null;
              return (
                <div key={c.id} style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${v ? statusColors[s] + "88" : "rgba(255,255,255,0.2)"}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 5, fontWeight: 600 }}>{c.label}{c.unit ? ` (${c.unit})` : ""}</div>
                  <input style={{ background: "transparent", border: "none", color: v ? statusColors[s] : "#fff", fontSize: 20, fontFamily: "Inter,Arial,sans-serif", fontWeight: 700, width: "100%", outline: "none" }} type="number" step="0.1" value={v} placeholder="—" onChange={e => setNl(l => ({ ...l, chemicals: { ...l.chemicals, [c.id]: e.target.value } }))} />
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", margin: "3px 0 5px" }}>Ideal: {c.ideal}</div>
                  {s && <span style={{ ...badge(s), display: "inline-block", marginBottom: 6 }}>{s}</span>}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>Cantidad añadida</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input style={{ ...inp, padding: "5px 8px", fontSize: 13, flex: 1 }} type="number" step="0.1" value={q} placeholder="0" onChange={e => setNl(l => ({ ...l, quantities: { ...l.quantities, [c.id]: e.target.value } }))} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>kg/L</span>
                  </div>
                </div>
              );
            })}
          </div>
          <label style={lbl}>Notas</label>
          <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={nl.notes} onChange={e => setNl(l => ({ ...l, notes: e.target.value }))} placeholder="Observaciones, incidencias..." />
          <div style={btnRow}>
            <button style={btnSave} onClick={saveLog}>✓ Guardar Registro</button>
            <button style={btnCancel} onClick={() => setView("dashboard")}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );

  // HISTORY
  const filtered = filterPool === "all" ? logs : logs.filter(l => l.poolId === filterPool);
  return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={hdr}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>🏊 AquaLog Pro</div>
        <div>
          <button style={navBtn(false)} onClick={() => setView("dashboard")}>Dashboard</button>
          <button style={navBtn(true)}>Historial</button>
        </div>
      </div>
      <div style={main}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>Historial</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select style={{ ...sel, width: "auto", padding: "8px 14px", fontSize: 12 }} value={filterPool} onChange={e => setFilterPool(e.target.value)}>
              <option value="all">Todas las piscinas</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {filterPool !== "all" && (
              <button style={{ ...btnAdd, padding: "8px 16px", fontSize: 12 }} onClick={() => exportPDF(pools.find(p => p.id === filterPool), logs)}>
                📄 Exportar PDF
              </button>
            )}
          </div>
        </div>
        {filtered.length === 0
          ? <div style={{ ...glass, borderRadius: 16, padding: 50, textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>No hay registros aún
            </div>
          : filtered.map(l => (
            <div key={l.id} style={{ ...glass, borderRadius: 14, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{l.poolName}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{fmtDate(l.createdAt)}</div>
                </div>
                <div>{chems.slice(0, 2).map(c => { const v = l.chemicals?.[c.id]; if (!v) return null; const s = getStatus(c.id, v); return <span key={c.id} style={badge(s)}>{c.label}: {v}</span>; })}</div>
              </div>
              {l.tasks?.length > 0 && <div style={{ marginBottom: 8 }}>{l.tasks.map(t => <span key={t} style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, margin: 2 }}>{t}</span>)}</div>}
              {Object.keys(l.chemicals || {}).length > 0 && <div style={{ marginBottom: 8 }}>{chems.map(c => { const v = l.chemicals?.[c.id]; const q = l.quantities?.[c.id]; if (!v) return null; const s = getStatus(c.id, v); return <span key={c.id} style={badge(s)}>{c.label}: {v}{c.unit ? " " + c.unit : ""}{q ? ` · ${q} kg/L` : ""}</span>; })}</div>}
              {l.notes && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", borderLeft: "3px solid rgba(255,255,255,0.4)" }}>{l.notes}</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}