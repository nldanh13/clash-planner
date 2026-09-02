export type Unit = {
  name: string;
  level: number;
  maxLevel: number;
  village: "home" | "builderBase";
};

export type Equipment = Unit;

export type Hero = Unit & {
  equipment?: Equipment[];
};

export type Player = {
  tag: string;
  name: string;
  townHallLevel: number;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  builderHallLevel?: number;
  builderBaseTrophies?: number;
  donations?: number;
  donationsReceived?: number;
  clanCapitalContributions?: number;
  role?: string;
  warPreference?: string;
  clan?: { tag: string; name: string; clanLevel: number; badgeUrls?: { small?: string; medium?: string } };
  heroes: Hero[];
  troops: Unit[];
  spells: Unit[];
  heroEquipment: Equipment[];
};
