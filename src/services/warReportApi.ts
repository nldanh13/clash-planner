import type { Player } from "../types";
import { normalizeTag } from "../utils/formatters";
import { clampInteger } from "../utils/villageImport";

export async function fetchPlayer(rawTag: string, signal?: AbortSignal): Promise<Player> {
  const tag = normalizeTag(rawTag);
  const res = await fetch(`/api/warreport/v1/players/${encodeURIComponent(tag)}`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Không tìm thấy người chơi. Hãy kiểm tra lại Player Tag.");
    if (res.status === 401 || res.status === 403)
      throw new Error("War Report đã thay đổi quyền hoặc API Key bị lỗi. Cần kiểm tra lại cấu hình .env (WAR_REPORT_API_KEY).");
    if (res.status === 502) throw new Error("Proxy không thể kết nối đến War Report. Hãy chắc chắn bạn đã cấu hình backend proxy.");
    if (res.status === 503) throw new Error("Chưa cấu hình WAR_REPORT_API_KEY trong môi trường. Vui lòng thêm WAR_REPORT_API_KEY trong phần Cài đặt.");
    throw new Error(`Máy chủ War Report phản hồi lỗi ${res.status}.`);
  }
  const payload = (await res.json()) as Partial<Player>;
  if (!payload || typeof payload !== "object" || !Number.isFinite(payload.townHallLevel)) {
    throw new Error("Dữ liệu phản hồi từ War Report không hợp lệ hoặc bị lỗi cấu trúc.");
  }
  const data: Player = {
    ...payload,
    tag: typeof payload.tag === "string" ? normalizeTag(payload.tag) : tag,
    name: typeof payload.name === "string" ? payload.name : "Người chơi",
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
