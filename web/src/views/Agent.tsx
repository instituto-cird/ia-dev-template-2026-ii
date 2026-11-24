import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ApiError, type AgentRun, type AgentStep } from "../api";
import { Icon, Skeleton } from "../components/ui";
import { navigate, useAsync } from "../hooks";

type Turn =
  | { id: number; goal: string; state: "pending" }
  | { id: number; goal: string; state: "done"; run: AgentRun }
  | { id: number; goal: string; state: "error"; error: ApiError };

const SUGGESTIONS = [
  "¿Cuál es el límite diario de MCHT-00042?",
  "Estado del comercio MCHT-00099",
  "Calcula 50000 * 0.15",
  "¿Cuánto es (48000 + 21000) / 2?",
];

const STORAGE_KEY = "legacypay.agent.turns";

function loadTurns(): Turn[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const turns: Turn[] = raw ? JSON.parse(raw) : [];
    return turns.filter((t) => t.state === "done");
  } catch {
    return [];
  }
}

export function Agent({ prefill }: { prefill?: string }) {
  const [turns, setTurns] = useState<Turn[]>(loadTurns);
  const [goal, setGoal] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.state === "pending");

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.filter((t) => t.state === "done")));
    } catch {
      /* almacenamiento no disponible */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const run = async (text: string) => {
    const g = text.trim();
    if (!g || busy) return;
    const id = Date.now();
    setGoal("");
    setTurns((ts) => [...ts, { id, goal: g, state: "pending" }]);
    try {
      const result = await api.runAgent(g);
      setTurns((ts) => ts.map((t) => (t.id === id ? { id, goal: g, state: "done", run: result } : t)));
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError(String(e), 0);
      // Pide al indicador de estado que se actualice ya, sin esperar el sondeo
      window.dispatchEvent(new Event("legacypay:recheck"));
      setTurns((ts) => ts.map((t) => (t.id === id ? { id, goal: g, state: "error", error } : t)));
    }
    inputRef.current?.focus();
  };

  // Consulta que llega desde otra vista (p. ej. el panel de un comercio)
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prefill && handled.current !== prefill) {
      handled.current = prefill;
      navigate("/asistente");
      run(prefill);
    } else if (!prefill) {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(goal);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      run(goal);
    }
  };

  return (
    <div className="agent-layout">
      <div className="agent-main">
        <div className="conversation" aria-live="polite">
          {turns.length === 0 ? (
            <div className="agent-intro">
              <p className="eyebrow">Agente ReAct</p>
              <h2>¿Qué querés consultar?</h2>
              <p className="muted">
                El asistente razona, elige una herramienta, la ejecuta y te responde. Podés ver cada paso del razonamiento.
              </p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion" onClick={() => run(s)}>
                    <span>{s}</span><Icon name="arrow" size={16} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t) => <TurnView key={t.id} turn={t} onRetry={() => run(t.goal)} />)
          )}
          <div ref={endRef} className="conversation-end" />
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <label htmlFor="goal" className="sr-only">Consulta para el agente</label>
          <textarea id="goal" ref={inputRef} rows={1} maxLength={500} value={goal} onChange={(e) => setGoal(e.target.value)}
            onKeyDown={onKeyDown} placeholder="Ej.: límite de MCHT-00042 o 1500 * 1.08" disabled={busy} />
          <div className="composer-actions">
            {turns.length > 0 && !busy && (
              <button type="button" className="btn btn-ghost" onClick={() => setTurns([])}>
                <Icon name="trash" size={16} /> <span className="hide-sm">Limpiar</span>
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={!goal.trim() || busy}>
              {busy ? "Pensando…" : <>Enviar <Icon name="send" size={16} /></>}
            </button>
          </div>
        </form>
        <p className="composer-hint hide-sm"><kbd>Enter</kbd> envía · <kbd>Shift</kbd> + <kbd>Enter</kbd> nueva línea</p>
      </div>

      <ToolsAside />
    </div>
  );
}

function TurnView({ turn, onRetry }: { turn: Turn; onRetry: () => void }) {
  return (
    <article className="turn">
      <p className="turn-goal">{turn.goal}</p>
      {turn.state === "pending" && (
        <div className="answer is-pending" aria-busy="true">
          <p className="answer-label"><span className="pulse" aria-hidden="true" /> Razonando…</p>
          <Skeleton h={16} w="80%" /><Skeleton h={16} w="55%" />
        </div>
      )}
      {turn.state === "error" && (
        <div className="answer is-error" role="alert">
          <p className="answer-label"><Icon name="alert" size={16} /> {turn.error.status === 503 ? "El LLM no responde" : turn.error.status === 0 ? "Sin conexión con el backend" : "Error"}</p>
          <p>
            {turn.error.status === 503 ? (
              <>Levantá el Mock LLM con <code>uv run --frozen uvicorn app.mock_llm:mock_app --port 8001</code></>
            ) : turn.error.status === 0 ? (
              <>Levantá el backend con <code>uv run --frozen uvicorn app.main:app --reload</code></>
            ) : turn.error.message}
          </p>
          <button className="btn btn-secondary" onClick={onRetry}><Icon name="refresh" size={16} /> Reintentar</button>
        </div>
      )}
      {turn.state === "done" && <AnswerView run={turn.run} />}
    </article>
  );
}

function AnswerView({ run }: { run: AgentRun }) {
  const tools = run.steps.filter((s) => s.action !== "FINISH").map((s) => s.action);
  return (
    <div className={`answer ${run.approved ? "" : "is-approval"}`}>
      {!run.approved && (
        <p className="answer-label"><Icon name="lock" size={16} /> Requiere aprobación humana</p>
      )}
      <p className="answer-text">{run.answer}</p>
      <details className="trace">
        <summary>
          <span>Ver razonamiento</span>
          <span className="trace-meta mono">
            {run.total_steps} paso{run.total_steps === 1 ? "" : "s"}
            {tools.length > 0 && ` · ${[...new Set(tools)].join(", ")}`} · {run.duration_ms} ms
          </span>
        </summary>
        <ol className="steps">
          {run.steps.map((s) => <StepView key={s.step} step={s} />)}
        </ol>
      </details>
    </div>
  );
}

function StepView({ step }: { step: AgentStep }) {
  const finish = step.action === "FINISH";
  const isError = /^(ERROR|NOT_FOUND)/.test(step.observation);
  return (
    <li className="step">
      <span className="step-num mono" aria-hidden="true">{String(step.step).padStart(2, "0")}</span>
      <div className="step-body">
        <p className="step-row"><span className="step-key">Pensamiento</span>{step.thought}</p>
        <p className="step-row">
          <span className="step-key">Acción</span>
          <code className={`action-chip ${finish ? "is-finish" : ""}`}>{step.action}</code>
          {!finish && <code className="mono small muted">{JSON.stringify(step.action_input)}</code>}
        </p>
        {!finish && (
          <p className="step-row">
            <span className="step-key">Observación</span>
            <code className={`observation ${isError ? "is-error" : ""}`}>{step.observation}</code>
          </p>
        )}
      </div>
    </li>
  );
}

function ToolsAside() {
  const [tools] = useAsync(api.tools);
  return (
    <aside className="tools" aria-labelledby="tools-title">
      <h2 id="tools-title" className="eyebrow">Herramientas del agente</h2>
      {tools.state === "loading" && <div className="stack-8">{[0, 1, 2].map((i) => <Skeleton key={i} h={44} />)}</div>}
      {tools.state === "error" && <p className="muted small">No disponibles.</p>}
      {tools.state === "ready" && (
        <>
          <ul className="tool-list">
            {tools.data.filter((t) => !t.requires_approval).map((t) => (
              <li key={t.name}><code>{t.name}</code><span>{t.description}</span></li>
            ))}
          </ul>
          <h3 className="eyebrow eyebrow-sub"><Icon name="lock" size={14} /> Requieren aprobación</h3>
          <ul className="tool-list is-locked">
            {tools.data.filter((t) => t.requires_approval).map((t) => <li key={t.name}><code>{t.name}</code></li>)}
          </ul>
        </>
      )}
    </aside>
  );
}
