import { useState, useRef, useEffect, useCallback } from "react";
import type { Player } from "../types";
import { fetchPlayer } from "../services/warReportApi";
import { readStoredRecord, writeStoredRecord } from "../storage/playerStorage";
import { normalizeTag } from "../utils/formatters";
import { useTranslation } from "../i18n";

export function usePlayer() {
  const { t } = useTranslation();
  const [input, setInput] = useState(() => localStorage.getItem("coc-last-tag") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cacheWarning, setCacheWarning] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

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

  const clearPlayerCache = useCallback(() => {
    if (player?.tag) {
      localStorage.removeItem(`coc-cache-${player.tag}`);
      localStorage.removeItem(`coc-cache-time-${player.tag}`);
      setCacheWarning(t("player.cacheCleared"));
    }
  }, [player]);

  const load = useCallback(async (rawTag = input) => {
    const tag = normalizeTag(rawTag);
    if (tag.length < 4) {
      setError(t("player.invalidTag"));
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort("user_aborted");
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError("");
    setCacheWarning("");

    timeoutIdRef.current = setTimeout(() => {
      controller.abort("timeout");
    }, 15000);

    try {
      const data = await fetchPlayer(tag, controller.signal);
      
      if (abortControllerRef.current !== controller) return;

      setPlayer(data);
      setInput(data.tag);
      const now = new Date();
      setSyncedAt(now);

      localStorage.setItem("coc-last-tag", data.tag);
      localStorage.setItem(`coc-cache-${data.tag}`, JSON.stringify(data));
      localStorage.setItem(`coc-cache-time-${data.tag}`, now.getTime().toString());
    } catch (e: unknown) {
      if (abortControllerRef.current !== controller) return;
      
      let isTimeout = false;
      let isUserAborted = false;
      
      if (e instanceof Error && e.name === "AbortError") {
        const reason = controller.signal.reason;
        if (reason === "timeout") isTimeout = true;
        if (reason === "user_aborted") isUserAborted = true;
      }
      
      if (isUserAborted) return; // ignore completely if user aborted

      const message = isTimeout
        ? t("player.timeoutError")
        : (e instanceof Error ? e.message : t("player.genericConnectionError"));

      const cached = localStorage.getItem(`coc-cache-${tag}`);
      const cachedTimeRaw = localStorage.getItem(`coc-cache-time-${tag}`);

      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Player;
          if (!parsed || typeof parsed !== "object" || !Number.isFinite(parsed.townHallLevel)) {
            throw new Error(t("player.corruptedCache"));
          }
          
          setPlayer({
            ...parsed,
            heroes: Array.isArray(parsed.heroes) ? parsed.heroes : [],
            troops: Array.isArray(parsed.troops) ? parsed.troops : [],
            spells: Array.isArray(parsed.spells) ? parsed.spells : [],
            heroEquipment: Array.isArray(parsed.heroEquipment) ? parsed.heroEquipment : []
          });
          
          setError(message);
          let timeMsg = t("player.unknownTime");
          if (cachedTimeRaw) {
            const cachedTime = new Date(parseInt(cachedTimeRaw, 10));
            timeMsg = cachedTime.toLocaleString("vi-VN");
            const ageHours = (Date.now() - cachedTime.getTime()) / (1000 * 60 * 60);
            if (ageHours > 24) {
              timeMsg += t("player.staleSuffix", { hours: Math.floor(ageHours) });
            }
            setSyncedAt(cachedTime);
          } else {
            setSyncedAt(null);
          }
          setCacheWarning(t("player.usingCachedDataFrom", { time: timeMsg }));
        } catch {
          localStorage.removeItem(`coc-cache-${tag}`);
          localStorage.removeItem(`coc-cache-time-${tag}`);
          setError(message + t("player.cacheAutoDeletedSuffix"));
        }
      } else {
        setError(message);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        abortControllerRef.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }
  }, [input]);

  useEffect(() => {
    const lastTag = localStorage.getItem("coc-last-tag");
    if (lastTag) {
      load(lastTag);
    }
  }, []);

  return {
    input,
    setInput,
    loading,
    error,
    cacheWarning,
    player,
    syncedAt,
    load,
    clearPlayerCache,
    villageData,
    saveVillageData,
  };
}
