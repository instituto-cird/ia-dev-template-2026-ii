import { useEffect, useState } from "react";
import { api, type Status } from "./api";
import { Icon } from "./components/ui";
import { useRoute } from "./hooks";
import { Agent } from "./views/Agent";
import { Merchants } from "./views/Merchants";
import { Overview } from "./views/Overview";

const NAV = [
  { path: "", label: "Resumen", icon: "grid", title: "Resumen operativo", sub: "Qué está pasando hoy en la red de comercios" },
  { path: "comercios", label: "Comercios", icon: "store", title: "Comercios", sub: "Límites, riesgo y transacciones de cada comercio" },
  { path: "asistente", label: "Asistente", icon: "spark", title: "Asistente", sub: "Consultas en lenguaje natural con el agente ReAct" },
] as const;

type Health = { state: "checking" } | { state: "offline" } | { state: "online"; status: Status };

function useHealth(): Health {
  const [health, setHealth] = useState<Health>({ state: "checking" });
  useEffect(() => {
    let alive = true;
    const check = () =>
      api.status()
        .then((status) => alive && setHealth({ state: "online", status }))
        .catch(() => alive && setHealth({ state: "offline" }));
    check();
    const id = window.setInterval(check, 15000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    window.addEventListener("legacypay:recheck", onFocus);
    return () => {
      window.removeEventListener("legacypay:recheck", onFocus);
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return health;
}

function StatusPill({ health }: { health: Health }) {
  if (health.state === "checking") return <span className="status-pill"><span className="dot is-idle" />Conectando…</span>;
  if (health.state === "offline") return <span className="status-pill is-down"><span className="dot" />Backend sin conexión</span>;
  const { llm, version } = health.status;
  return (
    <span className={`status-pill ${llm.reachable ? "" : "is-warn"}`} title={`Backend v${version} · LLM en ${llm.base_url}`}>
      <span className="dot" />
      {llm.reachable ? <>En línea <span className="hide-sm">· LLM {llm.mode === "mock" ? "simulado" : "real"}</span></> : "LLM sin conexión"}
    </span>
  );
}

export function App() {
  const [section = "", param] = useRoute();
  const health = useHealth();
  const current = NAV.find((n) => n.path === section) ?? NAV[0];

  useEffect(() => {
    document.title = `${current.title} · LegacyPay`;
  }, [current]);

  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/">
            <span className="brand-mark" aria-hidden="true">L</span>
            <span className="brand-name">LegacyPay <span className="brand-sub">Operaciones</span></span>
          </a>
          <nav className="nav" aria-label="Principal">
            {NAV.map((n) => (
              <a key={n.path} href={`#/${n.path}`} className="nav-link" aria-current={current.path === n.path ? "page" : undefined}>
                <Icon name={n.icon} size={18} /> <span>{n.label}</span>
              </a>
            ))}
          </nav>
          <StatusPill health={health} />
        </div>
      </header>

      {health.state === "offline" && (
        <div className="banner" role="status">
          <Icon name="alert" size={18} />
          <span>No hay conexión con el backend. Levantalo con <code>uv run --frozen uvicorn app.main:app --reload</code>; reintentamos cada 15 s.</span>
        </div>
      )}

      <main id="main" tabIndex={-1} className="main">
        <div className="page-head">
          <h1>{current.title}</h1>
          <p className="muted">{current.sub}</p>
        </div>
        {current.path === "" && <Overview />}
        {current.path === "comercios" && <Merchants selectedId={param} />}
        {current.path === "asistente" && <Agent prefill={param} />}
      </main>
    </>
  );
}
