import { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi.js";

// Ang gidaghanon sa pending account requests (para sa badge). Admin ra.
export default function usePendingCount(enabled) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      adminApi
        .stats()
        .then((s) => alive && setPending(s.pending))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener("admin:changed", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("admin:changed", load);
    };
  }, [enabled]);

  return pending;
}