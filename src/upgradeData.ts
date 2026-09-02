export type Resource = "Gold" | "Elixir" | "Dark Elixir" | "Shiny Ore" | "Glowy Ore" | "Starry Ore";
export type UpgradeKind = "building" | "defense" | "trap" | "wall" | "hero" | "troop" | "spell" | "siege" | "equipment" | "pet";
export type UpgradeLane = "Builder" | "Laboratory" | "Blacksmith" | "Pet House" | "Instant";
export type DataStatus = "exact" | "estimated" | "unchecked";

export type UpgradeLevel = {
  level: number;
  townHall: number;
  cost: number;
  resource: Resource;
  timeHours: number;
  requires?: string[];
};

export type UpgradeItem = {
  id: string;
  name: string;
  kind: UpgradeKind;
  lane: UpgradeLane;
  unlockTownHall: number;
  quantity: number;
  apiTracked: boolean;
  dataStatus: DataStatus;
  source: string;
  notes?: string;
  levels: UpgradeLevel[];
  // Chỉ dùng cho kind "equipment": tên hero sở hữu trang bị này, để gom nhóm
  // hiển thị theo hero ở tab Quân & Hero.
  owner?: string;
};

const d = (days: number, hours = 0) => days * 24 + hours;
const money = (value: number) => Math.max(0, Math.round(value / 10000) * 10000);
const ore = (value: number) => Math.max(1, Math.round(value));

const range = (from: number, to: number, make: (level: number) => Omit<UpgradeLevel, "level">): UpgradeLevel[] => {
  const rows: UpgradeLevel[] = [];
  for (let level = from; level <= to; level += 1) rows.push({ level, ...make(level) });
  return rows;
};

const thByLevel = (level: number, gates: [number, number][]) => gates.find(([max]) => level <= max)?.[1] || gates.at(-1)?.[1] || 18;

const heroGates: [number, number][] = [[10,7],[20,8],[30,9],[40,10],[50,11],[65,12],[75,13],[80,14],[90,15],[95,16],[100,17],[120,18]];
const commonHeroLevels = (to: number, unlockTownHall: number, resource: Resource, baseCost: number, stepCost: number) =>
  range(2, to, (level) => ({
    townHall: Math.max(unlockTownHall, thByLevel(level, heroGates)),
    resource,
    cost: money(baseCost + level * stepCost + level ** 2 * 420),
    timeHours: level < 10 ? d(0, 4 + level * 2) : level < 40 ? d(1 + Math.floor(level / 8), level % 8) : d(5 + Math.floor(level / 12), level % 12),
    requires: [`Town Hall ${Math.max(unlockTownHall, thByLevel(level, heroGates))}`]
  }));

const labLevels = (to: number, unlockTownHall: number, resource: Resource, baseCost: number, stepCost: number, gates: [number, number][]) =>
  range(2, to, (level) => ({
    townHall: Math.max(unlockTownHall, thByLevel(level, gates)),
    resource,
    cost: money(baseCost + level * stepCost + level ** 2 * 68000),
    timeHours: d(Math.max(0, Math.floor(level * 1.35)), (level % 3) * 4),
    requires: [`Laboratory ${Math.max(1, Math.min(14, thByLevel(level, gates) + 1))}`]
  }));

const buildingLevels = (to: number, unlockTownHall: number, resource: Resource, baseCost: number, stepCost: number, power = 1.8) =>
  range(2, to, (level) => ({
    townHall: Math.max(unlockTownHall, Math.min(18, unlockTownHall + Math.floor((level - 1) * 0.9))),
    resource,
    cost: money(baseCost + stepCost * level ** power),
    timeHours: d(Math.max(0, Math.floor((level - 1) * 1.25)), (level % 4) * 4)
  }));

// Guardian (TH18): xây bằng thợ xây (không qua Laboratory), tối đa cấp 5,
// cả 3 loại (Logger/Longshot/Smasher) dùng chung 1 bảng chi phí vì được
// thiết kế cân bằng ngang nhau — đối chiếu bảng thật của Longshot (Clash of
// Clans Wiki) + khoảng chi phí Supercell xác nhận cho Smasher.
const guardianLevels = (): UpgradeLevel[] => [
  { level: 2, townHall: 18, resource: "Elixir", cost: 18000000, timeHours: d(7) },
  { level: 3, townHall: 18, resource: "Elixir", cost: 22000000, timeHours: d(9) },
  { level: 4, townHall: 18, resource: "Elixir", cost: 26000000, timeHours: d(11) },
  { level: 5, townHall: 18, resource: "Elixir", cost: 28000000, timeHours: d(13) }
];

const equipmentLevels = (to = 27) =>
  range(2, to, (level) => ({
    townHall: level <= 9 ? 8 : level <= 15 ? 10 : level <= 21 ? 12 : 14,
    resource: level % 9 === 0 ? "Starry Ore" : level % 3 === 0 ? "Glowy Ore" : "Shiny Ore",
    cost: level % 9 === 0 ? ore(10 + level * 1.5) : level % 3 === 0 ? ore(60 + level * 8) : ore(120 + level * 25),
    timeHours: 0,
    requires: [`Blacksmith ${Math.min(9, Math.ceil(level / 3))}`]
  }));

const item = (data: Omit<UpgradeItem, "quantity" | "apiTracked" | "source" | "dataStatus"> & Partial<Pick<UpgradeItem, "quantity" | "apiTracked" | "source" | "dataStatus">>): UpgradeItem => ({
  quantity: 1,
  apiTracked: ["hero","troop","spell","siege","equipment","pet"].includes(data.kind),
  dataStatus: "estimated",
  source: "Internal upgrade dataset seed. Replace individual rows with exact game values as patches change.",
  ...data
});

export const upgradeSources = [
  "Clash Ninja documents tracker concepts: builder/lab/pet queues, TH1-TH18, season boosts and upgrade timelines.",
  "Pixel Crux exposes structured tracker categories for buildings, walls, traps, heroes, troops, spells, siege machines, pets and totals.",
  "Supercell patch notes are the authority for economy reductions; this app's seed data should be updated after each game patch."
];

export const upgradeItems: UpgradeItem[] = [
  item({id:"town-hall",name:"Town Hall",kind:"building",lane:"Builder",unlockTownHall:1,apiTracked:true,dataStatus:"exact",source:"Supercell patch notes + verified app seed",levels:[
    {level:2,townHall:1,cost:1000,resource:"Gold",timeHours:0.08},{level:3,townHall:2,cost:4000,resource:"Gold",timeHours:3},
    {level:4,townHall:3,cost:25000,resource:"Gold",timeHours:d(1)},{level:5,townHall:4,cost:150000,resource:"Gold",timeHours:d(2)},
    {level:6,townHall:5,cost:750000,resource:"Gold",timeHours:d(4)},{level:7,townHall:6,cost:1200000,resource:"Gold",timeHours:d(6)},
    {level:8,townHall:7,cost:2000000,resource:"Gold",timeHours:d(8)},{level:9,townHall:8,cost:3000000,resource:"Gold",timeHours:d(10)},
    {level:10,townHall:9,cost:3500000,resource:"Gold",timeHours:d(12)},{level:11,townHall:10,cost:4000000,resource:"Gold",timeHours:d(14)},
    {level:12,townHall:11,cost:6000000,resource:"Gold",timeHours:d(14)},{level:13,townHall:12,cost:9000000,resource:"Gold",timeHours:d(15)},
    {level:14,townHall:13,cost:12000000,resource:"Gold",timeHours:d(16)},{level:15,townHall:14,cost:18000000,resource:"Gold",timeHours:d(13,12)},
    {level:16,townHall:15,cost:20000000,resource:"Gold",timeHours:d(14)},{level:17,townHall:16,cost:22000000,resource:"Gold",timeHours:d(15)},
    {level:18,townHall:17,cost:24000000,resource:"Gold",timeHours:d(16)}
  ]}),

  ...[
    ["builder-hut","Builder's Hut","defense","Builder",5,5,"Gold",800000,360000],
    ["cannon","Cannon","defense","Builder",1,7,"Gold",250,180000],
    ["archer-tower","Archer Tower","defense","Builder",2,8,"Gold",1000,190000],
    ["mortar","Mortar","defense","Builder",3,4,"Gold",8000,240000],
    ["air-defense","Air Defense","defense","Builder",4,4,"Gold",22000,300000],
    ["wizard-tower","Wizard Tower","defense","Builder",5,5,"Gold",120000,360000],
    ["air-sweeper","Air Sweeper","defense","Builder",6,2,"Gold",400000,420000],
    ["hidden-tesla","Hidden Tesla","defense","Builder",7,5,"Gold",500000,470000],
    ["xbow","X-Bow","defense","Builder",9,4,"Gold",1000000,620000],
    ["inferno-tower","Inferno Tower","defense","Builder",10,3,"Gold",2000000,760000],
    ["eagle-artillery","Eagle Artillery","defense","Builder",11,1,"Gold",6000000,950000],
    ["scattershot","Scattershot","defense","Builder",13,2,"Gold",9000000,1100000],
    ["monolith","Monolith","defense","Builder",15,1,"Dark Elixir",250000,22000],
    ["spell-tower","Spell Tower","defense","Builder",15,2,"Gold",14000000,1150000],
    ["multi-archer-tower","Multi-Archer Tower","defense","Builder",16,2,"Gold",15000000,1200000],
    ["ricochet-cannon","Ricochet Cannon","defense","Builder",16,2,"Gold",15000000,1200000],
    ["firespitter","Firespitter","defense","Builder",17,2,"Gold",17000000,1300000],
    // Super Wizard Tower (TH18): ghép từ 2 Wizard Tower, Wizard trên đỉnh
    // được "thăng cấp" bắn chuỗi sét — cùng nhóm "tháp ghép" như Multi-Archer
    // Tower/Ricochet Cannon (TH16) nên dùng chung công thức ước tính.
    ["super-wizard-tower","Super Wizard Tower","defense","Builder",18,2,"Gold",18000000,1350000],
    ["wall","Wall","wall","Instant",2,325,"Gold",1000,260000]
  ].map(([id,name,kind,lane,unlock,quantity,resource,base,step]) => item({
    id:String(id),name:String(name),kind:kind as UpgradeKind,lane:lane as UpgradeLane,unlockTownHall:Number(unlock),
    quantity:Number(quantity),apiTracked:false,dataStatus:kind==="wall"?"unchecked":"estimated",levels:buildingLevels(18,Number(unlock),resource as Resource,Number(base),Number(step),1.65)
  })),

  // Guardian (TH18) — Hộ vệ thành: mở khóa cùng lúc khi lên TH18, chỉ 1
  // Guardian được chọn phòng thủ mỗi lúc nhưng cả 3 loại đều nâng cấp độc
  // lập nên vẫn theo dõi riêng từng loại như những phòng thủ khác.
  ...["Logger","Longshot","Smasher"].map(name=>item({
    id:String(name).toLowerCase(),name:String(name),kind:"defense",lane:"Builder",unlockTownHall:18,apiTracked:false,
    source:"Clash of Clans Wiki + Supercell release notes TH18 (Longshot có bảng chi phí đầy đủ; Smasher/Logger đối chiếu cùng khoảng chi phí đã công bố).",
    notes:"Chỉ 1 Guardian phòng thủ mỗi lúc, nhưng có thể nâng cấp cả 3 loại độc lập.",
    levels:guardianLevels()
  })),

  // Revenge Tower (TH18) — càng nhiều công trình xung quanh bị phá thì càng
  // mạnh. Hiện chỉ có 2 cấp thật (không dùng công thức chung như các phòng
  // thủ khác) nên chi phí cấp 1 (mở khóa) được ghi rõ thay vì bỏ qua.
  item({
    id:"revenge-tower",name:"Revenge Tower",kind:"defense",lane:"Builder",unlockTownHall:18,apiTracked:false,
    source:"Clash of Clans Wiki — TH18, hiện chỉ có 2 cấp.",
    levels:[
      {level:1,townHall:18,resource:"Dark Elixir",cost:430000,timeHours:d(13)},
      {level:2,townHall:18,resource:"Dark Elixir",cost:460000,timeHours:d(14)}
    ]
  }),

  ...[
    ["gold-mine","Gold Mine","building","Builder",1,7,"Elixir",150,90000],
    ["elixir-collector","Elixir Collector","building","Builder",1,7,"Gold",150,90000],
    ["dark-elixir-drill","Dark Elixir Drill","building","Builder",7,3,"Elixir",500000,250000],
    ["gold-storage","Gold Storage","building","Builder",1,4,"Elixir",300,120000],
    ["elixir-storage","Elixir Storage","building","Builder",1,4,"Gold",300,120000],
    ["dark-elixir-storage","Dark Elixir Storage","building","Builder",7,1,"Elixir",600000,280000],
    ["barracks","Barracks","building","Builder",1,1,"Elixir",200,180000],
    ["dark-barracks","Dark Barracks","building","Builder",7,1,"Elixir",170000,260000],
    ["spell-factory","Spell Factory","building","Builder",5,1,"Elixir",200000,420000],
    ["dark-spell-factory","Dark Spell Factory","building","Builder",8,1,"Elixir",130000,360000],
    ["laboratory","Laboratory","building","Builder",3,1,"Elixir",25000,520000],
    ["army-camp","Army Camp","building","Builder",2,4,"Elixir",250,620000],
    ["clan-castle","Clan Castle","building","Builder",3,1,"Elixir",10000,760000],
    ["blacksmith","Blacksmith","building","Builder",8,1,"Gold",750000,600000],
    ["workshop","Workshop","building","Builder",12,1,"Elixir",7500000,700000],
    ["pet-house","Pet House","building","Builder",14,1,"Elixir",12000000,850000]
  ].map(([id,name,kind,lane,unlock,quantity,resource,base,step]) => item({
    id:String(id),name:String(name),kind:kind as UpgradeKind,lane:lane as UpgradeLane,unlockTownHall:Number(unlock),
    quantity:Number(quantity),apiTracked:false,levels:buildingLevels(16,Number(unlock),resource as Resource,Number(base),Number(step),1.72)
  })),

  ...[
    ["bomb","Bomb",3,8,"Gold",400,80000],["spring-trap","Spring Trap",4,9,"Gold",2000,120000],
    ["air-bomb","Air Bomb",5,8,"Gold",8000,150000],["giant-bomb","Giant Bomb",6,7,"Gold",12500,180000],
    ["seeking-air-mine","Seeking Air Mine",7,8,"Gold",15000,220000],["skeleton-trap","Skeleton Trap",8,4,"Gold",600000,260000],
    ["tornado-trap","Tornado Trap",11,1,"Gold",2000000,350000],
    // Bổ sung từ đối chiếu coc.guide: bẫy mới nhất mở ở TH17, trước đó danh
    // sách chỉ dừng ở Tornado Trap (TH11) nên thiếu hẳn bẫy TH cao.
    ["giga-bomb","Giga Bomb",17,2,"Gold",20000000,1800000]
  ].map(([id,name,unlock,quantity,resource,base,step]) => item({
    id:String(id),name:String(name),kind:"trap",lane:"Builder",unlockTownHall:Number(unlock),quantity:Number(quantity),apiTracked:false,
    levels:buildingLevels(12,Number(unlock),resource as Resource,Number(base),Number(step),1.55)
  })),

  item({id:"barbarian-king",name:"Barbarian King",kind:"hero",lane:"Builder",unlockTownHall:7,levels:commonHeroLevels(110,7,"Dark Elixir",2500,3100)}),
  item({id:"archer-queen",name:"Archer Queen",kind:"hero",lane:"Builder",unlockTownHall:8,levels:commonHeroLevels(110,8,"Dark Elixir",3000,3300)}),
  item({id:"minion-prince",name:"Minion Prince",kind:"hero",lane:"Builder",unlockTownHall:9,levels:commonHeroLevels(95,9,"Dark Elixir",2800,3000)}),
  item({id:"grand-warden",name:"Grand Warden",kind:"hero",lane:"Builder",unlockTownHall:11,levels:commonHeroLevels(80,11,"Elixir",1000000,115000)}),
  item({id:"royal-champion",name:"Royal Champion",kind:"hero",lane:"Builder",unlockTownHall:13,levels:commonHeroLevels(50,13,"Dark Elixir",60000,5200)}),
  item({id:"dragon-duke",name:"Dragon Duke",kind:"hero",lane:"Builder",unlockTownHall:15,levels:commonHeroLevels(40,15,"Dark Elixir",90000,6200)}),

  ...[
    ["Barbarian",10,1,"Elixir"],["Archer",10,1,"Elixir"],["Giant",13,3,"Elixir"],["Goblin",9,2,"Elixir"],
    ["Wall Breaker",12,3,"Elixir"],["Balloon",12,4,"Elixir"],["Wizard",12,5,"Elixir"],["Healer",9,6,"Elixir"],
    ["Dragon",12,7,"Elixir"],["P.E.K.K.A",12,8,"Elixir"],["Baby Dragon",11,9,"Elixir"],["Miner",11,10,"Elixir"],
    ["Electro Dragon",9,11,"Elixir"],["Yeti",7,12,"Elixir"],["Dragon Rider",5,13,"Elixir"],["Electro Titan",4,14,"Elixir"],
    ["Root Rider",3,15,"Elixir"],["Druid",4,14,"Elixir"],["Furnace",2,15,"Dark Elixir"],
    ["Ruin Witch",3,16,"Elixir"],["Thrower",2,16,"Elixir"],["Meteor Golem",3,17,"Elixir"],
    ["Minion",13,7,"Dark Elixir"],["Hog Rider",13,7,"Dark Elixir"],["Valkyrie",12,8,"Dark Elixir"],["Golem",13,8,"Dark Elixir"],
    ["Witch",7,9,"Dark Elixir"],["Lava Hound",6,9,"Dark Elixir"],["Bowler",8,10,"Dark Elixir"],["Ice Golem",7,11,"Dark Elixir"],
    ["Headhunter",3,12,"Dark Elixir"],["Apprentice Warden",4,13,"Dark Elixir"]
  ].map(([name,to,unlock,resource]) => item({
    id:String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name:String(name),kind:"troop",lane:"Laboratory",
    unlockTownHall:Number(unlock),levels:labLevels(Number(to),Number(unlock),resource as Resource,180000,420000,[[2,Number(unlock)],[4,9],[6,11],[8,13],[10,15],[13,18]])
  })),

  ...[
    ["Lightning Spell",12,5,"Elixir"],["Healing Spell",10,6,"Elixir"],["Rage Spell",6,7,"Elixir"],["Jump Spell",5,9,"Elixir"],
    ["Freeze Spell",8,9,"Elixir"],["Clone Spell",8,10,"Elixir"],["Invisibility Spell",4,11,"Elixir"],["Recall Spell",6,13,"Elixir"],
    ["Revive Spell",4,15,"Elixir"],["Poison Spell",9,8,"Dark Elixir"],["Earthquake Spell",6,8,"Dark Elixir"],["Haste Spell",5,9,"Dark Elixir"],
    ["Skeleton Spell",8,9,"Dark Elixir"],["Bat Spell",6,10,"Dark Elixir"],["Overgrowth Spell",4,12,"Dark Elixir"],["Totem Spell",3,17,"Elixir"]
  ].map(([name,to,unlock,resource]) => item({
    id:String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name:String(name),kind:"spell",lane:"Laboratory",
    unlockTownHall:Number(unlock),levels:labLevels(Number(to),Number(unlock),resource as Resource,250000,520000,[[2,Number(unlock)],[4,10],[6,13],[8,16],[12,18]])
  })),

  ...[
    ["Wall Wrecker",12],["Battle Blimp",12],["Stone Slammer",12],["Siege Barracks",13],["Log Launcher",13],
    ["Flame Flinger",14],["Battle Drill",15],["Troop Launcher",16],["Sky Wagon",17]
  ].map(([name,unlock])=>item({
    id:String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name:String(name),kind:"siege",lane:"Laboratory",unlockTownHall:Number(unlock),
    levels:labLevels(Number(unlock)<14?5:4,Number(unlock),"Elixir",5500000,650000,[[2,Number(unlock)],[3,Number(unlock)+1],[4,Number(unlock)+3],[5,17]])
  })),

  // Trang bị hero — đủ 42 món hiện có trong game (đối chiếu tên + hero sở
  // hữu với Clash of Clans Wiki, tháng 9/2026 — gồm cả các món mới như
  // Meteor Staff/Stick Horse/Monolith Arrow/Rage Gem/Rocket Spear/Stun
  // Blaster...). Điều kiện mở khóa hiển thị trong app dùng chung mức TH mở
  // khóa hero sở hữu, vì phải có hero đó mới trang bị được — cấp Blacksmith
  // cụ thể từng món có thể khác nhau và không phản ánh đầy đủ ở đây.
  ...[
    ["Giant Gauntlet","Barbarian King",7],["Rage Vial","Barbarian King",7],["Vampstache","Barbarian King",7],
    ["Earthquake Boots","Barbarian King",7],["Barbarian Puppet","Barbarian King",7],["Spiky Ball","Barbarian King",7],
    ["Stick Horse","Barbarian King",7],["Snake Bracelet","Barbarian King",7],
    ["Action Figure","Archer Queen",8],["Archer Puppet","Archer Queen",8],["Frozen Arrow","Archer Queen",8],
    ["Giant Arrow","Archer Queen",8],["Healer Puppet","Archer Queen",8],["Invisibility Vial","Archer Queen",8],
    ["Magic Mirror","Archer Queen",8],["Monolith Arrow","Archer Queen",8],
    ["Dark Crown","Minion Prince",9],["Dark Orb","Minion Prince",9],["Henchmen Puppet","Minion Prince",9],["Metal Pants","Minion Prince",9],
    ["Meteor Staff","Minion Prince",9],["Noble Iron","Minion Prince",9],
    ["Eternal Tome","Grand Warden",11],["Fireball","Grand Warden",11],["Healing Tome","Grand Warden",11],["Heroic Torch","Grand Warden",11],
    ["Rage Gem","Grand Warden",11],["Life Gem","Grand Warden",11],["Lavaloon Puppet","Grand Warden",11],
    ["Electro Boots","Royal Champion",13],["Frost Flake","Royal Champion",13],["Haste Vial","Royal Champion",13],["Hog Rider Puppet","Royal Champion",13],
    ["Rocket Spear","Royal Champion",13],["Seeking Shield","Royal Champion",13],["Royal Gem","Royal Champion",13],
    ["Fire Heart","Dragon Duke",15],["Flame Blower","Dragon Duke",15],
    ["Stun Blaster","Dragon Duke",15],["Rocket Backpack","Dragon Duke",15],["Electro Fangs","Dragon Duke",15],["Revenge Deck","Dragon Duke",15]
  ].map(([name,owner,unlock])=>item({
    id:String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name:String(name),owner:String(owner),
    kind:"equipment",lane:"Blacksmith",unlockTownHall:Number(unlock),levels:equipmentLevels(27)
  })),

  ...[
    ["L.A.S.S.I",14],["Electro Owl",14],["Mighty Yak",14],["Unicorn",14],
    ["Diggy",15],["Frosty",15],["Phoenix",15],["Poison Lizard",15],
    ["Angry Jelly",16],["Spirit Fox",16],["Sneezy",17],["Greedy Raven",18]
  ].map(([name,unlock])=>item({
    id:String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name:String(name),kind:"pet",lane:"Pet House",unlockTownHall:Number(unlock),
    levels:labLevels(15,Number(unlock),"Dark Elixir",90000,6500,[[10,Number(unlock)],[15,Number(unlock)+1]])
  }))
];
