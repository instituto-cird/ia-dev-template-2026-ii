import type { RiskLevel } from "./api";

const usd0 = new Intl.NumberFormat("es-PY", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("es-PY", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const money = (n: number) => (Number.isInteger(n) || n >= 1000 ? usd0 : usd2).format(n);
export const moneyCompact = (n: number) => `USD ${compact.format(n)}`;

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const date = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" });

export const CATEGORY: Record<string, string> = {
  pharmacy: "Farmacia",
  food_beverage: "Gastronomía",
  electronics: "Electrónica",
  wholesale: "Mayorista",
  clothing: "Indumentaria",
};

export const STATUS: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  approved: "Aprobada",
  flagged: "Marcada",
};

export const RISK: Record<RiskLevel, string> = { low: "Bajo", medium: "Medio", high: "Alto" };

export const category = (c: string) => CATEGORY[c] ?? c;
