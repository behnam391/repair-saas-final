"use client";
import { useEffect, useRef, useState } from "react";

/** Debounces filters and ignores stale responses without erasing saved form state. */
export function usePagedList<T, S>(endpoint: string, key: string, filters: string, initialSummary: S) {
  const [items, setItems] = useState<T[]>([]);
  const [summary, setSummary] = useState(initialSummary);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const lastFilters = useRef(filters);
  useEffect(() => {
    if (lastFilters.current !== filters) {
      lastFilters.current = filters;
      if (page !== 1) { setPage(1); return; }
    }
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`${endpoint}?page=${page}&pageSize=25&${filters}`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw Error();
        const data = await res.json();
        if (!current) return;
        const pages = Math.max(1, Math.ceil(data.total / 25));
        if (page > pages) { setPage(pages); return; }
        setItems(data[key] ?? []); setTotal(data.total ?? 0);
        setLoaded(true);
        if (data.summary) setSummary(data.summary);
        setError("");
      } catch { if (current) setError("دریافت فهرست ممکن نشد. لطفاً دوباره تلاش کنید."); }
      finally { window.clearTimeout(timeout); if (current) setLoading(false); }
    }, 250);
    return () => { current = false; window.clearTimeout(timer); controller.abort(); };
  }, [endpoint, key, filters, page, revision]);
  return { items, summary, page, total, loading, loaded, error, setPage, reload: () => setRevision(value => value + 1) };
}
