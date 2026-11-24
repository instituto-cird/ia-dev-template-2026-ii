import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Merchant } from "../api";
import { EmptyState, ErrorState, Icon, RiskBadge, Skeleton, StatusBadge } from "../components/ui";
import { category, date, dateTime, money, STATUS } from "../format";
import { navigate, useAsync } from "../hooks";

type Filter = "all" | "active" | "suspended" | "high";
const FILTERS: { id: Filter; label: string; test: (m: Merchant) => boolean }[] = [
  { id: "all", label: "Todos", test: () => true },
  { id: "active", label: "Activos", test: (m) => m.status === "active" },
  { id: "suspended", label: "Suspendidos", test: (m) => m.status === "suspended" },
  { id: "high", label: "Riesgo alto", test: (m) => m.risk_level === "high" },
];

const closePanel = () => navigate("/comercios");

export function Merchants({ selectedId }: { selectedId?: string }) {
  const [data, reload] = useAsync(api.merchants);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (data.state !== "ready") return [];
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return data.data.filter(
      (m) => test(m) && (!q || m.name.toLowerCase().includes(q) || m.merchant_id.toLowerCase().includes(q) || category(m.category).toLowerCase().includes(q)),
    );
  }, [data, query, filter]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, data.state === "ready" ? data.data.filter(f.test).length : 0])),
    [data],
  );

  if (data.state === "error") return <ErrorState error={data.error} onRetry={reload} />;

  return (
    <div className="stack-24">
      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Buscar comercio</span>
          <input type="search" placeholder="Buscar por nombre, ID o categoría" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="chips" role="radiogroup" aria-label="Filtrar">
          {FILTERS.map((f) => (
            <button key={f.id} role="radio" aria-checked={filter === f.id} className="chip" onClick={() => setFilter(f.id)}>
              {f.label} <span className="chip-count num">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Comercio</th>
              <th scope="col" className="hide-sm">Categoría</th>
              <th scope="col">Estado</th>
              <th scope="col" className="hide-sm">Riesgo</th>
              <th scope="col" className="right">Límite diario</th>
              <th scope="col" className="right hide-md">Volumen mensual</th>
            </tr>
          </thead>
          <tbody>
            {data.state === "loading"
              ? [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>{[0, 1, 2, 3, 4, 5].map((j) => <td key={j}><Skeleton h={16} /></td>)}</tr>
                ))
              : rows.map((m) => (
                  <tr key={m.merchant_id} className={selectedId === m.merchant_id ? "is-selected" : ""}
                    onClick={() => navigate(`/comercios/${m.merchant_id}`)}>
                    <td>
                      <a className="cell-title" href={`#/comercios/${m.merchant_id}`} onClick={(e) => e.stopPropagation()}>{m.name}</a>
                      <span className="cell-sub mono">{m.merchant_id}</span>
                    </td>
                    <td className="hide-sm">{category(m.category)}</td>
                    <td><StatusBadge status={m.status} /></td>
                    <td className="hide-sm"><RiskBadge level={m.risk_level} /></td>
                    <td className="right num">{money(m.daily_limit_usd)}</td>
                    <td className="right num hide-md">{money(m.monthly_volume_usd)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {data.state === "ready" && rows.length === 0 && (
          <EmptyState title="Ningún comercio coincide">
            <button className="btn btn-link" onClick={() => { setQuery(""); setFilter("all"); }}>Limpiar filtros</button>
          </EmptyState>
        )}
      </div>

      {selectedId && <MerchantPanel id={selectedId} onClose={closePanel} />}
    </div>
  );
}

function MerchantPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, reload] = useAsync(() => api.merchant(id), [id]);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ask = (goal: string) => navigate(`/asistente/${encodeURIComponent(goal)}`);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
        <header className="panel-header">
          <div>
            <p className="eyebrow mono">{id}</p>
            <h2 id="panel-title">{data.state === "ready" ? data.data.name : data.state === "loading" ? <Skeleton h={28} w={240} /> : "Comercio"}</h2>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        </header>

        <div className="panel-body">
          {data.state === "error" && (data.error.status === 404
            ? <EmptyState title="Este comercio no existe">Verificá el ID o volvé a la lista.</EmptyState>
            : <ErrorState error={data.error} onRetry={reload} />)}
          {data.state === "loading" && <div className="stack-16">{[0, 1, 2].map((i) => <Skeleton key={i} h={56} />)}</div>}
          {data.state === "ready" && (() => {
            const m = data.data;
            const usage = m.daily_limit_usd ? m.avg_transaction_7d_usd / m.daily_limit_usd : 0;
            return (
              <div className="stack-32">
                <div className="row-8 wrap">
                  <StatusBadge status={m.status} />
                  <RiskBadge level={m.risk_level} />
                  <span className={`badge ${m.pci_compliant ? "status-active" : "status-suspended"}`}>
                    <Icon name={m.pci_compliant ? "check" : "alert"} size={14} /> PCI {m.pci_compliant ? "conforme" : "no conforme"}
                  </span>
                </div>

                {m.suspension_reason && (
                  <div className="callout callout-alert">
                    <Icon name="alert" />
                    <div><strong>Motivo de suspensión</strong><p>{m.suspension_reason}</p></div>
                  </div>
                )}

                <dl className="facts">
                  <div><dt>Límite diario</dt><dd className="num">{money(m.daily_limit_usd)}</dd></div>
                  <div><dt>Volumen mensual</dt><dd className="num">{money(m.monthly_volume_usd)}</dd></div>
                  <div><dt>Ticket promedio 7 días</dt><dd className="num">{money(m.avg_transaction_7d_usd)}</dd></div>
                  <div><dt>Categoría</dt><dd>{category(m.category)}</dd></div>
                  <div className="span-2"><dt>Cliente desde</dt><dd>{date(m.onboarded_at)}</dd></div>
                </dl>

                {m.daily_limit_usd > 0 && (
                  <div>
                    <div className="meter-label">
                      <span>Ticket promedio vs. límite diario</span>
                      <span className="num">{(usage * 100).toFixed(1)}%</span>
                    </div>
                    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage * 100)}>
                      <span style={{ width: `${Math.min(usage * 100, 100)}%` }} className={usage > 0.2 ? "is-high" : ""} />
                    </div>
                  </div>
                )}

                <section>
                  <h3 className="h3">Transacciones <span className="muted num">{m.transactions.length}</span></h3>
                  {m.transactions.length === 0 ? (
                    <p className="muted">Sin transacciones en la muestra.</p>
                  ) : (
                    <ul className="tx-list">
                      {m.transactions.map((t) => (
                        <li key={t.transaction_id} className={t.status === "flagged" ? "is-flagged" : ""}>
                          <div className="tx-main">
                            <span className="mono small">{t.transaction_id}</span>
                            <span className="muted small">{dateTime(t.timestamp)}</span>
                            {t.flag_reason && <span className="tx-reason">{t.flag_reason}</span>}
                          </div>
                          <div className="tx-side">
                            <span className="num">{money(t.amount_usd)}</span>
                            <span className={`badge status-${t.status}`}><span className="dot" aria-hidden="true" />{STATUS[t.status] ?? t.status}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            );
          })()}
        </div>

        {data.state === "ready" && (
          <footer className="panel-footer">
            <button className="btn btn-primary" onClick={() => ask(`¿Cuál es el límite diario de ${id}?`)}>
              <Icon name="spark" size={16} /> Consultar al asistente
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
