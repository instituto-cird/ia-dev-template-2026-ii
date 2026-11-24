import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError } from "./api";

// ─── Carga de datos con estados explícitos ──────────────────────────────────

export type Async<T> =
  | { state: "loading" }
  | { state: "error"; error: ApiError }
  | { state: "ready"; data: T };

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [value, setValue] = useState<Async<T>>({ state: "loading" });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setValue((v) => (v.state === "ready" ? v : { state: "loading" }));
    fnRef
      .current()
      .then((data) => alive && setValue({ state: "ready", data }))
      .catch((e: unknown) =>
        alive && setValue({ state: "error", error: e instanceof ApiError ? e : new ApiError(String(e), 0) }),
      );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return [value, reload] as const;
}

// ─── Router por hash: #/comercios/MCHT-00042 ────────────────────────────────

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
}

export const navigate = (path: string) => {
  window.location.hash = path.startsWith("/") ? path : `/${path}`;
};
