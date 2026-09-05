#!/usr/bin/env node
// Tải toàn bộ ảnh game (công trình/phòng thủ/bẫy + hero/quân/phép/trang
// bị/pet/máy công thành) về máy, lưu local vào public/ đúng đường dẫn mà
// App.tsx ưu tiên đọc trước tiên (xem localArt() trong src/App.tsx).
//
// Chạy 1 lần (hoặc mỗi khi thêm item mới vào src/upgradeData.ts):
//   node scripts/download-images.mjs
//   node scripts/download-images.mjs --force   (tải đè cả file đã có)
//
// Cần Node.js 18+ (đã có fetch sẵn), không cần cài thêm gì. Máy chạy script
// này cần có Internet — môi trường sandbox của Claude thì KHÔNG tải được
// ảnh nhị phân trực tiếp nên phần này phải chạy trên máy bạn.
//
// Nguồn ảnh:
//  - Công trình/phòng thủ/bẫy: coc.guide (trang dữ liệu lấy trực tiếp từ
//    file game gốc, ảnh xác minh từng URL một, không suy đoán tên file).
//  - Hero/quân/phép/trang bị/pet/máy công thành: assets.colinschmale.dev
//    (CDN dùng cho ảnh trong log chiến tranh của công cụ War Report).
//
// Ảnh nào tải lỗi (404, đổi tên, mất mạng...) sẽ được liệt kê ở cuối, app
// vẫn chạy bình thường và tự rớt xuống icon minh họa cho riêng mục đó.

import { mkdir, writeFile, access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC = path.join(ROOT, "public");
const FORCE = process.argv.includes("--force");
const MANIFEST_ONLY = process.argv.includes("--manifest-only") || process.argv.includes("--check-only");

const COC_GUIDE_BUILDING_ART = {
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

// Danh sách item còn lại — giữ đồng bộ thủ công với src/upgradeData.ts.
// Nếu bạn thêm hero/quân/phép/trang bị/pet/máy công thành mới, thêm dòng
// tương ứng vào đây (id, name, kind, owner) rồi chạy lại script.
const MANIFEST = [{"id": "town-hall", "name": "Town Hall", "kind": "building", "owner": null}, {"id": "builder-hut", "name": "Builder's Hut", "kind": "defense", "owner": null}, {"id": "cannon", "name": "Cannon", "kind": "defense", "owner": null}, {"id": "archer-tower", "name": "Archer Tower", "kind": "defense", "owner": null}, {"id": "mortar", "name": "Mortar", "kind": "defense", "owner": null}, {"id": "air-defense", "name": "Air Defense", "kind": "defense", "owner": null}, {"id": "wizard-tower", "name": "Wizard Tower", "kind": "defense", "owner": null}, {"id": "air-sweeper", "name": "Air Sweeper", "kind": "defense", "owner": null}, {"id": "hidden-tesla", "name": "Hidden Tesla", "kind": "defense", "owner": null}, {"id": "xbow", "name": "X-Bow", "kind": "defense", "owner": null}, {"id": "inferno-tower", "name": "Inferno Tower", "kind": "defense", "owner": null}, {"id": "eagle-artillery", "name": "Eagle Artillery", "kind": "defense", "owner": null}, {"id": "scattershot", "name": "Scattershot", "kind": "defense", "owner": null}, {"id": "monolith", "name": "Monolith", "kind": "defense", "owner": null}, {"id": "spell-tower", "name": "Spell Tower", "kind": "defense", "owner": null}, {"id": "multi-archer-tower", "name": "Multi-Archer Tower", "kind": "defense", "owner": null}, {"id": "ricochet-cannon", "name": "Ricochet Cannon", "kind": "defense", "owner": null}, {"id": "firespitter", "name": "Firespitter", "kind": "defense", "owner": null}, {"id": "wall", "name": "Wall", "kind": "wall", "owner": null}, {"id": "gold-mine", "name": "Gold Mine", "kind": "building", "owner": null}, {"id": "elixir-collector", "name": "Elixir Collector", "kind": "building", "owner": null}, {"id": "dark-elixir-drill", "name": "Dark Elixir Drill", "kind": "building", "owner": null}, {"id": "gold-storage", "name": "Gold Storage", "kind": "building", "owner": null}, {"id": "elixir-storage", "name": "Elixir Storage", "kind": "building", "owner": null}, {"id": "dark-elixir-storage", "name": "Dark Elixir Storage", "kind": "building", "owner": null}, {"id": "barracks", "name": "Barracks", "kind": "building", "owner": null}, {"id": "dark-barracks", "name": "Dark Barracks", "kind": "building", "owner": null}, {"id": "spell-factory", "name": "Spell Factory", "kind": "building", "owner": null}, {"id": "dark-spell-factory", "name": "Dark Spell Factory", "kind": "building", "owner": null}, {"id": "laboratory", "name": "Laboratory", "kind": "building", "owner": null}, {"id": "army-camp", "name": "Army Camp", "kind": "building", "owner": null}, {"id": "clan-castle", "name": "Clan Castle", "kind": "building", "owner": null}, {"id": "blacksmith", "name": "Blacksmith", "kind": "building", "owner": null}, {"id": "workshop", "name": "Workshop", "kind": "building", "owner": null}, {"id": "pet-house", "name": "Pet House", "kind": "building", "owner": null}, {"id": "bomb", "name": "Bomb", "kind": "trap", "owner": null}, {"id": "spring-trap", "name": "Spring Trap", "kind": "trap", "owner": null}, {"id": "air-bomb", "name": "Air Bomb", "kind": "trap", "owner": null}, {"id": "giant-bomb", "name": "Giant Bomb", "kind": "trap", "owner": null}, {"id": "seeking-air-mine", "name": "Seeking Air Mine", "kind": "trap", "owner": null}, {"id": "skeleton-trap", "name": "Skeleton Trap", "kind": "trap", "owner": null}, {"id": "tornado-trap", "name": "Tornado Trap", "kind": "trap", "owner": null}, {"id": "giga-bomb", "name": "Giga Bomb", "kind": "trap", "owner": null}, {"id": "barbarian-king", "name": "Barbarian King", "kind": "hero", "owner": null}, {"id": "archer-queen", "name": "Archer Queen", "kind": "hero", "owner": null}, {"id": "minion-prince", "name": "Minion Prince", "kind": "hero", "owner": null}, {"id": "grand-warden", "name": "Grand Warden", "kind": "hero", "owner": null}, {"id": "royal-champion", "name": "Royal Champion", "kind": "hero", "owner": null}, {"id": "dragon-duke", "name": "Dragon Duke", "kind": "hero", "owner": null}, {"id": "barbarian", "name": "Barbarian", "kind": "troop", "owner": null}, {"id": "archer", "name": "Archer", "kind": "troop", "owner": null}, {"id": "giant", "name": "Giant", "kind": "troop", "owner": null}, {"id": "goblin", "name": "Goblin", "kind": "troop", "owner": null}, {"id": "wall-breaker", "name": "Wall Breaker", "kind": "troop", "owner": null}, {"id": "balloon", "name": "Balloon", "kind": "troop", "owner": null}, {"id": "wizard", "name": "Wizard", "kind": "troop", "owner": null}, {"id": "healer", "name": "Healer", "kind": "troop", "owner": null}, {"id": "dragon", "name": "Dragon", "kind": "troop", "owner": null}, {"id": "p-e-k-k-a", "name": "P.E.K.K.A", "kind": "troop", "owner": null}, {"id": "baby-dragon", "name": "Baby Dragon", "kind": "troop", "owner": null}, {"id": "miner", "name": "Miner", "kind": "troop", "owner": null}, {"id": "electro-dragon", "name": "Electro Dragon", "kind": "troop", "owner": null}, {"id": "yeti", "name": "Yeti", "kind": "troop", "owner": null}, {"id": "dragon-rider", "name": "Dragon Rider", "kind": "troop", "owner": null}, {"id": "electro-titan", "name": "Electro Titan", "kind": "troop", "owner": null}, {"id": "root-rider", "name": "Root Rider", "kind": "troop", "owner": null}, {"id": "druid", "name": "Druid", "kind": "troop", "owner": null}, {"id": "furnace", "name": "Furnace", "kind": "troop", "owner": null}, {"id": "ruin-witch", "name": "Ruin Witch", "kind": "troop", "owner": null}, {"id": "thrower", "name": "Thrower", "kind": "troop", "owner": null}, {"id": "meteor-golem", "name": "Meteor Golem", "kind": "troop", "owner": null}, {"id": "minion", "name": "Minion", "kind": "troop", "owner": null}, {"id": "hog-rider", "name": "Hog Rider", "kind": "troop", "owner": null}, {"id": "valkyrie", "name": "Valkyrie", "kind": "troop", "owner": null}, {"id": "golem", "name": "Golem", "kind": "troop", "owner": null}, {"id": "witch", "name": "Witch", "kind": "troop", "owner": null}, {"id": "lava-hound", "name": "Lava Hound", "kind": "troop", "owner": null}, {"id": "bowler", "name": "Bowler", "kind": "troop", "owner": null}, {"id": "ice-golem", "name": "Ice Golem", "kind": "troop", "owner": null}, {"id": "headhunter", "name": "Headhunter", "kind": "troop", "owner": null}, {"id": "apprentice-warden", "name": "Apprentice Warden", "kind": "troop", "owner": null}, {"id": "lightning-spell", "name": "Lightning Spell", "kind": "spell", "owner": null}, {"id": "healing-spell", "name": "Healing Spell", "kind": "spell", "owner": null}, {"id": "rage-spell", "name": "Rage Spell", "kind": "spell", "owner": null}, {"id": "jump-spell", "name": "Jump Spell", "kind": "spell", "owner": null}, {"id": "freeze-spell", "name": "Freeze Spell", "kind": "spell", "owner": null}, {"id": "clone-spell", "name": "Clone Spell", "kind": "spell", "owner": null}, {"id": "invisibility-spell", "name": "Invisibility Spell", "kind": "spell", "owner": null}, {"id": "recall-spell", "name": "Recall Spell", "kind": "spell", "owner": null}, {"id": "revive-spell", "name": "Revive Spell", "kind": "spell", "owner": null}, {"id": "poison-spell", "name": "Poison Spell", "kind": "spell", "owner": null}, {"id": "earthquake-spell", "name": "Earthquake Spell", "kind": "spell", "owner": null}, {"id": "haste-spell", "name": "Haste Spell", "kind": "spell", "owner": null}, {"id": "skeleton-spell", "name": "Skeleton Spell", "kind": "spell", "owner": null}, {"id": "bat-spell", "name": "Bat Spell", "kind": "spell", "owner": null}, {"id": "overgrowth-spell", "name": "Overgrowth Spell", "kind": "spell", "owner": null}, {"id": "totem-spell", "name": "Totem Spell", "kind": "spell", "owner": null}, {"id": "wall-wrecker", "name": "Wall Wrecker", "kind": "siege", "owner": null}, {"id": "battle-blimp", "name": "Battle Blimp", "kind": "siege", "owner": null}, {"id": "stone-slammer", "name": "Stone Slammer", "kind": "siege", "owner": null}, {"id": "siege-barracks", "name": "Siege Barracks", "kind": "siege", "owner": null}, {"id": "log-launcher", "name": "Log Launcher", "kind": "siege", "owner": null}, {"id": "flame-flinger", "name": "Flame Flinger", "kind": "siege", "owner": null}, {"id": "battle-drill", "name": "Battle Drill", "kind": "siege", "owner": null}, {"id": "troop-launcher", "name": "Troop Launcher", "kind": "siege", "owner": null}, {"id": "sky-wagon", "name": "Sky Wagon", "kind": "siege", "owner": null}, {"id": "giant-gauntlet", "name": "Giant Gauntlet", "kind": "equipment", "owner": "Barbarian King"}, {"id": "rage-vial", "name": "Rage Vial", "kind": "equipment", "owner": "Barbarian King"}, {"id": "vampstache", "name": "Vampstache", "kind": "equipment", "owner": "Barbarian King"}, {"id": "earthquake-boots", "name": "Earthquake Boots", "kind": "equipment", "owner": "Barbarian King"}, {"id": "barbarian-puppet", "name": "Barbarian Puppet", "kind": "equipment", "owner": "Barbarian King"}, {"id": "action-figure", "name": "Action Figure", "kind": "equipment", "owner": "Archer Queen"}, {"id": "archer-puppet", "name": "Archer Puppet", "kind": "equipment", "owner": "Archer Queen"}, {"id": "frozen-arrow", "name": "Frozen Arrow", "kind": "equipment", "owner": "Archer Queen"}, {"id": "giant-arrow", "name": "Giant Arrow", "kind": "equipment", "owner": "Archer Queen"}, {"id": "healer-puppet", "name": "Healer Puppet", "kind": "equipment", "owner": "Archer Queen"}, {"id": "invisibility-vial", "name": "Invisibility Vial", "kind": "equipment", "owner": "Archer Queen"}, {"id": "dark-crown", "name": "Dark Crown", "kind": "equipment", "owner": "Minion Prince"}, {"id": "dark-orb", "name": "Dark Orb", "kind": "equipment", "owner": "Minion Prince"}, {"id": "henchmen-puppet", "name": "Henchmen Puppet", "kind": "equipment", "owner": "Minion Prince"}, {"id": "metal-pants", "name": "Metal Pants", "kind": "equipment", "owner": "Minion Prince"}, {"id": "eternal-tome", "name": "Eternal Tome", "kind": "equipment", "owner": "Grand Warden"}, {"id": "fireball", "name": "Fireball", "kind": "equipment", "owner": "Grand Warden"}, {"id": "healing-tome", "name": "Healing Tome", "kind": "equipment", "owner": "Grand Warden"}, {"id": "heroic-torch", "name": "Heroic Torch", "kind": "equipment", "owner": "Grand Warden"}, {"id": "electro-boots", "name": "Electro Boots", "kind": "equipment", "owner": "Royal Champion"}, {"id": "frost-flake", "name": "Frost Flake", "kind": "equipment", "owner": "Royal Champion"}, {"id": "haste-vial", "name": "Haste Vial", "kind": "equipment", "owner": "Royal Champion"}, {"id": "hog-rider-puppet", "name": "Hog Rider Puppet", "kind": "equipment", "owner": "Royal Champion"}, {"id": "fire-heart", "name": "Fire Heart", "kind": "equipment", "owner": "Dragon Duke"}, {"id": "flame-blower", "name": "Flame Blower", "kind": "equipment", "owner": "Dragon Duke"}, {"id": "l-a-s-s-i", "name": "L.A.S.S.I", "kind": "pet", "owner": null}, {"id": "electro-owl", "name": "Electro Owl", "kind": "pet", "owner": null}, {"id": "mighty-yak", "name": "Mighty Yak", "kind": "pet", "owner": null}, {"id": "unicorn", "name": "Unicorn", "kind": "pet", "owner": null}, {"id": "diggy", "name": "Diggy", "kind": "pet", "owner": null}, {"id": "frosty", "name": "Frosty", "kind": "pet", "owner": null}, {"id": "phoenix", "name": "Phoenix", "kind": "pet", "owner": null}, {"id": "poison-lizard", "name": "Poison Lizard", "kind": "pet", "owner": null}, {"id": "angry-jelly", "name": "Angry Jelly", "kind": "pet", "owner": null}, {"id": "spirit-fox", "name": "Spirit Fox", "kind": "pet", "owner": null}, {"id": "sneezy", "name": "Sneezy", "kind": "pet", "owner": null}, {"id": "greedy-raven", "name": "Greedy Raven", "kind": "pet", "owner": null},
{"id": "spiky-ball", "name": "Spiky Ball", "kind": "equipment", "owner": "Barbarian King"},
{"id": "stick-horse", "name": "Stick Horse", "kind": "equipment", "owner": "Barbarian King"},
{"id": "snake-bracelet", "name": "Snake Bracelet", "kind": "equipment", "owner": "Barbarian King"},
{"id": "magic-mirror", "name": "Magic Mirror", "kind": "equipment", "owner": "Archer Queen"},
{"id": "monolith-arrow", "name": "Monolith Arrow", "kind": "equipment", "owner": "Archer Queen"},
{"id": "meteor-staff", "name": "Meteor Staff", "kind": "equipment", "owner": "Minion Prince"},
{"id": "noble-iron", "name": "Noble Iron", "kind": "equipment", "owner": "Minion Prince"},
{"id": "rage-gem", "name": "Rage Gem", "kind": "equipment", "owner": "Grand Warden"},
{"id": "life-gem", "name": "Life Gem", "kind": "equipment", "owner": "Grand Warden"},
{"id": "lavaloon-puppet", "name": "Lavaloon Puppet", "kind": "equipment", "owner": "Grand Warden"},
{"id": "electro-fangs", "name": "Electro Fangs", "kind": "equipment", "owner": "Dragon Duke"},
{"id": "revenge-deck", "name": "Revenge Deck", "kind": "equipment", "owner": "Dragon Duke"},
{"id": "rocket-backpack", "name": "Rocket Backpack", "kind": "equipment", "owner": "Dragon Duke"},
{"id": "rocket-spear", "name": "Rocket Spear", "kind": "equipment", "owner": "Royal Champion"},
{"id": "royal-gem", "name": "Royal Gem", "kind": "equipment", "owner": "Royal Champion"},
{"id": "seeking-shield", "name": "Seeking Shield", "kind": "equipment", "owner": "Royal Champion"},
{"id": "stun-blaster", "name": "Stun Blaster", "kind": "equipment", "owner": "Dragon Duke"}];

const ASSETS = "https://assets.colinschmale.dev/warreport";

const localFolder = (kind) => {
  if (kind === "hero") return "heroes";
  if (kind === "troop" || kind === "siege") return "troops";
  if (kind === "spell") return "spells";
  if (kind === "equipment") return "equipment";
  if (kind === "pet") return "pets";
  return "buildings";
};
const isBuildingKind = (kind) => kind === "building" || kind === "defense" || kind === "trap" || kind === "wall";

const jobs = [];
for (const item of MANIFEST) {
  if (item.id === "town-hall") continue; // đã có sẵn đủ 18 cấp local trong public/town-halls
  if (isBuildingKind(item.kind)) {
    const p = COC_GUIDE_BUILDING_ART[item.id];
    if (!p) { console.warn(`(bỏ qua) chưa có URL coc.guide cho: ${item.id}`); continue; }
    const match = p.match(/^(.*)-(\d+)\.png$/);
    if (match) {
      const baseRemote = match[1];
      const maxLvl = parseInt(match[2], 10);
      for (let l = 1; l <= maxLvl; l++) {
        jobs.push({ url: `https://coc.guide${baseRemote}-${l}.png`, out: path.join(PUBLIC, "buildings", `${item.id}-${l}.png`) });
      }
    }
    jobs.push({ url: `https://coc.guide${p}`, out: path.join(PUBLIC, "buildings", `${item.id}.png`) });
  } else {
    const remoteFolder = item.kind === "hero" ? "heroes" : item.kind === "spell" ? "spells" : item.kind === "equipment" ? "heroes/equipment" : "troops";
    const url = `${ASSETS}/${remoteFolder}/${encodeURIComponent(item.name)}.webp`;
    jobs.push({ url, out: path.join(PUBLIC, localFolder(item.kind), `${item.id}.webp`) });
  }
}

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

async function downloadOne(job) {
  if (!FORCE && await exists(job.out)) return { job, status: "skip" };
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(job.url, { headers: { "User-Agent": "Mozilla/5.0 (clash-path-local image sync)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(path.dirname(job.out), { recursive: true });
      await writeFile(job.out, buf);
      return { job, status: "ok", bytes: buf.length };
    } catch (err) {
      if (attempt === 2) return { job, status: "fail", error: String(err.message || err) };
    }
  }
}

async function run() {
  if (MANIFEST_ONLY) {
    console.log("Chế độ chỉ kiểm tra & cập nhật assets-manifest.json (không tải mới từ mạng)...");
  } else {
    console.log(`Tổng cộng ${jobs.length} ảnh cần kiểm tra/tải (FORCE=${FORCE}).\n`);
    const CONCURRENCY = 6;
    const results = [];
    let i = 0;
    async function worker() {
      while (i < jobs.length) {
        const job = jobs[i++];
        const r = await downloadOne(job);
        results.push(r);
        const rel = path.relative(ROOT, job.out);
        if (r.status === "ok") console.log(`✔ ${rel}`);
        else if (r.status === "skip") console.log(`· đã có sẵn: ${rel}`);
        else console.log(`✘ ${rel} — ${r.error}`);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const ok = results.filter((r) => r.status === "ok").length;
    const skip = results.filter((r) => r.status === "skip").length;
    const fail = results.filter((r) => r.status === "fail");
    console.log(`\n--- Xong: ${ok} tải mới, ${skip} đã có sẵn, ${fail.length} lỗi. ---`);
    if (fail.length) {
      console.log("\nCác ảnh KHÔNG tải được (app sẽ tự dùng icon thay thế cho các mục này):");
      for (const r of fail) console.log(`  - ${path.relative(ROOT, r.job.out)}: ${r.error}`);
    }
  }

  // Tạo và cập nhật file public/assets-manifest.json
  await buildAssetsManifest();
}

async function buildAssetsManifest() {
  console.log("\nĐang tạo bảng kiểm kê kho lưu trữ: public/assets-manifest.json...");
  const manifestItems = [];
  const categories = {
    "town-halls": { name: "Town Hall", total: 0, local: 0, folder: "town-halls" },
    "buildings": { name: "Công trình & Phòng thủ", total: 0, local: 0, folder: "buildings" },
    "heroes": { name: "Tướng (Heroes)", total: 0, local: 0, folder: "heroes" },
    "troops": { name: "Quân đội & Cỗ máy", total: 0, local: 0, folder: "troops" },
    "spells": { name: "Phép thuật", total: 0, local: 0, folder: "spells" },
    "equipment": { name: "Trang bị Hero", total: 0, local: 0, folder: "equipment" },
    "pets": { name: "Thú cưng (Pets)", total: 0, local: 0, folder: "pets" }
  };

  // 1. Town Halls (1-18)
  for (let th = 1; th <= 18; th++) {
    const filename = `th-${th}.png`;
    const relFile = path.join("town-halls", filename);
    const fullPath = path.join(PUBLIC, relFile);
    let size = 0;
    let localExists = false;
    try {
      const st = await stat(fullPath);
      size = st.size;
      localExists = true;
    } catch {}

    categories["town-halls"].total++;
    if (localExists) categories["town-halls"].local++;

    manifestItems.push({
      id: `th-${th}`,
      name: `Town Hall ${th}`,
      kind: "town-hall",
      category: "town-halls",
      localPath: `/town-halls/${filename}`,
      format: "png",
      available: localExists,
      sizeBytes: size
    });
  }

  // 2. Các item trong MANIFEST
  for (const item of MANIFEST) {
    if (item.id === "town-hall") continue;
    const folder = localFolder(item.kind);
    const ext = (isBuildingKind(item.kind)) ? "png" : "webp";
    const filename = `${item.id}.${ext}`;
    const relFile = path.join(folder, filename);
    const fullPath = path.join(PUBLIC, relFile);

    let size = 0;
    let localExists = false;
    try {
      const st = await stat(fullPath);
      size = st.size;
      localExists = true;
    } catch {}

    const catKey = folder;
    if (categories[catKey]) {
      categories[catKey].total++;
      if (localExists) categories[catKey].local++;
    }

    manifestItems.push({
      id: item.id,
      name: item.name,
      kind: item.kind,
      category: catKey,
      owner: item.owner || null,
      localPath: `/${folder}/${filename}`,
      format: ext,
      available: localExists,
      sizeBytes: size
    });
  }

  let totalItems = manifestItems.length;
  let totalLocal = manifestItems.filter(i => i.available).length;
  let coveragePercent = totalItems > 0 ? Math.round((totalLocal / totalItems) * 1000) / 10 : 0;

  const manifestData = {
    updatedAt: new Date().toISOString(),
    version: "1.0.0",
    summary: {
      totalItems,
      totalLocal,
      coveragePercent,
      categories
    },
    items: manifestItems
  };

  const manifestPath = path.join(PUBLIC, "assets-manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifestData, null, 2), "utf8");
  console.log(`✔ Đã lưu bảng kiểm kê kho: ${totalLocal}/${totalItems} ảnh (${coveragePercent}%) vào public/assets-manifest.json.`);
}

run();
