import { useCallback, useEffect, useRef, useState } from "react";
import type { PlacedBuilding } from "./types";

interface UseBasePlannerHistoryOptions {
  maxHistory?: number;
  initialState?: PlacedBuilding[] | (() => PlacedBuilding[]);
}

export function useBasePlannerHistory({
  maxHistory = 50,
  initialState = [],
}: UseBasePlannerHistoryOptions = {}) {
  const [history, setHistory] = useState<PlacedBuilding[][]>(() => {
    const resolved = typeof initialState === "function" ? initialState() : initialState;
    return [resolved || []];
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep ref in sync for keydown listener
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const historyRef = useRef(history);
  historyRef.current = history;

  const currentBuildings = history[currentIndex] || [];

  const pushState = useCallback(
    (newBuildings: PlacedBuilding[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, currentIndexRef.current + 1);
        const updated = [...sliced, newBuildings];
        if (updated.length > maxHistory) {
          updated.shift();
        }
        return updated;
      });
      setCurrentIndex((prev) => {
        const next = Math.min(prev + 1, maxHistory - 1);
        return next;
      });
    },
    [maxHistory]
  );

  const replaceState = useCallback((newBuildings: PlacedBuilding[]) => {
    setHistory((prev) => {
      const updated = [...prev];
      updated[currentIndexRef.current] = newBuildings;
      return updated;
    });
  }, []);

  const setEntireState = useCallback((newBuildings: PlacedBuilding[]) => {
    setHistory([newBuildings]);
    setCurrentIndex(0);
  }, []);

  const undo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Keyboard shortcut support (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return {
    buildings: currentBuildings,
    pushState,
    replaceState,
    setEntireState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex,
  };
}
