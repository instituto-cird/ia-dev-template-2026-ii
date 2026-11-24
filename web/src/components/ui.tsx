import type { ReactNode } from "react";
import type { ApiError, RiskLevel } from "../api";
import { RISK, STATUS } from "../format";

// ─── Íconos (trazo de 1.75px, 20×20) ────────────────────────────────────────

const paths = {
  grid: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z",
  store: "M3 8l1.5-5h11L17 8M3 8v9h14V8M3 8c0 1.4 1.1 2.5 2.5 2.5S8 9.4 8 8c0 1.4 1.1 2.5 2.5 2.5S13 9.4 13 8c0 1.4 1.1 2.5 2.5 2.5S17 9.4 17 8M8 17v-4h4v4",
  spark: "M10 2v4M10 14v4M2 10h4M14 10h4M4.3 4.3l2.8 2.8M12.9 12.9l2.8 2.8M4.3 15.7l2.8-2.8M12.9 7.1l2.8-2.8",
  search: "M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zM17 17l-3.7-3.7",
  close: "M5 5l10 10M15 5L5 15",
  arrow: "M4 10h12M11 5l5 5-5 5",
  send: "M3 10l14-7-5 14-2.5-5.5L3 10z",
  alert: "M10 3l8 14H2L10 3zM10 8v4M10 14.5v.5",
  check: "M4 10.5l4 4 8-9",
  lock: "M5 9h10v8H5zM7 9V6a3 3 0 0 1 6 0v3",
  refresh: "M16 4v4h-4M4 16v-4h4M15.2 8A6 6 0 0 0 4.6 6.5M4.8 12a6 6 0 0 0 10.6 1.5",
  chevron: "M7 5l5 5-5 5",
  trash: "M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11",
} as const;

export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

// ─── Badges: siempre texto + forma, nunca solo color ────────────────────────

export function RiskBadge({ level }: { level: RiskLevel }) {
  const bars = { low: 1, medium: 2, high: 3 }[level];
  return (
    <span className={`badge risk-${level}`}>
      <span className="risk-bars" aria-hidden="true">
        {[1, 2, 3].map((i) => <i key={i} className={i <= bars ? "on" : ""} />)}
      </span>
      Riesgo {RISK[level].toLowerCase()}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}><span className="dot" aria-hidden="true" />{STATUS[status] ?? status}</span>;
}

// ─── Estados: cargando, vacío, error ────────────────────────────────────────

export function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: number | string }) {
  return <span className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const offline = error.status === 0;
  return (
    <div className="error-state" role="alert">
      <Icon name="alert" size={22} />
      <div>
        <p className="error-title">{offline ? "El backend no responde" : "No se pudo cargar"}</p>
        <p className="error-body">
          {offline ? (
            <>Levantalo con <code>uv run --frozen uvicorn app.main:app --reload</code> y reintentá.</>
          ) : (
            error.message
          )}
        </p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Reintentar
        </button>
      )}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
