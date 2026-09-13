import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../api/client";

/** Fetch JSON with abort-on-unmount and manual refetch. */
export function useApi(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled) && Boolean(path));
  const abortRef = useRef(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const run = useCallback(async () => {
    if (!pathRef.current || !enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const controller2 = controller;
      const data = await Promise.race([
        api.get(pathRef.current),
        new Promise((_, reject) =>
          controller2.signal.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          ),
        ),
      ]);
      setData(data);
    } catch (err) {
      if (err.name !== "AbortError") setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [path, enabled, run]);

  return { data, error, loading, refetch: run };
}
