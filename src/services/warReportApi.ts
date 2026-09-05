import type { Player } from "../types";
import { normalizeTag } from "../utils/formatters";
import { clampInteger } from "../utils/villageImport";
import { vi } from "../i18n/locales/vi";

export async function fetchPlayer(rawTag: string, signal?: AbortSignal): Promise<Player> {
  const tag = normalizeTag(rawTag);
  const res = await fetch(`/api/warreport/v1/players/${encodeURIComponent(tag)}`, {
    cache: "no-store",
    signal,
  });
  const contentType = res.headers?.get ? (res.headers.get("content-type") || "") : "application/json";

  if (!res.ok) {
    if (res.status === 404) throw new Error(vi.warReport.playerNotFound);
    if (res.status === 401 || res.status === 403)
      throw new Error(vi.warReport.apiAccessDenied);
    if (res.status === 502) throw new Error(vi.warReport.proxyUnreachable);
    if (res.status === 503) throw new Error(vi.warReport.tokenNotConfigured);

    if (contentType.includes("application/json")) {
      try {
        const errJson = await res.json();
        if (errJson && typeof errJson === "object" && typeof errJson.error === "string") {
          throw new Error(errJson.error);
        }
      } catch (e: any) {
        if (e instanceof Error && e.message && !e.message.includes("is not valid JSON")) {
          throw e;
        }
      }
    }
    throw new Error(vi.warReport.serverError.replace("{status}", String(res.status)));
  }

  if (res.redirected || (contentType && !contentType.includes("application/json") && !contentType.includes("+json"))) {
    throw new Error(vi.warReport.nonJsonResponse);
  }

  let payload: Partial<Player>;
  try {
    payload = (await res.json()) as Partial<Player>;
  } catch {
    throw new Error(vi.warReport.invalidResponseData);
  }
  if (!payload || typeof payload !== "object" || !Number.isFinite(payload.townHallLevel)) {
    throw new Error(vi.warReport.invalidResponseData);
  }
  const data: Player = {
    ...payload,
    tag: typeof payload.tag === "string" ? normalizeTag(payload.tag) : tag,
    name: typeof payload.name === "string" ? payload.name : vi.warReport.defaultPlayerName,
    townHallLevel: clampInteger(payload.townHallLevel, 1, 18, 1),
    expLevel: clampInteger(payload.expLevel, 0, 1000, 0),
    trophies: clampInteger(payload.trophies, 0, 100000, 0),
    bestTrophies: clampInteger(payload.bestTrophies, 0, 100000, 0),
    warStars: clampInteger(payload.warStars, 0, 100000, 0),
    attackWins: clampInteger(payload.attackWins, 0, 100000, 0),
    defenseWins: clampInteger(payload.defenseWins, 0, 100000, 0),
    heroes: Array.isArray(payload.heroes) ? payload.heroes.filter(u => u && typeof u.name === "string" && typeof u.level === "number" && typeof u.maxLevel === "number") : [],
    troops: Array.isArray(payload.troops) ? payload.troops.filter(u => u && typeof u.name === "string" && typeof u.level === "number" && typeof u.maxLevel === "number") : [],
    spells: Array.isArray(payload.spells) ? payload.spells.filter(u => u && typeof u.name === "string" && typeof u.level === "number" && typeof u.maxLevel === "number") : [],
    heroEquipment: Array.isArray(payload.heroEquipment) ? payload.heroEquipment.filter(u => u && typeof u.name === "string" && typeof u.level === "number" && typeof u.maxLevel === "number") : [],
    clan: typeof payload.clan === "object" && payload.clan ? payload.clan : undefined,
  };
  return data;
}
