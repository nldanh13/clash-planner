#!/usr/bin/env node
// coc-admin — công cụ TỰ ĐỘNG lấy dữ liệu thật (không nhập tay) và ghi ra
// "cơ sở dữ liệu" dạng nhiều file JSON, để webapp đọc lúc chạy (fetch),
// không còn nhét chung vào 1 file .ts như trước.
//
// Chạy trên máy có Internet thật (sandbox của Claude không tải được):
//   node scrape.mjs
//
// Kết quả ghi vào thư mục ./data (tự tạo nếu chưa có):
//   data/images.json    — { "<item-id>": "<url ảnh>" }  — TOÀN BỘ item
//   data/catalog.json   — [{ id, name, kind, owner }]    — danh mục item đã biết
//   data/townhalls.json — [{ level, title, blurb, unlocks }] — nội dung Roadmap TH1-18
//
// Sau khi chạy xong, copy nguyên thư mục data/ này vào webapp, đặt ở
// đúng public/data/ (webapp fetch("/data/images.json") lúc chạy — xem
// coc-admin/README.txt để biết chi tiết).
//
// Nguồn dữ liệu:
//  - Công trình/phòng thủ/bẫy: bảng URL đã xác minh thủ công từ coc.guide
//    (đối chiếu từng URL một, không đoán tên file) + có thử quét lại trang
//    coc.guide sống để phát hiện ảnh MỚI chưa có trong bảng (best-effort —
//    chỉ báo cho bạn xem, không tự gán bừa vì không chắc khớp item nào).
//  - Hero/quân/phép/trang bị/pet/máy công thành: tính theo công thức URL
//    CDN của assets.colinschmale.dev từ tên item (đã xác minh hoạt động
//    ổn định), có gọi thử để xác nhận từng link còn sống không.
//  - Roadmap TH1-18: giữ nguyên nội dung đã nghiên cứu từ trước (ClashVault
//    town-hall guide), chuyển từ townHallData.ts sang JSON.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, "data");

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
const TOWNHALLS = [{"level":1,"title":"Khởi đầu","blurb":"Làm quen cơ chế cơ bản: xây, thu tài nguyên, tập trận đầu tiên.","unlocks":{"buildings":["Town Hall","Army Camp","Barracks","Gold Mine","Gold Storage","Elixir Collector","Elixir Storage"],"defenses":["Cannon"],"troops":["Barbarian","Archer","Giant"]}},{"level":2,"title":"Phòng thủ đầu tiên","blurb":"Tường và Archer Tower buộc bạn phải nghĩ đến bố trí làng lần đầu tiên.","unlocks":{"buildings":["Clan Castle","Tường (Wall)"],"defenses":["Archer Tower"],"troops":["Goblin"]}},{"level":3,"title":"Gia nhập hội","blurb":"Laboratory mở ra nhánh nâng cấp quân độc lập với công trình.","unlocks":{"buildings":["Laboratory"],"defenses":["Mortar"],"traps":["Bomb"]}},{"level":4,"title":"Trên không & phá tường","blurb":"Air Defense và hai đơn vị chuyên dụng đầu tiên xuất hiện.","unlocks":{"defenses":["Air Defense"],"traps":["Spring Trap"],"troops":["Balloon","Wall Breaker"]}},{"level":5,"title":"Phép thuật","blurb":"Spell Factory và Lightning Spell mở kỷ nguyên dùng phép trong tấn công.","unlocks":{"buildings":["Spell Factory"],"defenses":["Wizard Tower"],"traps":["Air Bomb"],"troops":["Wizard"],"spells":["Lightning Spell"]}},{"level":6,"title":"Kiểm soát trên không","blurb":"Air Sweeper đổi hướng quân bay, Healing Spell kéo dài đội hình đẩy.","unlocks":{"defenses":["Air Sweeper"],"traps":["Giant Bomb"],"troops":["Healer"],"spells":["Healing Spell"]}},{"level":7,"title":"Hero & Dark Elixir","blurb":"Hero đầu tiên xuất hiện cùng cả một nhánh tài nguyên phụ mới.","unlocks":{"buildings":["Dark Barracks","Dark Elixir Drill","Dark Elixir Storage","Hero Hall"],"defenses":["Hidden Tesla"],"traps":["Seeking Air Mine"],"troops":["Dragon","Hog Rider","Minion"],"spells":["Rage Spell"],"heroes":["Barbarian King"]}},{"level":8,"title":"Archer Queen & Blacksmith","blurb":"Hero thứ hai và hệ thống trang bị hero (Blacksmith) bắt đầu từ đây.","unlocks":{"buildings":["Blacksmith","Dark Spell Factory"],"defenses":["Bomb Tower"],"traps":["Skeleton Trap"],"troops":["Golem","P.E.K.K.A","Valkyrie"],"spells":["Earthquake Spell","Poison Spell"],"heroes":["Archer Queen"]}},{"level":9,"title":"Minion Prince & X-Bow","blurb":"Hero thứ ba cùng loạt phép hỗ trợ chiến thuật (Freeze, Haste, Jump).","unlocks":{"defenses":["X-Bow"],"troops":["Baby Dragon","Lava Hound","Witch"],"spells":["Freeze Spell","Haste Spell","Jump Spell","Skeleton Spell"],"heroes":["Minion Prince"]}},{"level":10,"title":"Inferno","blurb":"Inferno Tower là bước ngoặt phòng thủ — bắt đầu kỷ nguyên phòng thủ khó nhằn.","unlocks":{"defenses":["Inferno Tower"],"troops":["Bowler","Miner"],"spells":["Bat Spell","Clone Spell"]}},{"level":11,"title":"Grand Warden","blurb":"Hero hỗ trợ đầu tiên (buff/debuff theo vùng) cùng Eagle Artillery.","unlocks":{"defenses":["Eagle Artillery"],"traps":["Tornado Trap"],"troops":["Electro Dragon","Ice Golem"],"spells":["Invisibility Spell"],"heroes":["Grand Warden"]}},{"level":12,"title":"Siege Workshop","blurb":"Máy công thành (siege machine) đầu tiên — thay đổi cách donate và mở đường.","unlocks":{"buildings":["Workshop"],"troops":["Yeti","Headhunter"],"spells":["Overgrowth Spell"],"siege":["Wall Wrecker","Battle Blimp","Stone Slammer"]}},{"level":13,"title":"Royal Champion","blurb":"Hero cận chiến tầm xa thứ tư, thêm 2 máy công thành mới.","unlocks":{"defenses":["Scattershot"],"troops":["Dragon Rider","Apprentice Warden"],"spells":["Recall Spell"],"siege":["Log Launcher","Siege Barracks"],"heroes":["Royal Champion"]}},{"level":14,"title":"Hero Pets","blurb":"Pet House mở khóa 4 pet đầu tiên để ghép cùng hero.","unlocks":{"buildings":["Pet House"],"troops":["Druid","Electro Titan"],"spells":["Ice Block Spell"],"siege":["Flame Flinger"],"pets":["L.A.S.S.I","Electro Owl","Mighty Yak","Unicorn"],"note":"Builder's Hut cũng nâng lên cấp 4 ở TH này."}},{"level":15,"title":"Monolith","blurb":"Hero thứ năm (Dragon Duke) cùng 2 phòng thủ mới và 4 pet tiếp theo.","unlocks":{"defenses":["Monolith","Spell Tower"],"troops":["Root Rider","Furnace"],"spells":["Revive Spell"],"siege":["Battle Drill"],"heroes":["Dragon Duke"],"pets":["Diggy","Frosty","Phoenix","Poison Lizard"]}},{"level":16,"title":"Merged Defenses","blurb":"Cơ chế ghép phòng thủ cũ thành phòng thủ mới — cần thiết kế lại layout.","unlocks":{"defenses":["Multi-Archer Tower","Ricochet Cannon"],"troops":["Ruin Witch","Thrower"],"siege":["Troop Launcher"],"pets":["Angry Jelly","Spirit Fox"],"note":"Multi-Archer Tower/Ricochet Cannon được ghép từ các phòng thủ cấp thấp hơn, không xây mới hoàn toàn."}},{"level":17,"title":"Inferno Artillery","blurb":"Thêm phòng thủ hướng bắn thủ công và máy công thành mới.","unlocks":{"buildings":["Multi-Gear Tower"],"defenses":["Firespitter"],"traps":["Giga Bomb"],"siege":["Sky Wagon"],"pets":["Sneezy"],"note":"Ruin Witch cũng nâng lên cấp 3 ở TH này."}},{"level":18,"title":"Guardians","blurb":"Hệ thống Guardian và phòng thủ cấp cao nhất hiện tại — TH tối đa.","unlocks":{"buildings":["Crafting Station","Revenge Tower","Super Wizard Tower"],"guardians":["Logger","Longshot","Smasher"],"pets":["Greedy Raven"],"note":"Guardian là hệ thống cấu hình theo chiến thuật, không phải công trình nâng cấp tuyến tính."}}];

const ASSETS = "https://assets.colinschmale.dev/warreport";
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
const RESCAN_PAGES = ["https://coc.guide/defense","https://coc.guide/resource","https://coc.guide/army","https://coc.guide/trap"];
const isBuildingKind = k => k==="building"||k==="defense"||k==="trap"||k==="wall";

// --- Bảng chi phí/thời gian nâng cấp thật (tùy chọn, cờ --levels) -------
// coc.guide có trang chi tiết riêng cho từng item với bảng đầy đủ cấp độ
// (level, chi phí, thời gian, yêu cầu Town Hall/Laboratory). URL trang chi
// tiết dùng CÙNG 1 "slug" với tên file ảnh (đã xác minh: /defense/cannon,
// /trap/mine, /army/troop-housing, /troop/barbarian, /spell/lighningstorm
// đều là URL thật, test trực tiếp thành công). Với công trình/phòng
// thủ/bẫy, suy ra slug + category trực tiếp từ COC_GUIDE_BUILDING_ART.
// Với quân/phép/máy công thành, coc.guide dùng slug nội bộ khác hẳn tên
// hiển thị (vd Lightning Spell -> "lighningstorm", Wall Wrecker ->
// "siege-machine-ram") nên phải liệt kê tay bảng ánh xạ dưới đây — chỉ
// liệt được các item đã xác minh có mặt trên coc.guide; item quá mới thì
// bỏ qua (giữ nguyên số liệu ước tính có sẵn trong upgradeData.ts).
const TROOP_SLUGS = {
  "Barbarian":"barbarian","Archer":"archer","Giant":"giant","Goblin":"goblin","Wall Breaker":"wall-breaker",
  "Balloon":"balloon","Wizard":"wizard","Healer":"healer","Dragon":"dragon","P.E.K.K.A":"pekka",
  "Baby Dragon":"babydragon","Miner":"miner","Electro Dragon":"electro-dragon","Yeti":"yeti",
  "Dragon Rider":"dragon-rider","Electro Titan":"electro-titan","Root Rider":"root-rider",
  "Minion":"gargoyle","Hog Rider":"boar-rider","Valkyrie":"warrior-girl","Golem":"golem","Witch":"warlock",
  "Lava Hound":"airdefenceseeker","Bowler":"bowler","Ice Golem":"ice-golem","Headhunter":"headhunter",
  "Wall Wrecker":"siege-machine-ram","Battle Blimp":"siege-machine-flyer","Stone Slammer":"siege-bowler-balloon",
  "Siege Barracks":"siege-machine-carrier","Log Launcher":"siege-log-launcher","Flame Flinger":"siege-catapult",
  "Battle Drill":"battle-drill"
  // Không có trên coc.guide tại thời điểm nghiên cứu (quá mới): Druid,
  // Furnace, Ruin Witch, Thrower, Meteor Golem, Apprentice Warden,
  // Troop Launcher, Sky Wagon — các item này giữ số liệu ước tính cũ.
};
const SPELL_SLUGS = {
  "Lightning Spell":"lighningstorm","Healing Spell":"healingwave","Rage Spell":"haste","Jump Spell":"jump",
  "Freeze Spell":"freeze","Clone Spell":"duplicate","Invisibility Spell":"invisibility","Recall Spell":"recall",
  "Revive Spell":"revive","Poison Spell":"poison","Earthquake Spell":"earthquake","Haste Spell":"speedup",
  "Skeleton Spell":"spawnskele","Bat Spell":"spawnbats","Overgrowth Spell":"overgrowth"
  // Không có trên coc.guide: Totem Spell (quá mới).
};
function buildingDetailUrl(item){
  const p = COC_GUIDE_BUILDING_ART[item.id];
  if(!p) return null;
  const m = p.match(/^\/static\/imgs\/([a-z0-9]+)\/(.+?)(?:-\d+)?\.(?:png|webp)$/i);
  if(!m) return null;
  return `https://coc.guide/${m[1]}/${m[2]}`;
}
function detailUrlFor(item){
  if(isBuildingKind(item.kind)) return buildingDetailUrl(item);
  if(item.kind==="troop"||item.kind==="siege"){ const s=TROOP_SLUGS[item.name]; return s?`https://coc.guide/troop/${s}`:null; }
  if(item.kind==="spell"){ const s=SPELL_SLUGS[item.name]; return s?`https://coc.guide/spell/${s}`:null; }
  return null; // hero/equipment/pet: chưa đủ dữ liệu slug xác minh, bỏ qua ở bản này
}

function decodeEntities(s){
  return s.replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"');
}
function cellText(cellHtml){
  const altMatch = cellHtml.match(/<img[^>]*alt="([^"]*)"[^>]*>/i);
  if(altMatch && altMatch[1].trim()) return decodeEntities(altMatch[1].trim());
  return decodeEntities(cellHtml.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
}
// Parser bảng HTML tổng quát — không phụ thuộc class/id cụ thể (mình
// không lấy được HTML gốc để soi tận mắt từ môi trường sandbox, chỉ xác
// minh qua nội dung đã render), nên cố tình viết khoan dung: chỉ dựa vào
// cấu trúc thẻ <table><tr><td|th> chuẩn HTML, không cần biết tên class.
function parseFirstTable(html){
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if(!tableMatch) return null;
  const rowMatches = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const rows = rowMatches.map(rm => [...rm[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cm => cellText(cm[1])));
  return rows.filter(r => r.length);
}
function parseCost(s){
  if(!s) return null;
  if(/none|instant|^-$/i.test(s.trim())) return 0;
  const n = Number(s.replace(/[^0-9.]/g,""));
  return Number.isFinite(n) ? n : null;
}
function parseTimeToHours(s){
  if(!s) return null;
  if(/none|instant|^-$/i.test(s.trim())) return 0;
  let hours = 0, matched = false;
  const d = s.match(/(\d+)\s*d/i); if(d){ hours += Number(d[1])*24; matched = true; }
  const h = s.match(/(\d+)\s*h/i); if(h){ hours += Number(h[1]); matched = true; }
  const m = s.match(/(\d+)\s*m(?!s)/i); if(m){ hours += Number(m[1])/60; matched = true; }
  if(!matched){ const sec = s.match(/(\d+)\s*s/i); if(sec){ hours += Number(sec[1])/3600; matched = true; } }
  return matched ? Math.round(hours*1000)/1000 : null;
}
function normalizeResource(label){
  if(!label) return null;
  if(/dark/i.test(label)) return "Dark Elixir";
  if(/elixir/i.test(label)) return "Elixir";
  if(/gold/i.test(label)) return "Gold";
  return null;
}

async function fetchLevelRows(item){
  const url = detailUrlFor(item);
  if(!url) return { id:item.id, skipped:"chưa có URL trang chi tiết xác minh cho item này" };
  try{
    const res = await fetch(url);
    if(!res.ok) return { id:item.id, url, error:`HTTP ${res.status}` };
    const html = await res.text();
    const table = parseFirstTable(html);
    if(!table || table.length<2) return { id:item.id, url, error:"không tìm thấy bảng cấp độ trên trang" };
    const [header, ...dataRows] = table;
    const n = header.length;
    if(n<5) return { id:item.id, url, error:`bảng chỉ có ${n} cột, không đủ để suy ra chi phí/thời gian (cần tối thiểu 5, cột đầu là Level)` };
    const costIdx=n-4, timeIdx=n-3, reqIdx=n-1;
    const resourceLabel = normalizeResource(header[costIdx]);
    const reqIsTownHall = /^th$/i.test(header[reqIdx]) || /town ?hall/i.test(header[reqIdx]);
    const reqIsLab = /laboratory|lab level/i.test(header[reqIdx]);
    const rows = [];
    for(const row of dataRows){
      const level = Number(row[0]);
      if(!Number.isFinite(level) || level<2) continue; // level 1 là mốc gốc, không phải chi phí nâng cấp
      const cost = parseCost(row[costIdx]);
      const timeHours = parseTimeToHours(row[timeIdx]);
      if(cost==null || timeHours==null) continue;
      const entry = { level, cost, timeHours };
      if(resourceLabel) entry.resource = resourceLabel;
      if(reqIsTownHall){ const th = Number(row[reqIdx]); if(Number.isFinite(th)) entry.townHall = th; }
      else if(reqIsLab){ const lab = Number(row[reqIdx]); if(Number.isFinite(lab)) entry.labLevel = lab; }
      rows.push(entry);
    }
    if(rows.length<2) return { id:item.id, url, error:"parse ra được bảng nhưng dữ liệu số quá ít, có thể sai cấu trúc cột" };
    return { id:item.id, url, rows };
  }catch(err){
    return { id:item.id, url, error:String(err.message||err) };
  }
}

async function buildLevels(){
  const entries = MANIFEST.filter(i => detailUrlFor(i));
  const levels = {};
  const problems = [];
  console.log(`Đang cào bảng cấp độ thật cho ${entries.length}/${MANIFEST.length-1} item có URL xác minh (bỏ qua hero/trang bị/pet/quân-phép quá mới — xem comment trong scrape.mjs)...\n`);
  const CONCURRENCY = 4; // đi chậm, lịch sự với coc.guide vì phải gọi ~1 request/item
  let i = 0;
  async function worker(){
    while(i < entries.length){
      const item = entries[i++];
      const result = await fetchLevelRows(item);
      if(result.rows){
        levels[item.id] = result.rows;
        console.log(`  ✔ ${item.id}: ${result.rows.length} cấp (vd cấp ${result.rows[0].level} → ${result.rows[0].cost} ${result.rows[0].resource||""})`);
      } else {
        problems.push(result);
        console.log(`  ✘ ${item.id}: ${result.error||result.skipped}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { levels, problems };
}

async function checkUrl(url){
  try{
    let res = await fetch(url, { method: "HEAD" });
    if(res.status === 405 || res.status === 501) res = await fetch(url, { method: "GET" });
    return res.ok;
  }catch{
    return false;
  }
}

async function buildImages(){
  const isIncremental = process.argv.includes("--incremental");
  let existingImages = {};
  if (isIncremental) {
    try {
      const fs = await import("fs/promises");
      const existing = await fs.readFile(path.join(DATA_DIR, "images.json"), "utf8");
      existingImages = JSON.parse(existing);
    } catch(e) {
      // Ignore if file doesn't exist
    }
  }

  const images = {};
  const failures = [];
  const entries = MANIFEST.filter(i => i.id !== "town-hall");
  const CONCURRENCY = 8;
  let i = 0;
  async function worker(){
    while(i < entries.length){
      const item = entries[i++];
      let url;
      if(isBuildingKind(item.kind)){
        const p = COC_GUIDE_BUILDING_ART[item.id];
        url = p ? `https://coc.guide${p}` : null;
      } else {
        const folder = item.kind === "hero" ? "heroes" : item.kind === "spell" ? "spells" : item.kind === "equipment" ? "heroes/equipment" : "troops";
        url = `${ASSETS}/${folder}/${encodeURIComponent(item.name)}.webp`;
      }
      if(!url){ failures.push({ id: item.id, reason: "chưa có URL nguồn nào cho item này" }); continue; }
      images[item.id] = url;
      
      // Skip network check if incremental and URL hasn't changed
      if (isIncremental && existingImages[item.id] === url) {
        continue;
      }

      const ok = await checkUrl(url);
      if(!ok) failures.push({ id: item.id, url, reason: "link không phản hồi 200 (có thể đã đổi/gãy)" });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { images, failures };
}

async function rescanForNewImages(){
  const known = new Set(Object.values(COC_GUIDE_BUILDING_ART).map(p => `https://coc.guide${p}`));
  const found = new Set();
  for(const page of RESCAN_PAGES){
    try{
      const res = await fetch(page);
      if(!res.ok) continue;
      const html = await res.text();
      const re = /https:\/\/coc\.guide\/static\/imgs\/[a-zA-Z0-9_\-\/.]+\.(?:png|webp|jpg)/g;
      const matches = html.match(re) || [];
      for(const m of matches){ if(!known.has(m)) found.add(m); }
    }catch{
      // bỏ qua trang lỗi, không chặn toàn bộ script
    }
  }
  return [...found];
}

async function main(){
  const wantLevels = process.argv.includes("--levels");

  console.log("Đang kiểm tra/tính toán URL ảnh cho", MANIFEST.length - 1, "item...\n");
  const { images, failures } = await buildImages();

  console.log("Đang quét lại các trang coc.guide để tìm ảnh MỚI chưa có trong bảng (best-effort)...\n");
  const newCandidates = await rescanForNewImages();

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "images.json"), JSON.stringify(images, null, 2));
  await writeFile(path.join(DATA_DIR, "catalog.json"), JSON.stringify(MANIFEST, null, 2));
  await writeFile(path.join(DATA_DIR, "townhalls.json"), JSON.stringify(TOWNHALLS, null, 2));

  console.log(`Đã ghi data/images.json (${Object.keys(images).length} item), data/catalog.json (${MANIFEST.length} item), data/townhalls.json (${TOWNHALLS.length} mốc TH).\n`);

  if(failures.length){
    console.log(`${failures.length} link có thể có vấn đề (app vẫn chạy được, các item này chỉ rớt xuống icon minh họa):`);
    for(const f of failures) console.log(`  - ${f.id}: ${f.reason}${f.url ? " ("+f.url+")" : ""}`);
    console.log("");
  }

  if(newCandidates.length){
    console.log(`Phát hiện ${newCandidates.length} ảnh MỚI trên coc.guide chưa có trong bảng id->url (coi thử xem có công trình/phòng thủ/bẫy nào mới không, rồi tự thêm vào COC_GUIDE_BUILDING_ART trong scrape.mjs nếu đúng):`);
    for(const u of newCandidates) console.log("  - " + u);
  } else {
    console.log("Không phát hiện ảnh mới nào ngoài bảng đã biết.");
  }

  if(!wantLevels){
    console.log("\n(Chưa cào bảng chi phí/thời gian nâng cấp thật — chạy `node scrape.mjs --levels` để làm luôn, chậm hơn vì phải gọi ~100 trang chi tiết. Đây là phần THỬ NGHIỆM, xem cảnh báo trong README.txt trước khi tin số liệu 100%.)");
    return;
  }

  console.log("\n--- Cào bảng chi phí/thời gian nâng cấp thật (--levels) ---\n");
  const { levels, problems } = await buildLevels();
  await writeFile(path.join(DATA_DIR, "levels.json"), JSON.stringify(levels, null, 2));
  console.log(`\nĐã ghi data/levels.json (${Object.keys(levels).length}/${MANIFEST.filter(i=>detailUrlFor(i)).length} item cào được).`);
  if(problems.length){
    console.log(`\n${problems.length} item không cào được (giữ nguyên số liệu ước tính cũ trong upgradeData.ts):`);
    for(const p of problems) console.log(`  - ${p.id}: ${p.error||p.skipped}`);
  }
  console.log("\nLƯU Ý: phần này đọc trực tiếp HTML của coc.guide bằng parser tự viết (không");
  console.log("dùng thư viện ngoài), mình KHÔNG có cách xem trực tiếp HTML gốc của trang từ");
  console.log("môi trường hiện tại để kiểm chứng 100% — hãy mở vài dòng trong data/levels.json,");
  console.log("so với trang coc.guide tương ứng (hoặc số liệu bạn biết trong game) trước khi tin");
  console.log("dùng để lập kế hoạch tài nguyên thật.");
}

main();
