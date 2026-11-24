// Cliente tipado del backend FastAPI. Las rutas /api se reenvían vía proxy de Vite.

export type RiskLevel = "low" | "medium" | "high";

export interface Merchant {
  merchant_id: string;
  name: string;
  category: string;
  status: string;
  daily_limit_usd: number;
  monthly_volume_usd: number;
  risk_level: RiskLevel;
  pci_compliant: boolean;
  onboarded_at: string;
  avg_transaction_7d_usd: number;
  suspension_reason: string | null;
}

export interface Transaction {
  transaction_id: string;
  merchant_id: string;
  amount_usd: number;
  timestamp: string;
  status: string;
  flag_reason: string | null;
  incident_ref: string | null;
}

export interface MerchantDetail extends Merchant {
  transactions: Transaction[];
}

export interface Status {
  backend: "ok";
  version: string;
  llm: { mode: "mock" | "real"; base_url: string; reachable: boolean };
}

export interface ToolInfo {
  name: string;
  description: string;
  requires_approval: boolean;
}

export interface AgentStep {
  step: number;
  thought: string;
  action: string;
  action_input: Record<string, unknown>;
  observation: string;
}

export interface AgentRun {
  goal: string;
  answer: string;
  steps: AgentStep[];
  approved: boolean;
  total_steps: number;
  duration_ms: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("No hay conexión con el backend", 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail[0]?.msg ?? detail;
    } catch {
      /* respuesta sin JSON */
    }
    // El proxy de Vite responde 500/502 cuando el backend está caído
    if (res.status === 502 || (res.status === 500 && !detail)) {
      throw new ApiError("No hay conexión con el backend", 0);
    }
    throw new ApiError(detail || `Error ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: () => request<Status>("/api/status"),
  merchants: () => request<Merchant[]>("/api/merchants"),
  merchant: (id: string) => request<MerchantDetail>(`/api/merchants/${encodeURIComponent(id)}`),
  transactions: (status?: string) =>
    request<Transaction[]>(`/api/transactions${status ? `?status=${status}` : ""}`),
  tools: () => request<ToolInfo[]>("/api/agent/tools"),
  runAgent: (goal: string) =>
    request<AgentRun>("/api/agent/run", { method: "POST", body: JSON.stringify({ goal }) }),
};
