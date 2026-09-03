import type { Resource } from "../upgradeData";

export const normalizeTag = (value: string) => {
  const cleaned = value.toUpperCase().replace(/\s/g, "").replace(/^%23/, "#");
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
};

export const pct = (items: { level: number; maxLevel: number }[]) =>
  items.length
    ? Math.round((items.reduce((s, x) => s + x.level / x.maxLevel, 0) / items.length) * 100)
    : 0;

export const fmtNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value));

export const fmtTimeExact = (hours: number) => {
  if (hours <= 0) return "Không tốn thời gian";
  const days = Math.floor(hours / 24),
    rest = Math.round(hours % 24);
  if (days && rest) return `${days} ngày ${rest} giờ`;
  if (days) return `${days} ngày`;
  return `${rest} giờ`;
};

export const fmtTime = (hours: number, full = false) => {
  if (hours <= 0) return "Không tốn thời gian";
  const days = Math.floor(hours / 24);
  if (!full && days >= 365) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (months > 0) return `${years} năm ${months} tháng`;
    return `${years} năm`;
  }
  return fmtTimeExact(hours);
};

export const fmtCost = (costs: Partial<Record<Resource, number>>) =>
  Object.entries(costs)
    .filter(([, v]) => (v || 0) > 0)
    .map(([k, v]) => `${fmtNumber(v || 0)} ${k}`)
    .join(" · ") || "0";

export const emptyCosts = () => ({} as Partial<Record<Resource, number>>);

export const addCosts = (
  target: Partial<Record<Resource, number>>,
  source: Partial<Record<Resource, number>>,
  factor = 1
) => {
  for (const [resource, value] of Object.entries(source))
    target[resource as Resource] = (target[resource as Resource] || 0) + (value || 0) * factor;
};

import type { DataStatus, UpgradeItem } from "../upgradeData";

export const itemKindLabel: Record<UpgradeItem["kind"], string> = {
  building: "Công trình",
  defense: "Phòng thủ",
  trap: "Bẫy",
  wall: "Tường",
  hero: "Tướng",
  troop: "Quân",
  spell: "Phép",
  siege: "Máy công thành",
  equipment: "Trang bị",
  pet: "Pet",
};

export const dataStatusLabel: Record<DataStatus, string> = {
  exact: "Chính xác",
  estimated: "Ước tính",
  unchecked: "Chưa kiểm",
};

export const dataStatusDetail: Record<DataStatus, string> = {
  exact: "Có thể dùng để tính kế hoạch.",
  estimated: "Dùng để lập khung, cần thay bằng số liệu thật.",
  unchecked: "Không đưa vào tính tổng mặc định.",
};
