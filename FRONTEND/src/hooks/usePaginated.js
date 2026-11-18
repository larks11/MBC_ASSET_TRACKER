import { useCallback, useEffect, useRef, useState } from "react";
import useDebounce from "./useDebounce.js";

const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));

/**
 * Server-side table state: page, limit, sort, search ug filters.
 * fetcher(params, signal) → { data, meta }
 */
export default function usePaginated(fetcher, { initialSort = "", initialLimit = 10, initialFilters = {} } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [sort, setSort] = useState(initialSort);
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({
    rows: [],
    meta: { total: 0, page: 1, pages: 1, limit: initialLimit },
    loading: true,
    error: null,
  });

  const debouncedSearch = useDebounce(search, 300);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = { page, limit, sort: sort || undefined, search: debouncedSearch || undefined, ...clean(filters) };

    fetcherRef
      .current(params, ctrl.signal)
      .then((res) => setState({ rows: res.data, meta: res.meta, loading: false, error: null }))
      .catch((e) => {
        if (e.code === "ERR_CANCELED" || e.name === "CanceledError") return;
        setState((s) => ({ ...s, loading: false, error: e.message }));
      });

    return () => ctrl.abort();
  }, [page, limit, sort, debouncedSearch, filters, tick]);

  const setSearch = useCallback((v) => { setSearchState(v); setPage(1); }, []);
  const setLimit = useCallback((v) => { setLimitState(Number(v)); setPage(1); }, []);
  const setFilter = useCallback((key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); }, []);
  const toggleSort = useCallback((field) => setSort((s) => (s === field ? `-${field}` : field)), []);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, page, setPage, limit, setLimit, sort, toggleSort, search, setSearch, filters, setFilter, refetch };
}
