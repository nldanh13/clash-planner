import { useState, useRef, useEffect, useCallback } from "react";
import type { Player } from "../types";
import { fetchPlayer } from "../services/warReportApi";
import { readStoredRecord, writeStoredRecord } from "../storage/playerStorage";

export function usePlayer() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cacheWarning, setCacheWarning] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<{ tag: string; name: string }[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("playerHistory") || "[]");
      if (Array.isArray(parsed)) return parsed;
    } catch {
      localStorage.removeItem("playerHistory");
    }
    return [];
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const [villageData, setVillageData] = useState<Record<string, Record<string, number>>>(() =>
    readStoredRecord<Record<string, number>>("villageDataV2")
  );

  const saveVillageData = useCallback((tag: string, levels: Record<string, number>) => {
    setVillageData((prev) => {
      const updated = { ...prev, [tag]: levels };
      writeStoredRecord("villageDataV2", updated);
      return updated;
    });
  }, []);

  const load = useCallback(
    async (rawTag = input) => {
      if (rawTag.length < 4) {
        setError("Player Tag chưa hợp lệ.");
        return;
      }
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError("");
      setCacheWarning("");
      try {
        const data = await fetchPlayer(rawTag, abortControllerRef.current.signal);
        setPlayer(data);
        const cachedStr = data.clan ? data.clan.name : "";
        if (cachedStr && cachedStr.includes("(cached)")) {
          setCacheWarning("Dữ liệu được tải từ bộ đệm (cache). Có thể không phải thông tin mới nhất.");
        }
        setHistory((prev) => {
          const filtered = prev.filter((h) => h.tag !== data.tag);
          const next = [{ tag: data.tag, name: data.name }, ...filtered].slice(0, 5);
          localStorage.setItem("playerHistory", JSON.stringify(next));
          return next;
        });
      } catch (e: any) {
        if (e.name !== "AbortError") setError(e.message || "Lỗi không xác định.");
      } finally {
        setLoading(false);
      }
    },
    [input]
  );

  return {
    input,
    setInput,
    loading,
    error,
    cacheWarning,
    player,
    setPlayer,
    history,
    load,
    villageData,
    saveVillageData,
  };
}
