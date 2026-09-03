import { useEffect, useState } from "react";
import { imageDb, townHallDb, setTownHallDb, mergeScrapedLevels } from "../services/gameDatabase";
import { townHallInfo as townHallInfoDefault } from "../townHallData";

function validateImages(data: any): data is Record<string, string> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  return Object.values(data).every(v => typeof v === 'string' && v.startsWith('http'));
}

function validateTownHalls(data: any): data is any[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;
  return data.every(th => 
    typeof th.level === 'number' &&
    typeof th.title === 'string' &&
    typeof th.unlocks === 'object' && th.unlocks !== null
  );
}

function validateLevels(data: any): data is Record<string, any[]> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  return Object.values(data).every(arr => 
    Array.isArray(arr) && arr.every(row => 
      typeof row.level === 'number' &&
      typeof row.cost === 'number' &&
      typeof row.timeHours === 'number'
    )
  );
}

async function fetchJsonSafely(url: string) {
  try {
    const res = await fetch(url);
    if (!res || !res.ok) return null;
    const contentType = res.headers?.get ? (res.headers.get("content-type") || "") : "application/json";
    if (contentType && !contentType.includes("application/json") && !contentType.includes("+json")) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export function useGameDatabase(onLoaded: () => void) {
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJsonSafely("/data/images.json"),
      fetchJsonSafely("/data/townhalls.json"),
      fetchJsonSafely("/data/levels.json"),
    ]).then(([images, townhalls, levelsDb]) => {
      if (cancelled) return;
      const newWarnings: string[] = [];

      if (images) {
        if (validateImages(images)) {
          Object.assign(imageDb, images);
        } else {
          newWarnings.push("images.json has invalid schema, using fallback.");
        }
      }

      if (townhalls) {
        if (validateTownHalls(townhalls)) {
          setTownHallDb(townhalls);
        } else {
          newWarnings.push("townhalls.json has invalid schema, using fallback.");
        }
      }

      if (levelsDb) {
        if (validateLevels(levelsDb)) {
          mergeScrapedLevels(levelsDb);
        } else {
          newWarnings.push("levels.json has invalid schema, ignoring scraped levels.");
        }
      }
      
      if (newWarnings.length > 0) {
        setWarnings(newWarnings);
        console.warn("Data validation warnings:", newWarnings);
      }
      onLoaded();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { warnings };
}

export function getTownHallInfo() {
  return townHallDb || townHallInfoDefault;
}
