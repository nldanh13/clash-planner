import React, { useState } from "react";
import {
  AlertTriangle, Bomb, Castle, Check, ClipboardPaste, Coins, Crosshair,
  Clock3, Crown, Droplet, Flame, FlaskConical, Gem, Hammer, Info, LayoutGrid, LoaderCircle, Lock, Moon, PawPrint, RefreshCw,
  Search, ShieldCheck, Skull, Sparkles, Swords, Target, Tent, Trophy, Truck, Users, Wind, Wrench, Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UpgradeItem, Resource } from "../upgradeData";
import { imageDb } from "../services/gameDatabase";

const ASSETS = "https://assets.colinschmale.dev/warreport";
export const thImage = (th: number) => `/town-halls/th-${Math.max(1, Math.min(18, th))}.png`;

const cocGuideBuildingArt: Record<string, string> = {
  "army-camp":"/static/imgs/army/troop-housing-12.png","barracks":"/static/imgs/army/barrack-18.png",
  "dark-barracks":"/static/imgs/army/dark-elixir-barrack-11.png","spell-factory":"/static/imgs/army/spell-forge-8.png",
  "dark-spell-factory":"/static/imgs/army/mini-spell-factory-6.png","laboratory":"/static/imgs/army/laboratory-15.png",
  "clan-castle":"/static/imgs/army/alliance-castle-13.png","blacksmith":"/static/imgs/army/smithy-9.png",
  "workshop":"/static/imgs/army/siegeworkshop-7.png","pet-house":"/static/imgs/army/pet-shop-10.png",
  "gold-mine":"/static/imgs/resource/gold-mine-16.png","elixir-collector":"/static/imgs/resource/elixir-pump-16.png",
  "dark-elixir-drill":"/static/imgs/resource/dark-elixir-pump-10.png","gold-storage":"/static/imgs/resource/gold-storage-18.png",
  "elixir-storage":"/static/imgs/resource/elixir-storage-18.png","dark-elixir-storage":"/static/imgs/resource/dark-elixir-storage-12.png",
  "builder-hut":"/static/imgs/other/worker-building-6.png","cannon":"/static/imgs/defense/cannon-21.png",
  "archer-tower":"/static/imgs/defense/archer-tower-21.png","mortar":"/static/imgs/defense/mortar-16.png",
  "air-defense":"/static/imgs/defense/air-defense-15.png","wizard-tower":"/static/imgs/defense/wizard-tower-17.png",
  "air-sweeper":"/static/imgs/defense/air-blaster-7.png","hidden-tesla":"/static/imgs/defense/tesla-tower-15.png",
  "xbow":"/static/imgs/defense/bow-11.png","inferno-tower":"/static/imgs/defense/dark-tower-10.png",
  "eagle-artillery":"/static/imgs/defense/ancient-artillery-7.png","scattershot":"/static/imgs/defense/scattershot-5.png",
  "monolith":"/static/imgs/defense/monolith-3.png","spell-tower":"/static/imgs/defense/spell-tower-3.png",
  "multi-archer-tower":"/static/imgs/defense/merged-archer-tower-3.png","ricochet-cannon":"/static/imgs/defense/merged-cannon-3.png",
  "firespitter":"/static/imgs/defense/firespitter-2.png","wall":"/static/imgs/defense/wall-18.png",
  "bomb":"/static/imgs/trap/mine-13.png","spring-trap":"/static/imgs/trap/ejector-5.png",
  "air-bomb":"/static/imgs/trap/airtrap-11.png","giant-bomb":"/static/imgs/trap/superbomb-11.png",
  "seeking-air-mine":"/static/imgs/trap/megaairtrap-7.png","skeleton-trap":"/static/imgs/trap/halloweenskels-3.png",
  "tornado-trap":"/static/imgs/trap/tornadotrap-1.png","giga-bomb":"/static/imgs/trap/gigabomb-3.png"
};

const localFolder = (kind: UpgradeItem["kind"]): string => {
  if (kind === "hero") return "heroes";
  if (kind === "troop" || kind === "siege") return "troops";
  if (kind === "spell") return "spells";
  if (kind === "equipment") return "equipment";
  if (kind === "pet") return "pets";
  return "buildings";
};

const localExt = (kind: UpgradeItem["kind"]) =>
  kind === "building" || kind === "defense" || kind === "trap" || kind === "wall" ? "png" : "webp";

const localArt = (item: UpgradeItem, townHallLevel?: number) =>
  item.id === "town-hall"
    ? thImage(townHallLevel ?? item.levels.at(-1)?.level ?? 1)
    : `/${localFolder(item.kind)}/${item.id}.${localExt(item.kind)}`;

const remoteArt = (item: UpgradeItem, townHallLevel?: number): string | null => {
  if (item.id === "town-hall") return thImage(townHallLevel ?? item.levels.at(-1)?.level ?? 1);
  if (imageDb[item.id]) return imageDb[item.id];
  if (item.kind === "building" || item.kind === "defense" || item.kind === "trap" || item.kind === "wall") {
    const path = cocGuideBuildingArt[item.id];
    return path ? `https://coc.guide${path}` : null;
  }
  const folder =
    item.kind === "hero" ? "heroes" : item.kind === "spell" ? "spells" : item.kind === "equipment" ? "heroes/equipment" : "troops";
  return `${ASSETS}/${folder}/${encodeURIComponent(item.name)}.webp`;
};

const buildingIconById: Record<string, LucideIcon> = {
  "army-camp": Tent, "elixir-collector": Droplet, "elixir-storage": Droplet, "gold-mine": Coins, "gold-storage": Coins,
  "dark-elixir-drill": Moon, "dark-elixir-storage": Moon, "barracks": Swords, "dark-barracks": Swords,
  "spell-factory": Sparkles, "dark-spell-factory": Sparkles, "laboratory": FlaskConical, "clan-castle": Castle,
  "blacksmith": Hammer, "workshop": Wrench, "pet-house": PawPrint,
  "builder-hut": Hammer, "cannon": Target, "archer-tower": Crosshair, "mortar": Target, "air-defense": Wind,
  "wizard-tower": Sparkles, "air-sweeper": Wind, "hidden-tesla": Zap, "xbow": Crosshair, "inferno-tower": Flame,
  "eagle-artillery": Crosshair, "scattershot": Target, "monolith": Gem, "spell-tower": Sparkles,
  "multi-archer-tower": Crosshair, "ricochet-cannon": Target, "firespitter": Flame,
  "bomb": Bomb, "spring-trap": Zap, "air-bomb": Wind, "giant-bomb": Bomb, "seeking-air-mine": Crosshair,
  "skeleton-trap": Skull, "tornado-trap": Wind, "giga-bomb": Bomb
};

const kindIcon: Record<UpgradeItem["kind"], LucideIcon> = {
  building: Hammer, defense: ShieldCheck, trap: Target, wall: ShieldCheck, hero: Crown, troop: Swords, spell: Sparkles, siege: Truck, equipment: ShieldCheck, pet: PawPrint
};

export function SmartArt({ item, size, townHallLevel }: { item: UpgradeItem; size?: "sm"; townHallLevel?: number }) {
  const [stage, setStage] = useState<"local" | "remote" | "icon">("local");
  const remote = remoteArt(item, townHallLevel);
  const Icon = buildingIconById[item.id] || kindIcon[item.kind] || Hammer;
  const cls = `upgrade-icon ${item.kind}${size === "sm" ? " sm" : ""}`;
  if (stage === "icon" || (stage === "remote" && !remote)) return <span className={cls}><Icon /></span>;
  const src = stage === "local" ? localArt(item, townHallLevel) : (remote as string);
  return <img className={`upgrade-art${size === "sm" ? " sm" : ""}`} src={src} alt={item.name} onError={() => setStage(stage === "local" ? (remote ? "remote" : "icon") : "icon")} />;
}

export const resourceIcon: Record<Resource, string> = {
  Gold: "/resources/gold.png",
  Elixir: "/resources/elixir.png",
  "Dark Elixir": "/resources/dark-elixir.png",
  "Shiny Ore": "/resources/shiny-ore.png",
  "Glowy Ore": "/resources/glowy-ore.png",
  "Starry Ore": "/resources/starry-ore.png"
};

export const resourceClass: Record<Resource, string> = {
  Gold: "res-gold", Elixir: "res-elixir", "Dark Elixir": "res-dark",
  "Shiny Ore": "res-shiny", "Glowy Ore": "res-glowy", "Starry Ore": "res-starry"
};
export function CostBadges({ costs }: { costs: Partial<Record<Resource, number>> }) {
  const entries = (Object.entries(costs) as [Resource, number][]).filter(([, v]) => (v || 0) > 0);
  if (!entries.length) return <span className="cost-badges"><span className="cost-badge">0</span></span>;
  return <span className="cost-badges">{entries.map(([resource, value]) => {
    return (
      <span key={resource} className={`cost-badge ${resourceClass[resource]}`} title={resource}>
        <img src={resourceIcon[resource]} alt={resource} className="w-3.5 h-3.5 object-contain inline-block" />
        {new Intl.NumberFormat("vi-VN").format(Math.round(value))}
      </span>
    );
  })}</span>;
}
