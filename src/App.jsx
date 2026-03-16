import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

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

function exportPDF(pool, logs, singleLog = null) {
  const poolLogs = singleLog ? [singleLog] : logs.filter(l => l.pool_id === pool.id);
  const win = window.open("", "_blank");

  const allDates = poolLogs.map(l => new Date(l.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })).reverse();
  const clData = poolLogs.map(l => parseFloat(l.chemicals?.cl) || null).reverse();
  const phData = poolLogs.map(l => parseFloat(l.chemicals?.ph) || null).reverse();

  const chartBars = (data, ideal_min, ideal_max, color) => {
    const max = Math.max(...data.filter(Boolean), ideal_max * 1.5) || 10;
    return data.map((v, i) => {
      if (!v) return `<div style="flex:1;display:flex;align-items:flex-end;justify-content:center"><div style="width:20px;background:#eee;height:4px;border-radius:2px"></div></div>`;
      const h = Math.round((v / max) * 80);
      const ok = v >= ideal_min && v <= ideal_max;
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:9px;color:#555">${v}</div>
        <div style="width:20px;height:${h}px;background:${ok ? color : "#ff6b35"};border-radius:3px 3px 0 0"></div>
        <div style="font-size:8px;color:#888;writing-mode:vertical-lr;transform:rotate(180deg);max-height:40px;overflow:hidden">${allDates[i]}</div>
      </div>`;
    }).join("");
  };

  const statusClass = (id, v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return "nomedido";
    if (id === "cl") return n < 1 ? "bajo" : n > 3 ? "alto" : "optimo";
    if (id === "ph") return n < 7.2 ? "bajo" : n > 7.6 ? "alto" : "optimo";
    if (id === "alk") return n < 80 ? "bajo" : n > 120 ? "alto" : "optimo";
    if (id === "hard") return n < 200 ? "bajo" : n > 400 ? "alto" : "optimo";
    if (id === "cya") return n < 30 ? "bajo" : n > 50 ? "alto" : "optimo";
    return "optimo";
  };
  const statusLabel = (id, v) => ({ optimo: "Óptimo", bajo: "Bajo", alto: "Alto", nomedido: "—" }[statusClass(id, v)]);

  win.document.write(`<!DOCTYPE html>
  <html><head><meta charset="UTF-8"><title>Informe — ${pool.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',Arial,sans-serif;color:#1a2744;background:#fff}
    .page{max-width:800px;margin:0 auto;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #0077b6}
    .header h1{font-size:26px;font-weight:700;color:#0077b6;margin-bottom:4px}
    .header p{font-size:13px;color:#666}
    .date{font-size:12px;color:#888}
    .hbadge{display:inline-block;background:#e8f4fd;color:#0077b6;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-top:4px}
    .pool-info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
    .pool-card{background:linear-gradient(135deg,#0077b6,#00b4d8);border-radius:14px;padding:20px;color:#fff}
    .pool-card h2{font-size:18px;font-weight:700;margin-bottom:8px}
    .pool-card p{font-size:12px;opacity:.85;margin-bottom:3px}
    .pool-img{border-radius:14px;overflow:hidden;background:#e8f4fd;display:flex;align-items:center;justify-content:center;min-height:120px}
    .pool-img img{width:100%;height:100%;object-fit:cover}
    .pool-img-ph{font-size:48px}
    .sec-title{font-size:13px;font-weight:700;color:#0077b6;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #e8f4fd}
    .section{margin-bottom:28px}
    .chart{background:#f8faff;border-radius:12px;padding:16px;margin-bottom:16px}
    .chart-title{font-size:11px;font-weight:600;color:#0077b6;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px}
    .chart-bars{display:flex;align-items:flex-end;gap:4px;height:120px}
    .chart-legend{display:flex;gap:16px;margin-top:8px}
    .chart-legend span{font-size:10px;color:#888;display:flex;align-items:center;gap:4px}
    .legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
    .entry{border:1px solid #e8f0fe;border-radius:12px;padding:18px;margin-bottom:14px}
    .entry-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .entry-date{font-size:14px;font-weight:700;color:#0077b6}
    .entry-num{font-size:11px;color:#888;background:#f0f4ff;padding:3px 10px;border-radius:20px}
    .tasks{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .task-tag{background:#e8f4fd;color:#0077b6;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px}
    th{background:#0077b6;color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
    th:first-child{border-radius:6px 0 0 6px}th:last-child{border-radius:0 6px 6px 0}
    td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:#f8faff}
    .bo{background:#f0fdf8;color:#00a070;border:1px solid #00e5a044;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
    .bb{background:#fffbeb;color:#cc8800;border:1px solid #ffcc0044;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
    .ba{background:#fff5f0;color:#cc4400;border:1px solid #ff6b3544;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
    .notes-box{background:#f8faff;border-left:4px solid #0077b6;padding:10px 14px;border-radius:0 8px 8px 0;font-size:12px;color:#444;margin-top:10px}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center}
    .footer p{font-size:10px;color:#aaa}
    .brand{font-size:12px;font-weight:700;color:#0077b6}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:20px}}
  </style></head><body><div class="page">

  <div class="header">
    <div><h1>🏊 AquaLog Pro</h1><p>Informe de mantenimiento profesional</p></div>
    <div style="text-align:right">
      <div class="date">Generado: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</div>
      <div class="hbadge">${singleLog ? "Registro individual" : `${poolLogs.length} registros`}</div>
    </div>
  </div>

  <div class="pool-info">
    <div class="pool-card">
      <h2>${pool.name}</h2>
      ${pool.location ? `<p>📍 ${pool.location}</p>` : ""}
      ${pool.volume ? `<p>💧 Volumen: ${pool.volume} m³</p>` : ""}
      <p>🏷️ Tipo: ${pool.type || "Residencial"}</p>
      ${!singleLog ? `<p style="margin-top:8px;font-size:11px;opacity:.8">Total registros: ${poolLogs.length}</p>` : ""}
    </div>
    <div class="pool-img">
      ${pool.photo ? `<img src="${pool.photo}" alt="${pool.name}">` : `<div class="pool-img-ph">🏊</div>`}
    </div>
  </div>

  ${!singleLog && poolLogs.length > 1 ? `
  <div class="section">
    <div class="sec-title">Evolución del agua</div>
    <div class="chart">
      <div class="chart-title">Cloro (ppm) — ideal 1–3</div>
      <div class="chart-bars">${chartBars(clData, 1, 3, "#00b4d8")}</div>
      <div class="chart-legend"><span><span class="legend-dot" style="background:#00b4d8"></span>En rango</span><span><span class="legend-dot" style="background:#ff6b35"></span>Fuera de rango</span></div>
    </div>
    <div class="chart">
      <div class="chart-title">pH — ideal 7.2–7.6</div>
      <div class="chart-bars">${chartBars(phData, 7.2, 7.6, "#0077b6")}</div>
    </div>
  </div>` : ""}

  <div class="section">
    <div class="sec-title">${singleLog ? "Detalle del registro" : "Historial de registros"}</div>
    ${poolLogs.map((l, idx) => {
      const chemEntries = chems.filter(c => l.chemicals?.[c.id]);
      return `<div class="entry">
        <div class="entry-header">
          <div class="entry-date">📅 ${fmtDate(l.created_at)}</div>
          ${!singleLog ? `<div class="entry-num">Registro #${poolLogs.length - idx}</div>` : ""}
        </div>
        ${l.tasks?.length ? `<div class="tasks">${l.tasks.map(t => `<span class="task-tag">${t}</span>`).join("")}</div>` : ""}
        ${chemEntries.length ? `
        <table>
          <tr><th>Parámetro</th><th>Valor</th><th>Estado</th><th>Cantidad añadida</th></tr>
          ${chemEntries.map(c => {
            const v = l.chemicals[c.id];
            const q = l.quantities?.[c.id];
            const sc = statusClass(c.id, v);
            const badgeClass = sc === "optimo" ? "bo" : sc === "bajo" ? "bb" : "ba";
            return `<tr>
              <td><strong>${c.label}</strong>${c.unit ? ` (${c.unit})` : ""}</td>
              <td><strong>${v}</strong></td>
              <td><span class="${badgeClass}">${statusLabel(c.id, v)}</span></td>
              <td>${q ? `${q} kg/L` : "—"}</td>
            </tr>`;
          }).join("")}
        </table>` : ""}
        ${l.notes ? `<div class="notes-box">📝 ${l.notes}</div>` : ""}
      </div>`;
    }).join("")}
  </div>

  <div class="footer">
    <p>Generado automáticamente por AquaLog Pro · ${new Date().toLocaleDateString("es-ES")}</p>
    <div class="brand">🏊 AquaLog Pro</div>
  </div>

  </div></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pools, setPools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [selPool, setSelPool] = useState(null);
  const [np, setNp] = useState({ name: "", location: "", volume: "", type: "Residencial", photo: null });
  const [nl, setNl] = useState({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) });
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const photoRef = useRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) { loadPools(session.user.id); loadLogs(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { loadPools(session.user.id); loadLogs(session.user.id); }
      else { setPools([]); setLogs([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadPools(userId) {
    const { data } = await supabase.from("pools").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setPools(data);
  }

  async function loadLogs(userId) {
    const { data } = await supabase.from("logs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setLogs(data);
  }

  async function handleAuth() {
    setAuthError(""); setAuthLoading(true);
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError("Email o contraseña incorrectos");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError("Error: " + error.message);
      else setAuthError("✅ Revisa tu email para confirmar la cuenta");
    }
    setAuthLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setView("dashboard");
  }

  async function savePool() {
    if (!np.name.trim() || !user) return;
    const { data, error } = await supabase.from("pools").insert([{ ...np, user_id: user.id }]).select();
    if (!error && data) setPools(p => [data[0], ...p]);
    setNp({ name: "", location: "", volume: "", type: "Residencial", photo: null });
    setView("dashboard");
  }

  async function saveLog() {
    if (!selPool || !user) return;
    const entry = { ...nl, pool_id: selPool.id, pool_name: selPool.name, user_id: user.id };
    const { data, error } = await supabase.from("logs").insert([entry]).select();
    if (!error && data) setLogs(l => [data[0], ...l]);
    setNl({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) });
    setView("poolDetail");
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

  function lastLog(pid) { return logs.find(l => l.pool_id === pid); }
  function poolLogs(pid) { return logs.filter(l => l.pool_id === pid); }

  const now = new Date();
  const thisMonth = logs.filter(l => { const d = new Date(l.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

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
  const btnPDF = { background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, Arial, sans-serif" };

  const Logo = () => <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>🏊 AquaLog Pro</div>;

  if (loading) return (
    <div style={wrap}><div style={bg} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#fff" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🏊</div><div style={{ fontSize: 16, fontWeight: 600 }}>Cargando...</div></div>
      </div>
    </div>
  );

  // LOGIN
  if (!user) return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div style={{ ...glassDark, borderRadius: 20, padding: 36, width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏊</div>
            <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>AquaLog Pro</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>Gestión profesional de piscinas</div>
          </div>
          <div style={{ display: "flex", marginBottom: 24, background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setAuthMode(m)} style={{ flex: 1, background: authMode === m ? "rgba(255,255,255,0.2)" : "transparent", border: "none", color: "#fff", padding: "8px", borderRadius: 8, cursor: "pointer", fontFamily: "Inter,Arial,sans-serif", fontWeight: authMode === m ? 700 : 400, fontSize: 13 }}>
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>
          <label style={lbl}>Email</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
          <label style={lbl}>Contraseña</label>
          <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" onKeyDown={e => e.key === "Enter" && handleAuth()} />
          {authError && <div style={{ marginTop: 12, padding: "10px 14px", background: authError.startsWith("✅") ? "rgba(0,229,160,0.15)" : "rgba(255,107,53,0.15)", border: `1px solid ${authError.startsWith("✅") ? "rgba(0,229,160,0.4)" : "rgba(255,107,53,0.4)"}`, borderRadius: 8, color: authError.startsWith("✅") ? "#00e5a0" : "#ff6b35", fontSize: 13 }}>{authError}</div>}
          <button style={{ ...btnSave, marginTop: 20, width: "100%", padding: "13px" }} onClick={handleAuth} disabled={authLoading}>
            {authLoading ? "..." : authMode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </div>
  );

  // DASHBOARD
  if (view === "dashboard") return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={hdr}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{user.email}</span>
          <button style={{ ...navBtn(false), borderColor: "rgba(255,100,100,0.4)", color: "rgba(255,180,180,0.9)" }} onClick={handleLogout}>Salir</button>
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

        <div style={display: "flex", : justifyContent: "space-between", alignItems: "center", marginBottom: 14, background: "rgba(0,20,60,0.3)", borderRadius: 12, padding: "12px 16px" }>
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
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {pools.map(pool => {
                const last = lastLog(pool.id);
                const pLogs = poolLogs(pool.id);
                const cl = last ? getStatus("cl", last.chemicals?.cl) : "No medido";
                const ph = last ? getStatus("ph", last.chemicals?.ph) : "No medido";
                return (
                  <div key={pool.id} style={{ ...glass, borderRadius: 16, padding: 18, cursor: "pointer" }} onClick={() => { setSelPool(pool); setView("poolDetail"); }}>
                    {pool.photo
                      ? <img src={pool.photo} alt={pool.name} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
                      : <div style={{ width: "100%", height: 80, background: "rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 10 }}>🏊</div>
                    }
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{pool.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>{[pool.location, pool.type].filter(Boolean).join(" · ")}</div>
                    {pool.volume && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Vol: {pool.volume} m³</div>}
                    <div style={{ marginBottom: 8 }}><span style={badge(cl)}>Cl: {cl}</span><span style={badge(ph)}>pH: {ph}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{pLogs.length} registros · {last ? fmtDate(last.created_at) : "Sin registros"}</div>
                      <div style={{ fontSize: 11, color: "#00e5ff" }}>Ver →</div>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );

  // POOL DETAIL
  if (view === "poolDetail" && selPool) {
    const pLogs = poolLogs(selPool.id);
    return (
      <div style={wrap}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={bg} />
        <div style={hdr}>
          <Logo />
          <div style={{ display: "flex", gap: 6 }}>
            <button style={navBtn(false)} onClick={() => setView("dashboard")}>← Piscinas</button>
            <button style={navBtn(false)} onClick={() => exportPDF(selPool, logs)}>📄 PDF</button>
          </div>
        </div>
        <div style={main}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{selPool.name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>{[selPool.location, selPool.type, selPool.volume ? selPool.volume + " m³" : ""].filter(Boolean).join(" · ")}</div>
            </div>
            <button style={btnAdd} onClick={() => { setNl({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) }); setView("addLog"); }}>+ Nuevo Registro</button>
          </div>

          {selPool.photo && <img src={selPool.photo} alt={selPool.name} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, marginBottom: 20 }} />}

          {pLogs.length === 0
            ? <div style={{ ...glass, borderRadius: 16, padding: 50, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Sin registros aún</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 20 }}>Añade el primer análisis de esta piscina</div>
                <button style={btnAdd} onClick={() => { setNl({ tasks: [], chemicals: {}, quantities: {}, notes: "", date: new Date().toISOString().slice(0, 10) }); setView("addLog"); }}>+ Nuevo Registro</button>
              </div>
            : pLogs.map(l => (
              <div key={l.id} style={{ ...glass, borderRadius: 14, padding: 18, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>📅 {fmtDate(l.created_at)}</div>
                  <button style={btnPDF} onClick={() => exportPDF(selPool, logs, l)}>📄 PDF</button>
                </div>
                {l.tasks?.length > 0 && <div style={{ marginBottom: 8 }}>{l.tasks.map(t => <span key={t} style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, margin: 2 }}>{t}</span>)}</div>}
                {Object.keys(l.chemicals || {}).length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {chems.map(c => {
                      const v = l.chemicals?.[c.id];
                      const q = l.quantities?.[c.id];
                      if (!v) return null;
                      const s = getStatus(c.id, v);
                      return <span key={c.id} style={badge(s)}>{c.label}: {v}{c.unit ? " " + c.unit : ""}{q ? ` · ${q} kg/L` : ""}</span>;
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

  // ADD POOL
  if (view === "addPool") return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={bg} />
      <div style={hdr}><Logo /><button style={navBtn(false)} onClick={() => setView("dashboard")}>← Volver</button></div>
      <div style={main}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Nueva Piscina</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 22 }}>Añade los datos de la instalación</div>
        <div style={{ ...glassDark, borderRadius: 16, padding: 24 }}>
          <label style={lbl}>Foto de la piscina</label>
          <div onClick={() => photoRef.current.click()} style={{ width: "100%", height: 130, background: "rgba(255,255,255,0.08)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.3)", overflow: "hidden" }}>
            {np.photo ? <img src={np.photo} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}><div style={{ fontSize: 28 }}>📷</div><div style={{ fontSize: 12, marginTop: 6 }}>Pulsa para añadir foto</div></div>}
          </div>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
          <label style={lbl}>Nombre</label>
          <input style={inp} value={np.name} onChange={e => setNp(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Villa Monterrey" />
          <label style={lbl}>Ubicación</label>
          <input style={inp} value={np.location} onChange={e => setNp(p => ({ ...p, location: e.target.value }))} placeholder="Dirección o referencia" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Volumen (m³)</label><input style={inp} type="number" value={np.volume} onChange={e => setNp(p => ({ ...p, volume: e.target.value }))} placeholder="Ej: 50" /></div>
            <div><label style={lbl}>Tipo</label><select style={sel} value={np.type} onChange={e => setNp(p => ({ ...p, type: e.target.value }))}><option>Residencial</option><option>Comercial</option><option>Deportiva</option><option>Hotel</option><option>Club</option></select></div>
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
      <div style={hdr}><Logo /><button style={navBtn(false)} onClick={() => setView("poolDetail")}>← Volver</button></div>
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
            <button style={btnCancel} onClick={() => setView("poolDetail")}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}