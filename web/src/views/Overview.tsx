import { api, type Merchant, type Transaction } from "../api";
import { ErrorState, Icon, SectionHeader, Skeleton, StatusBadge } from "../components/ui";
import { category, dateTime, money, moneyCompact } from "../format";
import { navigate, useAsync } from "../hooks";

export function Overview() {
  const [data, reload] = useAsync(() => Promise.all([api.merchants(), api.transactions()]));

  if (data.state === "error") return <ErrorState error={data.error} onRetry={reload} />;
  if (data.state === "loading") return <OverviewSkeleton />;

  const [merchants, txs] = data.data;
  const byId = new Map(merchants.map((m) => [m.merchant_id, m]));
  const flagged = txs.filter((t) => t.status === "flagged");
  const active = merchants.filter((m) => m.status === "active");
  const totalVolume = merchants.reduce((s, m) => s + m.monthly_volume_usd, 0);
  const flaggedAmount = flagged.reduce((s, t) => s + t.amount_usd, 0);
  const highRisk = merchants.filter((m) => m.risk_level === "high");

  return (
    <div className="stack-48">
      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">Indicadores</h2>
        <div className="kpis">
          <Kpi label="Volumen mensual" value={moneyCompact(totalVolume)} note={`${merchants.length} comercios`} />
          <Kpi label="Comercios activos" value={`${active.length}`} suffix={`de ${merchants.length}`}
            note={`${merchants.length - active.length} suspendido${merchants.length - active.length === 1 ? "" : "s"}`} />
          <Kpi label="Transacciones marcadas" value={`${flagged.length}`} tone={flagged.length ? "alert" : undefined}
            note={`${money(flaggedAmount)} en revisión`} />
          <Kpi label="Riesgo alto" value={`${highRisk.length}`} suffix="comercios"
            note={highRisk.map((m) => m.name.split(" ")[0]).join(", ") || "Ninguno"} />
        </div>
      </section>

      <div className="overview-grid">
        <section aria-labelledby="attention">
          <SectionHeader eyebrow="Requieren atención" title={flagged.length ? `${flagged.length} transacciones marcadas` : "Sin alertas"} />
          {flagged.length === 0 ? (
            <p className="muted">No hay transacciones marcadas. Todo en orden.</p>
          ) : (
            <ul className="alert-list">
              {flagged.map((t) => <FlaggedItem key={t.transaction_id} tx={t} merchant={byId.get(t.merchant_id)} />)}
            </ul>
          )}
        </section>

        <section aria-labelledby="volume">
          <VolumeChart merchants={merchants} total={totalVolume} />
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, suffix, note, tone }: { label: string; value: string; suffix?: string; note: string; tone?: "alert" }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ""}`}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">
        <span className="num">{value}</span>
        {suffix && <span className="kpi-suffix"> {suffix}</span>}
      </p>
      <p className="kpi-note">{note}</p>
    </div>
  );
}

function FlaggedItem({ tx, merchant }: { tx: Transaction; merchant?: Merchant }) {
  return (
    <li>
      <button className="alert-item" onClick={() => navigate(`/comercios/${tx.merchant_id}`)}>
        <span className="alert-icon"><Icon name="alert" /></span>
        <span className="alert-main">
          <span className="alert-title">
            {merchant?.name ?? tx.merchant_id}
            {merchant && <StatusBadge status={merchant.status} />}
          </span>
          <span className="alert-reason">{tx.flag_reason}</span>
          <span className="alert-meta mono">{tx.transaction_id} · {dateTime(tx.timestamp)}{tx.incident_ref && ` · ${tx.incident_ref}`}</span>
        </span>
        <span className="alert-amount num">{money(tx.amount_usd)}</span>
        <span className="alert-chevron"><Icon name="chevron" size={16} /></span>
      </button>
    </li>
  );
}

function VolumeChart({ merchants, total }: { merchants: Merchant[]; total: number }) {
  const sorted = [...merchants].sort((a, b) => b.monthly_volume_usd - a.monthly_volume_usd);
  const top = sorted[0];
  const max = top?.monthly_volume_usd || 1;
  const share = total ? Math.round((top.monthly_volume_usd / total) * 100) : 0;
  return (
    <>
      <SectionHeader eyebrow="Volumen mensual por comercio" title={top ? `${top.name.replace(/ Ltda\.?$/, "")} concentra el ${share}%` : "Sin datos"} />
      <ol className="bars">
        {sorted.map((m, i) => (
          <li key={m.merchant_id}>
            <button className="bar-row" onClick={() => navigate(`/comercios/${m.merchant_id}`)}>
              <span className="bar-label">
                <span>{m.name}</span>
                <span className="muted small">{category(m.category)}</span>
              </span>
              <span className="bar-track">
                <span className={`bar-fill ${i === 0 ? "is-top" : ""}`} style={{ width: `${Math.max((m.monthly_volume_usd / max) * 100, 0.5)}%` }} />
              </span>
              <span className="bar-value num">{m.monthly_volume_usd ? moneyCompact(m.monthly_volume_usd) : "—"}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="source">Fuente: data/merchants_sample.json</p>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="stack-48" aria-busy="true" aria-label="Cargando">
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi" key={i}><Skeleton h={14} w="50%" /><Skeleton h={36} w="60%" /><Skeleton h={14} w="70%" /></div>
        ))}
      </div>
      <div className="overview-grid">
        <div className="stack-16">{[0, 1].map((i) => <Skeleton key={i} h={88} />)}</div>
        <div className="stack-16">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={28} />)}</div>
      </div>
    </div>
  );
}
