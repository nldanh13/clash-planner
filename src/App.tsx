import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bomb, Castle, Check, ClipboardPaste, Coins, Crosshair,
  Clock3, Crown, Droplet, Flame, FlaskConical, Gem, Hammer, Info, LayoutGrid, LoaderCircle, Lock, Moon, PawPrint, RefreshCw,
  Search, ShieldCheck, Skull, Sparkles, Swords, Target, Tent, Trophy, Truck, Users, Wind, Wrench, Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Player } from "./types";
import { type TownHallInfo, type TownHallUnlocks, townHallInfo as townHallInfoDefault } from "./townHallData";
import { type DataStatus, type Resource, type UpgradeItem, type UpgradeLane, upgradeItems, upgradeSources } from "./upgradeData";
import { villageDataIdMap } from "./villageDataMap";
import { BasePlannerTab } from "./components/BasePlannerTab";

export type Tab = "overview" | "planner" | "roadmap" | "base-planner";

type VillagePasteChange = { id:string; name:string; kind:UpgradeItem["kind"]; before:number; after:number };

type VillagePasteData = { levels:Map<number,number>; builderBaseIds:Set<number>; total:number };
type VillagePasteReport = {
  error?:string;
  changes?:VillagePasteChange[];
  total?:number;
  recognized?:number;
  updated?:number;
  unchanged?:number;
  wallSkipped?:number;
  builderBaseSkipped?:number;
  unsupportedSkipped?:number;
};

function clampInteger(value:unknown,min:number,max:number,fallback=min){
  const parsed=typeof value==="number"?value:Number(value);
  if(!Number.isFinite(parsed))return fallback;
  return Math.max(min,Math.min(max,Math.trunc(parsed)));
}

function readStoredRecord<T>(key:string):Record<string,T>{
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||"{}");
    if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))return parsed as Record<string,T>;
  }catch{
    // Xóa dữ liệu hỏng để các lần mở sau không tiếp tục đọc lại cùng lỗi.
  }
  localStorage.removeItem(key);
  return {};
}

function extractDataLevels(raw:string):VillagePasteData{
  const start=raw.indexOf("{"),end=raw.lastIndexOf("}");
  if(start===-1||end===-1||end<=start)throw new Error("Không tìm thấy dữ liệu JSON hợp lệ trong nội dung đã dán.");
  let parsed:unknown;
  try{parsed=JSON.parse(raw.slice(start,end+1))}
  catch{throw new Error("Dữ liệu dán vào không phải JSON hợp lệ. Hãy dán đúng nội dung đã Copy ở Cài đặt > More Settings > Data Export trong game.")}
  const levels=new Map<number,number>();
  const builderBaseIds=new Set<number>();
  let total=0;
  const walk=(node:unknown,path:string[])=>{
    if(Array.isArray(node)){for(const child of node)walk(child,path);return}
    if(node&&typeof node==="object"){
      const obj=node as Record<string,unknown>;
      if(typeof obj.data==="number"&&Number.isFinite(obj.data)&&typeof obj.lvl==="number"&&Number.isFinite(obj.lvl)){
        total++;
        const dataId=Math.trunc(obj.data),level=Math.max(0,Math.trunc(obj.lvl));
        const isBuilderBase=path.some(key=>/builder.?base/i.test(key)||/^(buildings|traps|obstacles|decorations|decos)2$/i.test(key));
        if(isBuilderBase)builderBaseIds.add(dataId);
        else{
          const prev=levels.get(dataId);
          // Nhiều công trình cùng loại có thể khác cấp; giữ cấp thấp nhất để
          // planner không đánh giá làng cao hơn tình trạng thực tế.
          if(prev===undefined||level<prev)levels.set(dataId,level);
        }
      }
      for(const key of Object.keys(obj))walk(obj[key],[...path,key]);
    }
  };
  walk(parsed,[]);
  return {levels,builderBaseIds,total};
}

const ASSETS="https://assets.colinschmale.dev/warreport";
const thImage=(th:number)=>`/town-halls/th-${Math.max(1,Math.min(18,th))}.png`;

// --- "Cơ sở dữ liệu" từ coc-admin ------------------------------------
// coc-admin (project riêng, xem coc-admin/README.txt) tự động lấy dữ liệu
// thật (ảnh, roadmap TH1-18) và ghi ra nhiều file JSON trong data/, copy
// vào public/data/ của web app này. App fetch các file đó lúc chạy — đây
// là nguồn dữ liệu ƯU TIÊN. Các hằng số/công thức bên dưới (cocGuideBuildingArt,
// ASSETS...) chỉ còn vai trò dự phòng khi chưa có/không tải được file JSON,
// để app không bao giờ vỡ hoàn toàn dù thiếu dữ liệu.
let imageDb:Record<string,string>={};
let townHallDb:TownHallInfo[]|null=null;
// Bảng cấp độ THẬT do coc-admin/scrape.mjs --levels cào từ coc.guide (chi
// phí, thời gian, TH/Laboratory yêu cầu từng cấp) — chỉ có cho công
// trình/phòng thủ/bẫy và một phần quân/phép đã xác minh URL (xem comment
// trong scrape.mjs). File data/levels.json là tùy chọn: nếu chưa chạy
// scrape.mjs --levels hoặc chưa copy file này vào public/data/, app vẫn
// chạy bình thường với số liệu ước tính có sẵn trong upgradeData.ts.
type ScrapedLevelRow={level:number;cost:number;timeHours:number;resource?:Resource;townHall?:number;labLevel?:number};
function mergeScrapedLevels(levelsDb:Record<string,ScrapedLevelRow[]>){
  for(const item of upgradeItems){
    const scraped=levelsDb[item.id];
    if(!scraped||!scraped.length)continue;
    const byLevel=new Map(item.levels.map(l=>[l.level,l]));
    for(const row of scraped){
      const existing=byLevel.get(row.level);
      if(existing){
        existing.cost=row.cost;
        existing.timeHours=row.timeHours;
        if(row.resource)existing.resource=row.resource;
        if(row.townHall!=null)existing.townHall=row.townHall;
      }else{
        byLevel.set(row.level,{
          level:row.level,
          townHall:row.townHall??item.levels.at(-1)?.townHall??item.unlockTownHall,
          cost:row.cost,
          resource:row.resource??item.levels[0]?.resource??"Gold",
          timeHours:row.timeHours
        });
      }
    }
    item.levels=[...byLevel.values()].sort((a,b)=>a.level-b.level);
    item.dataStatus="exact";
    item.source="Cào tự động từ coc.guide qua coc-admin/scrape.mjs --levels";
  }
}
function useGameDatabase(onLoaded:()=>void){
  useEffect(()=>{
    let cancelled=false;
    Promise.all([
      fetch("/data/images.json").then(r=>r.ok?r.json():null).catch(()=>null),
      fetch("/data/townhalls.json").then(r=>r.ok?r.json():null).catch(()=>null),
      fetch("/data/levels.json").then(r=>r.ok?r.json():null).catch(()=>null)
    ]).then(([images,townhalls,levelsDb])=>{
      if(cancelled)return;
      if(images&&typeof images==="object")imageDb=images;
      if(Array.isArray(townhalls)&&townhalls.length)townHallDb=townhalls;
      if(levelsDb&&typeof levelsDb==="object")mergeScrapedLevels(levelsDb);
      onLoaded();
    });
    return ()=>{cancelled=true};
  },[]);
}
// Ảnh thật cho công trình/phòng thủ/bẫy — đường dẫn xác minh trực tiếp từ
// coc.guide (trang dữ liệu lấy từ file game gốc, không phải suy đoán tên
// file như trước). Dùng làm tầng "remote" dự phòng khi data/images.json
// chưa tải xong hoặc không có entry cho item đó; script coc-admin/scrape.mjs
// và scripts/download-images.mjs tự tải toàn bộ danh sách này về máy để
// dùng làm tầng "local" (ưu tiên cao nhất, không phụ thuộc mạng ngoài).
const cocGuideBuildingArt: Record<string,string> = {
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
// Thư mục local tương ứng từng loại item — khớp đúng với thư mục mà
// scripts/download-images.mjs lưu file vào, và với public/buildings có sẵn.
const localFolder=(kind:UpgradeItem["kind"]):string=>{
  if(kind==="hero")return "heroes";
  if(kind==="troop"||kind==="siege")return "troops";
  if(kind==="spell")return "spells";
  if(kind==="equipment")return "equipment";
  if(kind==="pet")return "pets";
  return "buildings"; // building | defense | trap | wall
};
const localExt=(kind:UpgradeItem["kind"])=>kind==="building"||kind==="defense"||kind==="trap"||kind==="wall"?"png":"webp";
const localArt=(item:UpgradeItem,townHallLevel?:number)=>item.id==="town-hall"?thImage(townHallLevel??item.levels.at(-1)?.level??1):`/${localFolder(item.kind)}/${item.id}.${localExt(item.kind)}`;
const remoteArt=(item:UpgradeItem,townHallLevel?:number):string|null=>{
  if(item.id==="town-hall")return thImage(townHallLevel??item.levels.at(-1)?.level??1); // đã có sẵn local theo từng cấp, không cần tầng remote riêng
  if(imageDb[item.id])return imageDb[item.id]; // từ data/images.json (coc-admin) — ưu tiên trước mặc định trong code
  if(item.kind==="building"||item.kind==="defense"||item.kind==="trap"||item.kind==="wall"){
    const path=cocGuideBuildingArt[item.id];
    return path?`https://coc.guide${path}`:null;
  }
  const folder=item.kind==="hero"?"heroes":item.kind==="spell"?"spells":item.kind==="equipment"?"heroes/equipment":"troops";
  return `${ASSETS}/${folder}/${encodeURIComponent(item.name)}.webp`;
};
// Icon minh họa riêng cho từng công trình/phòng thủ/bẫy khi chưa có ảnh thật,
// để bảng nhìn đa dạng hơn thay vì dùng chung 1 icon cho cả nhóm.
const buildingIconById:Record<string,LucideIcon>={
  "army-camp":Tent,"elixir-collector":Droplet,"elixir-storage":Droplet,"gold-mine":Coins,"gold-storage":Coins,
  "dark-elixir-drill":Moon,"dark-elixir-storage":Moon,"barracks":Swords,"dark-barracks":Swords,
  "spell-factory":Sparkles,"dark-spell-factory":Sparkles,"laboratory":FlaskConical,"clan-castle":Castle,
  "blacksmith":Hammer,"workshop":Wrench,"pet-house":PawPrint,
  "builder-hut":Hammer,"cannon":Target,"archer-tower":Crosshair,"mortar":Target,"air-defense":Wind,
  "wizard-tower":Sparkles,"air-sweeper":Wind,"hidden-tesla":Zap,"xbow":Crosshair,"inferno-tower":Flame,
  "eagle-artillery":Crosshair,"scattershot":Target,"monolith":Gem,"spell-tower":Sparkles,
  "multi-archer-tower":Crosshair,"ricochet-cannon":Target,"firespitter":Flame,
  "bomb":Bomb,"spring-trap":Zap,"air-bomb":Wind,"giant-bomb":Bomb,"seeking-air-mine":Crosshair,
  "skeleton-trap":Skull,"tornado-trap":Wind,"giga-bomb":Bomb
};
// Icon dự phòng theo loại (dùng khi cả local lẫn remote đều không có ảnh).
const kindIcon:Record<UpgradeItem["kind"],LucideIcon>={
  building:Hammer,defense:ShieldCheck,trap:Target,wall:ShieldCheck,hero:Crown,troop:Swords,spell:Sparkles,siege:Truck,equipment:ShieldCheck,pet:PawPrint
};
// Ảnh cho mọi loại item (công trình lẫn quân/hero/phép/trang bị/pet) — 3
// tầng ưu tiên giống nhau cho tất cả: (1) file local trong public/<thư
// mục>/<id>.png — tự tải bằng scripts/download-images.mjs hoặc tự bỏ ảnh
// vào, không phụ thuộc mạng ngoài khi app chạy; (2) hotlink remote đã xác
// minh (coc.guide cho công trình, assets.colinschmale.dev cho phần còn
// lại) — chỉ dùng tạm khi chưa chạy script tải ảnh; (3) icon minh họa,
// luôn có nên không bao giờ vỡ layout.
function SmartArt({item,size,townHallLevel}:{item:UpgradeItem;size?:"sm";townHallLevel?:number}){
  const [stage,setStage]=useState<"local"|"remote"|"icon">("local");
  const remote=remoteArt(item,townHallLevel);
  const Icon=buildingIconById[item.id]||kindIcon[item.kind]||Hammer;
  const cls=`upgrade-icon ${item.kind}${size==="sm"?" sm":""}`;
  if(stage==="icon"||(stage==="remote"&&!remote))return <span className={cls}><Icon/></span>;
  const src=stage==="local"?localArt(item,townHallLevel):(remote as string);
  return <img className={`upgrade-art${size==="sm"?" sm":""}`} src={src} alt={item.name} onError={()=>setStage(stage==="local"?(remote?"remote":"icon"):"icon")}/>;
}
const normalizeTag=(value:string)=>{
  const cleaned=value.toUpperCase().replace(/\s/g,"").replace(/^%23/,"#");
  return cleaned.startsWith("#")?cleaned:`#${cleaned}`;
};
const pct=(items:{level:number;maxLevel:number}[])=>items.length?Math.round(items.reduce((s,x)=>s+x.level/x.maxLevel,0)/items.length*100):0;
const fmtNumber=(value:number)=>new Intl.NumberFormat("vi-VN").format(Math.round(value));
const fmtTime=(hours:number)=>{
  if(hours<=0)return "Không tốn thời gian";
  const days=Math.floor(hours/24),rest=Math.round(hours%24);
  if(days&&rest)return `${days} ngày ${rest} giờ`;
  if(days)return `${days} ngày`;
  return `${rest} giờ`;
};
const fmtCost=(costs:Partial<Record<Resource,number>>)=>Object.entries(costs).filter(([,v])=>(v||0)>0).map(([k,v])=>`${fmtNumber(v||0)} ${k}`).join(" · ")||"0";
const emptyCosts=()=>({} as Partial<Record<Resource,number>>);
const addCosts=(target:Partial<Record<Resource,number>>,source:Partial<Record<Resource,number>>,factor=1)=>{
  for(const [resource,value] of Object.entries(source))target[resource as Resource]=(target[resource as Resource]||0)+(value||0)*factor;
};
// Icon nhỏ theo từng loại tài nguyên — dùng ở khu vực "chi phí" của Upgrade
// Tracker để nhận ra ngay là Vàng/Elixir/Dark Elixir/loại quặng nào, đỡ phải
// đọc chữ mỗi lần như trước.
const resourceIcon:Record<Resource,LucideIcon>={
  Gold:Coins,Elixir:Droplet,"Dark Elixir":Moon,
  "Shiny Ore":Gem,"Glowy Ore":Sparkles,"Starry Ore":Zap
};
const resourceClass:Record<Resource,string>={
  Gold:"res-gold",Elixir:"res-elixir","Dark Elixir":"res-dark",
  "Shiny Ore":"res-shiny","Glowy Ore":"res-glowy","Starry Ore":"res-starry"
};
function CostBadges({costs}:{costs:Partial<Record<Resource,number>>}){
  const entries=(Object.entries(costs) as [Resource,number][]).filter(([,v])=>(v||0)>0);
  if(!entries.length)return <span className="cost-badges"><span className="cost-badge">0</span></span>;
  return <span className="cost-badges">{entries.map(([resource,value])=>{
    const Icon=resourceIcon[resource];
    return <span className={`cost-badge ${resourceClass[resource]}`} key={resource}><Icon/>{fmtNumber(value||0)}</span>;
  })}</span>;
}
const itemKindLabel:Record<UpgradeItem["kind"],string>={
  building:"Công trình",
  defense:"Phòng thủ",
  trap:"Bẫy",
  wall:"Tường",
  hero:"Tướng",
  troop:"Quân",
  spell:"Phép",
  siege:"Máy công thành",
  equipment:"Trang bị",
  pet:"Pet"
};
const dataStatusLabel:Record<DataStatus,string>={
  exact:"Chính xác",
  estimated:"Ước tính",
  unchecked:"Chưa kiểm"
};
const dataStatusDetail:Record<DataStatus,string>={
  exact:"Có thể dùng để tính kế hoạch.",
  estimated:"Dùng để lập khung, cần thay bằng số liệu thật.",
  unchecked:"Không đưa vào tính tổng mặc định."
};
// Thứ tự duyệt qua từng "nhân tố" cho Upgrade Tracker — cùng nhóm loại với
// itemKindLabel, xếp theo thứ tự người chơi thường quan tâm (công trình nền
// tảng trước, phòng thủ/bẫy, rồi tới quân đội).
const trackerKindOrder:UpgradeItem["kind"][]=["building","defense","trap","hero","troop","spell","siege","equipment","pet"];
// Hero/trang bị có thể tới cả trăm cấp (Barbarian King max level 100) — nếu
// hiện hết luôn trong bảng chi tiết từng cấp thì trang dài vô lý, nên chỉ
// hiện trước một ít cấp gần nhất, có nút "Xem thêm" để mở hết khi cần.
const LEVEL_TABLE_PREVIEW=15;

// --- Gợi ý theo lối chơi: phân loại quân/phòng thủ theo mặt đất/trên không ---
// Đối chiếu từ Clash of Clans Fandom wiki (Category:Ground Troops và trang
// riêng từng công trình phòng thủ: Cannon, Air Defense, Mortar, X-Bow,
// Monolith, Spell Tower, Multi-Archer Tower, Ricochet Cannon, Firespitter).
// Quân bay: Balloon, Dragon, Baby Dragon, Electro Dragon, Dragon Rider,
// Minion, Lava Hound, Healer — toàn bộ quân còn lại trong danh sách hiện có
// đều di chuyển trên mặt đất.
export type Playstyle="rush"|"balanced"|"defense"|"rush-hall";
export type StyleFocus="ground"|"air"|"both";
const airTroopNames=new Set(["Balloon","Dragon","Baby Dragon","Electro Dragon","Dragon Rider","Minion","Lava Hound","Healer"]);
const attackStyleOfTroop=(item:UpgradeItem):"ground"|"air"|null=>item.kind==="troop"?(airTroopNames.has(item.name)?"air":"ground"):null;
// Phòng thủ/bẫy chỉ bắn mặt đất hoặc chỉ bắn trên không — phần còn lại (Archer
// Tower, Wizard Tower, Hidden Tesla, X-Bow*, Inferno Tower, Eagle Artillery,
// Scattershot, Monolith, Spell Tower, Multi-Archer Tower, Firespitter...) bắn
// được cả hai nên không cần liệt kê riêng. (*X-Bow mặc định bắn mặt đất
// nhưng có thể bật chế độ bắn cả trên không miễn phí trong game.)
const groundOnlyDefenseIds=new Set(["cannon","mortar","ricochet-cannon"]);
const airOnlyDefenseIds=new Set(["air-defense","air-sweeper"]);
const groundOnlyTrapIds=new Set(["bomb","spring-trap","giant-bomb","skeleton-trap","giga-bomb"]);
const airOnlyTrapIds=new Set(["air-bomb","seeking-air-mine","tornado-trap"]);
const defenseFocusOf=(item:UpgradeItem):"ground"|"air"|"both"|null=>{
  if(item.kind!=="defense"&&item.kind!=="trap")return null;
  if(groundOnlyDefenseIds.has(item.id)||groundOnlyTrapIds.has(item.id))return "ground";
  if(airOnlyDefenseIds.has(item.id)||airOnlyTrapIds.has(item.id))return "air";
  return "both";
};
// Nhân hệ số điểm ưu tiên (từ priorityFor) theo 4 lựa chọn lối chơi: tấn
// công trước, cân bằng, thủ chắc, hoặc rush hall (đẩy Town Hall bằng mọi
// giá) — cộng thêm phong cách tấn công và mối lo phòng thủ.
// "Cân bằng" + "Cả hai" + "Cả hai" (mặc định) giữ nguyên điểm gốc — không
// đổi hành vi so với trước khi có tính năng này.
function styleScoreFor(item:UpgradeItem,baseScore:number,playstyle:Playstyle,attackFocus:StyleFocus,defenseFocus:StyleFocus){
  let score=baseScore;
  const isArmyLane=item.kind==="hero"||item.kind==="troop"||item.kind==="spell"||item.kind==="siege"||item.kind==="equipment"||item.kind==="pet";
  const isDefenseLane=item.kind==="defense"||item.kind==="trap";
  if(playstyle==="rush"){if(isDefenseLane)score*=0.55;else if(isArmyLane)score*=1.3}
  if(playstyle==="defense"){if(isDefenseLane)score*=1.4;else if(isArmyLane)score*=0.8}
  // Rush Hall = chiến thuật đẩy cấp Town Hall thật nhanh: dồn hết vào Town
  // Hall + quân/hero/trang bị (để vẫn farm/đánh được), gần như bỏ qua phòng
  // thủ và bẫy — đối chiếu hướng dẫn rush 2026 (clashos.in): "Mortars,
  // Cannons, Bomb Towers... high weight/low value", còn quân farm (Sneaky
  // Goblins...), Lab/Army Camp và hero vẫn được xếp ưu tiên cao. Khác hẳn
  // "Tấn công trước" (vẫn nâng phòng thủ, chỉ ưu tiên quân hơn một chút).
  if(playstyle==="rush-hall"){
    if(item.id==="town-hall")score*=6;
    else if(isDefenseLane)score*=0.35;
    else if(isArmyLane)score*=1.15;
    else score*=0.9;
  }
  const troopSide=attackStyleOfTroop(item);
  if(troopSide&&attackFocus!=="both")score*=troopSide===attackFocus?1.25:0.7;
  const focus=defenseFocusOf(item);
  if(focus&&defenseFocus!=="both")score*=(focus==="both"||focus===defenseFocus)?1.25:0.7;
  return score;
}
// Lý do hiển thị cho từng gợi ý — Rush Hall có lý do riêng (ưu tiên tuyệt
// đối Town Hall), còn lại ưu tiên giải thích bám sát lựa chọn ground/air của
// người dùng, chỉ dùng lý do chung (priorityFor) khi không khớp.
function styleReasonFor(item:UpgradeItem,playstyle:Playstyle,attackFocus:StyleFocus,defenseFocus:StyleFocus):string|null{
  if(playstyle==="rush-hall"){
    if(item.id==="town-hall")return "Rush Hall: mục tiêu số 1, nâng trước để mở khóa Town Hall tiếp theo càng sớm càng tốt.";
    const isArmyLane=item.kind==="hero"||item.kind==="troop"||item.kind==="spell"||item.kind==="siege"||item.kind==="equipment"||item.kind==="pet";
    if(isArmyLane)return "Rush Hall: vẫn cần nâng vì đây là thứ giúp bạn farm/tấn công để có tài nguyên đẩy Town Hall.";
    if(item.kind==="defense"||item.kind==="trap")return "Rush Hall: gần như bỏ qua — phòng thủ không giúp bạn lên Town Hall nhanh hơn.";
  }
  const troopSide=attackStyleOfTroop(item);
  if(troopSide&&attackFocus!=="both"&&troopSide===attackFocus)return attackFocus==="ground"?"Quân mặt đất — đúng lối tấn công bạn chọn.":"Quân trên không — đúng lối tấn công bạn chọn.";
  const focus=defenseFocusOf(item);
  if(focus&&defenseFocus!=="both"&&(focus===defenseFocus||focus==="both"))return defenseFocus==="ground"?"Chặn tốt quân mặt đất — đúng mối lo phòng thủ bạn chọn.":"Chặn tốt quân trên không — đúng mối lo phòng thủ bạn chọn.";
  return null;
}
const playstyleValues:Playstyle[]=["rush","balanced","defense","rush-hall"];
const playstyleHint:Record<Playstyle,string>={
  rush:"Vẫn nâng đầy đủ quân/phòng thủ mỗi cấp, chỉ ưu tiên quân đội lên trước để farm/tấn công tốt hơn.",
  balanced:"Không thiên vị bên nào — giữ nguyên thứ tự ưu tiên mặc định của app.",
  defense:"Ưu tiên phòng thủ/bẫy trước, phù hợp nếu bạn hay bị mất cúp hoặc lo bị soi làng.",
  "rush-hall":"Đẩy Town Hall lên nhanh nhất có thể: vẫn nâng quân/hero/trang bị để farm, nhưng gần như bỏ qua phòng thủ và bẫy — chiến thuật Rush Hall kinh điển."
};
const styleFocusValues:StyleFocus[]=["ground","air","both"];
function readStoredChoice<T extends string>(key:string,allowed:T[],fallback:T):T{
  const raw=localStorage.getItem(key);
  return (allowed as string[]).includes(raw||"")?raw as T:fallback;
}
const plannerItems=upgradeItems.filter(item=>item.kind!=="wall"&&item.dataStatus!=="unchecked");
const byUnlock=(a:UpgradeItem,b:UpgradeItem)=>a.unlockTownHall-b.unlockTownHall||a.name.localeCompare(b.name);
const rosterHeroes=upgradeItems.filter(i=>i.kind==="hero").sort(byUnlock);
const rosterTroops=upgradeItems.filter(i=>i.kind==="troop").sort(byUnlock);
const rosterSpells=upgradeItems.filter(i=>i.kind==="spell").sort(byUnlock);
const rosterSiege=upgradeItems.filter(i=>i.kind==="siege").sort(byUnlock);
const rosterPets=upgradeItems.filter(i=>i.kind==="pet").sort(byUnlock);
// Gộp chung 1 lưới cho toàn bộ trang bị (thay vì 1 khối riêng mỗi hero) —
// sắp theo TH mở khóa hero rồi theo tên hero, mỗi thẻ tự hiện nhãn hero sở
// hữu (xem RosterCard) để vẫn phân biệt được mà không cần nhiều section.
const rosterEquipment=upgradeItems.filter(i=>i.kind==="equipment")
  .sort((a,b)=>a.unlockTownHall-b.unlockTownHall||(a.owner||"").localeCompare(b.owner||"")||a.name.localeCompare(b.name));
const unlockGroups:{key:keyof TownHallUnlocks;label:string;icon:LucideIcon}[]=[
  {key:"buildings",label:"Công trình mới",icon:Hammer},
  {key:"defenses",label:"Phòng thủ mới",icon:ShieldCheck},
  {key:"traps",label:"Bẫy mới",icon:Target},
  {key:"troops",label:"Quân mới",icon:Users},
  {key:"spells",label:"Phép mới",icon:FlaskConical},
  {key:"heroes",label:"Hero mới",icon:Crown},
  {key:"siege",label:"Máy công thành mới",icon:Truck},
  {key:"pets",label:"Pet mới",icon:PawPrint},
  {key:"guardians",label:"Guardian mới",icon:Sparkles}
];

function currentLevelFor(item:UpgradeItem,player:Player|null,manualLevels:Record<string,number>){
  if(item.id==="town-hall")return player?.townHallLevel||0;
  if(!item.apiTracked)return manualLevels[manualKey(player,item)]||0;
  if(!player)return 0;
  const pools=[
    ...(player.heroes||[]),
    ...(player.troops||[]),
    ...(player.spells||[]),
    ...(player.heroEquipment||[])
  ];
  return pools.find(x=>x.name===item.name)?.level||0;
}

function summarizePlan(item:UpgradeItem,currentLevel:number,targetLevel:number,quantity=1){
  const steps=item.levels.filter(x=>x.level>currentLevel&&x.level<=targetLevel);
  const costs=emptyCosts();
  for(const step of steps)costs[step.resource]=(costs[step.resource]||0)+step.cost*quantity;
  const totalHours=steps.reduce((sum,step)=>sum+step.timeHours*quantity,0);
  const requiredTownHall=steps.reduce((max,step)=>Math.max(max,step.townHall),item.unlockTownHall);
  const requires=[...new Set(steps.flatMap(step=>step.requires||[]))];
  return {steps,costs,totalHours,requiredTownHall,requires,quantity};
}

function targetForTownHall(item:UpgradeItem,townHall:number){
  const allowed=item.levels.filter(level=>level.townHall<=townHall);
  return allowed.at(-1)?.level||0;
}

const GUEST_TAG="#GUEST";
function manualKey(player:Player|null,item:UpgradeItem){
  return `${player?.tag||GUEST_TAG}-${item.id}`;
}

function priorityFor(item:UpgradeItem){
  const name=item.name.toLowerCase();
  if(["laboratory","army camp","clan castle","blacksmith","pet house","spell factory","dark spell factory","barracks","dark barracks","workshop"].some(x=>name.includes(x)))return {score:100,label:"Cao",reason:"Mở khóa sức mạnh hoặc tăng tốc toàn bộ tiến độ."};
  if(["goblin","dragon","electro dragon","balloon","root rider","rage","freeze","healing"].some(x=>name.includes(x)))return {score:90,label:"Cao",reason:"Ưu tiên farm/đánh chính, giúp kiếm tài nguyên nhanh hơn."};
  if(item.kind==="hero")return {score:82,label:"Cao",reason:"Hero ảnh hưởng lớn tới war, farm và tiến độ tài khoản."};
  if(item.kind==="equipment")return {score:74,label:"Vừa",reason:"Trang bị tăng sức mạnh hero nhưng không dùng thợ xây."};
  if(["eagle","inferno","x-bow","scattershot","monolith","spell tower"].some(x=>name.includes(x)))return {score:62,label:"Vừa",reason:"Phòng thủ chủ lực, nên nâng sau phần tấn công quan trọng."};
  if(item.kind==="defense")return {score:45,label:"Thấp",reason:"Phòng thủ thường xếp sau lab, camp, clan castle và hero."};
  if(item.kind==="trap")return {score:25,label:"Thấp",reason:"Bẫy nên để cuối khi các nâng cấp chính đã ổn."};
  return {score:50,label:"Vừa",reason:"Nâng theo tiến độ còn thiếu của Town Hall mục tiêu."};
}

function phaseFor(item:UpgradeItem){
  const name=item.name.toLowerCase();
  if(["laboratory","army camp","clan castle","blacksmith","pet house","spell factory","barracks","workshop"].some(x=>name.includes(x)))return "Mở khóa";
  if(["goblin","dragon","balloon","root rider","rage","freeze","healing"].some(x=>name.includes(x)))return "Farm/đội đánh";
  if(item.kind==="hero")return "Hero";
  if(item.kind==="equipment"||item.kind==="pet")return "Trang bị/Pet";
  if(item.kind==="defense"||item.kind==="trap")return "Phòng thủ";
  return "Khác";
}

const kindUnlockVia:Record<string,string>={hero:"Hero Hall",troop:"Laboratory",spell:"Laboratory",siege:"Workshop",pet:"Pet House"};
function lockNoteFor(item:UpgradeItem){
  if(item.kind==="equipment")return `Cần có ${item.owner} — hero này mở khóa từ Town Hall ${item.unlockTownHall}.`;
  const via=kindUnlockVia[item.kind]?` (mở qua ${kindUnlockVia[item.kind]})`:"";
  return `Cần đạt Town Hall ${item.unlockTownHall}${via} để mở khóa.`;
}
function RosterCard({item,player,manualLevels}:{item:UpgradeItem;player:Player;manualLevels:Record<string,number>}){
  const [stage,setStage]=useState<"local"|"remote"|"icon">("local");
  const current=currentLevelFor(item,player,manualLevels);
  const max=item.levels.at(-1)?.level||1;
  const unlocked=player.townHallLevel>=item.unlockTownHall;
  const remote=remoteArt(item);
  const Icon=buildingIconById[item.id]||kindIcon[item.kind]||Hammer;
  return <article className={`roster-card${unlocked?"":" locked"}`} title={unlocked?undefined:lockNoteFor(item)}>
    <div className="roster-image">
      {stage==="icon"||(stage==="remote"&&!remote)
        ? <Icon/>
        : <img src={stage==="local"?localArt(item):(remote as string)} alt={item.name} onError={()=>setStage(stage==="local"?(remote?"remote":"icon"):"icon")}/>}
      {!unlocked&&<span className="roster-lock"><Lock/></span>}
    </div>
    <div className="roster-copy">
      <strong>{item.name}</strong>
      {item.owner&&<span className="roster-owner">{item.owner}</span>}
      <small>{unlocked?`Cấp ${current} · Max ${max}`:`Mở ở TH${item.unlockTownHall}`}</small>
    </div>
  </article>;
}
function RosterGroup({title,subtitle,items,player,manualLevels}:{title:string;subtitle:string;items:UpgradeItem[];player:Player;manualLevels:Record<string,number>}){
  const unlockedCount=items.filter(i=>player.townHallLevel>=i.unlockTownHall).length;
  return <section className="group">
    <div className="group-title"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{unlockedCount}/{items.length} đã mở</span></div>
    <div className="roster-grid">{items.map(item=><RosterCard key={item.id} item={item} player={player} manualLevels={manualLevels}/>)}</div>
  </section>;
}

export default function App(){
  const [input,setInput]=useState(()=>localStorage.getItem("coc-last-tag")||"#R0CV8RVU2");
  const [player,setPlayer]=useState<Player|null>(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState(""),[syncedAt,setSyncedAt]=useState<Date|null>(null);
  const [tab,setTab]=useState<Tab>("overview"),[roadTH,setRoadTH]=useState(11);
  const [calcMode,setCalcMode]=useState<"suggest"|"town-hall"|"single">("suggest"),[plannerKind,setPlannerKind]=useState<UpgradeItem["kind"]|"all">("all");
  const [plannerItemId,setPlannerItemId]=useState("barbarian-king"),[targetLevel,setTargetLevel]=useState(100),[maxTownHall,setMaxTownHall]=useState(18),[builderCount,setBuilderCount]=useState(5);
  const [guestTownHall,setGuestTownHall]=useState(()=>{const saved=Number(localStorage.getItem("coc-guest-townhall"));return Number.isFinite(saved)&&saved>=1&&saved<=18?saved:8});
  const [showAllLevels,setShowAllLevels]=useState(false);
  const [playstyle,setPlaystyle]=useState<Playstyle>(()=>readStoredChoice("coc-playstyle",playstyleValues,"balanced"));
  const [attackFocus,setAttackFocus]=useState<StyleFocus>(()=>readStoredChoice("coc-attack-focus",styleFocusValues,"both"));
  const [defenseFocusPick,setDefenseFocusPick]=useState<StyleFocus>(()=>readStoredChoice("coc-defense-focus",styleFocusValues,"both"));
  const [manualLevels,setManualLevels]=useState<Record<string,number>>(()=>readStoredRecord<number>("coc-manual-levels"));
  const [pasteText,setPasteText]=useState("");
  const [pasteReport,setPasteReport]=useState<VillagePasteReport|null>(null);
  const [,bumpDbVersion]=useState(0);
  useGameDatabase(()=>bumpDbVersion(v=>v+1));
  const townHallInfo=townHallDb||townHallInfoDefault;

  async function loadPlayer(raw=input){
    const tag=normalizeTag(raw);
    if(tag.length<4){setError("Player Tag chưa hợp lệ.");return}
    setLoading(true);setError("");
    try{
      const res=await fetch(`/warreport/v1/players/${encodeURIComponent(tag)}`,{cache:"no-store"});
      if(!res.ok){
        if(res.status===404)throw new Error("Không tìm thấy người chơi. Hãy kiểm tra lại Player Tag.");
        if(res.status===401||res.status===403)throw new Error("War Report đã thay đổi quyền truy cập API. Cần cập nhật khóa web trong vite.config.ts.");
        throw new Error(`War Report phản hồi lỗi ${res.status}.`);
      }
      const payload=await res.json() as Partial<Player>;
      if(!payload||typeof payload!=="object"||!Number.isFinite(payload.townHallLevel))throw new Error("Dữ liệu người chơi từ War Report không hợp lệ.");
      const data:Player={
        ...payload,
        tag:typeof payload.tag==="string"?normalizeTag(payload.tag):tag,
        name:typeof payload.name==="string"?payload.name:"Người chơi",
        townHallLevel:clampInteger(payload.townHallLevel,1,18,1),
        expLevel:clampInteger(payload.expLevel,0,1000,0),
        trophies:clampInteger(payload.trophies,0,100000,0),
        bestTrophies:clampInteger(payload.bestTrophies,0,100000,0),
        warStars:clampInteger(payload.warStars,0,100000,0),
        attackWins:clampInteger(payload.attackWins,0,100000,0),
        defenseWins:clampInteger(payload.defenseWins,0,100000,0),
        heroes:Array.isArray(payload.heroes)?payload.heroes:[],
        troops:Array.isArray(payload.troops)?payload.troops:[],
        spells:Array.isArray(payload.spells)?payload.spells:[],
        heroEquipment:Array.isArray(payload.heroEquipment)?payload.heroEquipment:[]
      };
      setPlayer(data);setInput(data.tag);setRoadTH(data.townHallLevel);setMaxTownHall(data.townHallLevel);setSyncedAt(new Date());
      localStorage.setItem("coc-last-tag",data.tag);
      localStorage.setItem(`coc-cache-${data.tag}`,JSON.stringify(data));
    }catch(e){
      const message=e instanceof Error?e.message:"Không thể tải dữ liệu.";
      const cached=localStorage.getItem(`coc-cache-${tag}`);
      if(cached){
        try{
          const parsed=JSON.parse(cached) as Player;
          if(!parsed||typeof parsed!=="object"||!Number.isFinite(parsed.townHallLevel))throw new Error("Cache không hợp lệ");
          setPlayer({...parsed,heroes:Array.isArray(parsed.heroes)?parsed.heroes:[],troops:Array.isArray(parsed.troops)?parsed.troops:[],spells:Array.isArray(parsed.spells)?parsed.spells:[],heroEquipment:Array.isArray(parsed.heroEquipment)?parsed.heroEquipment:[]});
          setError(message+" Đang hiển thị bản lưu gần nhất trên máy.");
        }catch{
          localStorage.removeItem(`coc-cache-${tag}`);
          setError(message+" Bản lưu trên máy bị hỏng và đã được xóa.");
        }
      }else setError(message);
    }finally{setLoading(false)}
  }

  useEffect(()=>{loadPlayer(input)},[]);
  useEffect(()=>{localStorage.setItem("coc-manual-levels",JSON.stringify(manualLevels))},[manualLevels]);
  useEffect(()=>{localStorage.setItem("coc-playstyle",playstyle)},[playstyle]);
  useEffect(()=>{localStorage.setItem("coc-attack-focus",attackFocus)},[attackFocus]);
  useEffect(()=>{localStorage.setItem("coc-defense-focus",defenseFocusPick)},[defenseFocusPick]);
  useEffect(()=>{localStorage.setItem("coc-guest-townhall",String(guestTownHall))},[guestTownHall]);
  useEffect(()=>{setShowAllLevels(false)},[plannerItemId,targetLevel]);

  const homeHeroes=useMemo(()=>player?.heroes?.filter(x=>x.village==="home")||[],[player]);
  const homeTroops=useMemo(()=>player?.troops?.filter(x=>x.village==="home")||[],[player]);
  const homeSpells=useMemo(()=>player?.spells?.filter(x=>x.village==="home")||[],[player]);
  const equipment=useMemo(()=>player?.heroEquipment?.filter(x=>x.village==="home")||[],[player]);
  const progress={heroes:pct(homeHeroes),troops:pct(homeTroops.filter(x=>!x.name.startsWith("Super "))),spells:pct(homeSpells),equipment:pct(equipment)};
  const plannerItem=plannerItems.find(x=>x.id===plannerItemId)||plannerItems[0];
  const filteredPlannerItems=plannerItems.filter(item=>plannerKind==="all"||item.kind===plannerKind);
  // Nhóm theo loại (optgroup) thay vì liệt kê phẳng cả trăm mục trong 1 select
  // — chọn "Tất cả" mà không nhóm sẽ ra một danh sách quá dài, dễ bị tràn/khó
  // dò. Bỏ luôn tiền tố loại ở tên option vì optgroup đã thể hiện rồi.
  const plannerItemPool=filteredPlannerItems.length?filteredPlannerItems:plannerItems;
  const plannerItemGroups=trackerKindOrder
    .map(kind=>({kind,items:plannerItemPool.filter(item=>item.kind===kind)}))
    .filter(group=>group.items.length);
  const currentPlannerLevel=currentLevelFor(plannerItem,player,manualLevels);
  const maxPlannerLevel=plannerItem.levels.at(-1)?.level||1;
  const safeTargetLevel=Math.max(currentPlannerLevel,Math.min(targetLevel,maxPlannerLevel));
  const plan=summarizePlan(plannerItem,currentPlannerLevel,safeTargetLevel,plannerItem.quantity);
  // --- Upgrade Tracker: một công cụ tính toán duy nhất, 2 cách nhìn -----
  // (1) "town-hall": duyệt TẤT CẢ nhân tố (bỏ Wall/"Chưa kiểm" — xem
  // plannerItems), khoảng cách = cấp tối đa cho phép ở Town Hall đã chọn
  // (maxTownHall, mặc định = TH hiện tại) trừ cấp hiện tại — bức tranh đầy
  // đủ, không thiên vị lối chơi nào, nhóm theo từng loại nhân tố.
  const townHallRows=useMemo(()=>plannerItems.map(item=>{
    const current=currentLevelFor(item,player,manualLevels);
    const target=targetForTownHall(item,maxTownHall);
    return {item,current,target,plan:summarizePlan(item,current,target,item.quantity)};
  }).filter(row=>row.target>row.current&&row.plan.steps.length),[player,manualLevels,maxTownHall]);
  const townHallGroups=useMemo(()=>trackerKindOrder.map(kind=>{
    const rows=townHallRows.filter(row=>row.item.kind===kind);
    const costs=emptyCosts();
    let totalHours=0;
    for(const row of rows){addCosts(costs,row.plan.costs);totalHours+=row.plan.totalHours}
    return {kind,rows,costs,totalHours};
  }).filter(group=>group.rows.length),[townHallRows]);
  const townHallTotals=useMemo(()=>{
    const costs=emptyCosts();
    const laneHours:Record<UpgradeLane,number>={Builder:0,Laboratory:0,Blacksmith:0,"Pet House":0,Instant:0};
    for(const row of townHallRows){addCosts(costs,row.plan.costs);laneHours[row.item.lane]+=row.plan.totalHours}
    return {costs,laneHours,count:townHallRows.length};
  },[townHallRows]);

  // (2) "suggest": luôn khóa ở Town Hall hiện tại — cùng khoảng cách như
  // trên, nhưng điểm ưu tiên (priorityFor) được nhân thêm hệ số theo lối
  // chơi/phong cách tấn công/mối lo phòng thủ đã chọn (styleScoreFor), rồi
  // xếp hạng để trả lời "nên làm gì tiếp theo" thay vì liệt kê phẳng.
  const effectiveTownHall=player?.townHallLevel||guestTownHall;
  const suggestRows=useMemo(()=>{
    const townHall=player?.townHallLevel||guestTownHall;
    return plannerItems.map(item=>{
      const current=currentLevelFor(item,player,manualLevels);
      const target=targetForTownHall(item,townHall);
      const plan=summarizePlan(item,current,target,item.quantity);
      const priority=priorityFor(item);
      const score=styleScoreFor(item,priority.score,playstyle,attackFocus,defenseFocusPick);
      const reason=styleReasonFor(item,playstyle,attackFocus,defenseFocusPick)||priority.reason;
      return {item,current,target,plan,priority,score,reason};
    }).filter(row=>row.target>row.current&&row.plan.steps.length)
      .sort((a,b)=>b.score-a.score||b.plan.totalHours-a.plan.totalHours);
  },[player,manualLevels,playstyle,attackFocus,defenseFocusPick,guestTownHall]);
  const suggestTotals=useMemo(()=>{
    const costs=emptyCosts();
    const laneHours:Record<UpgradeLane,number>={Builder:0,Laboratory:0,Blacksmith:0,"Pet House":0,Instant:0};
    for(const row of suggestRows){addCosts(costs,row.plan.costs);laneHours[row.item.lane]+=row.plan.totalHours}
    return {costs,laneHours,count:suggestRows.length};
  },[suggestRows]);
  const suggestTop=useMemo(()=>suggestRows.slice(0,14),[suggestRows]);
  const suggestPhases=useMemo(()=>{
    const phases=["Mở khóa","Farm/đội đánh","Hero","Trang bị/Pet","Phòng thủ","Khác"];
    return phases.map(name=>{
      const rows=suggestRows.filter(row=>phaseFor(row.item)===name);
      return {name,rows,hours:rows.reduce((sum,row)=>sum+row.plan.totalHours,0)};
    }).filter(phase=>phase.rows.length);
  },[suggestRows]);

  const manualUpgradeItems=useMemo(()=>plannerItems.filter(item=>!item.apiTracked&&item.unlockTownHall<=(player?.townHallLevel||guestTownHall)),[player,guestTownHall]);
  const manualByKind=useMemo(()=>manualUpgradeItems.reduce((groups,item)=>{
    (groups[item.kind]||=[]).push(item);
    return groups;
  },{} as Record<UpgradeItem["kind"],UpgradeItem[]>),[manualUpgradeItems]);
  const manualFilled=manualUpgradeItems.filter(item=>(manualLevels[manualKey(player,item)]||0)>0).length;
  const manualPercent=manualUpgradeItems.length?Math.round(manualFilled/manualUpgradeItems.length*100):0;

  function setManualLevel(item:UpgradeItem,level:number){
    const max=item.levels.at(-1)?.level||0;
    setManualLevels(x=>({...x,[manualKey(player,item)]:clampInteger(level,0,max,0)}));
  }

  function applyVillagePaste(raw:string){
    if(!player)return;
    let pasted:VillagePasteData;
    try{pasted=extractDataLevels(raw)}
    catch(e){setPasteReport({error:e instanceof Error?e.message:"Không đọc được dữ liệu."});return}
    const changes:VillagePasteChange[]=[];
    let recognized=0,unchanged=0,wallSkipped=0,unsupportedSkipped=0;
    for(const [dataId,lvl] of pasted.levels){
      const itemId=villageDataIdMap[dataId];
      if(!itemId){unsupportedSkipped++;continue}
      const targetItem=upgradeItems.find(x=>x.id===itemId);
      if(!targetItem||targetItem.apiTracked){unsupportedSkipped++;continue}
      recognized++;
      if(targetItem.kind==="wall"){wallSkipped++;continue}
      const max=targetItem.levels.at(-1)?.level||0;
      const after=clampInteger(lvl,0,max,0);
      const before=manualLevels[manualKey(player,targetItem)]||0;
      if(after!==before)changes.push({id:targetItem.id,name:targetItem.name,kind:targetItem.kind,before,after});
      else unchanged++;
    }
    if(changes.length)setManualLevels(x=>{
      const next={...x};
      for(const change of changes){
        const targetItem=upgradeItems.find(i=>i.id===change.id);
        if(targetItem)next[manualKey(player,targetItem)]=change.after;
      }
      return next;
    });
    setPasteReport({
      changes,
      total:pasted.total,
      recognized,
      updated:changes.length,
      unchanged,
      wallSkipped,
      builderBaseSkipped:pasted.builderBaseIds.size,
      unsupportedSkipped
    });
  }

  async function openVillagePaste(){
    setPasteReport(null);
    try{
      const clip=await navigator.clipboard.readText();
      if(clip&&clip.trim()){setPasteText(clip);applyVillagePaste(clip)}
    }catch{
      // Trình duyệt chặn đọc clipboard tự động (thiếu quyền/không hỗ trợ) —
      // người dùng dán tay vào ô bên dưới bằng Ctrl+V / Cmd+V.
    }
  }

  return <main className="app">
    <header className="topbar">
      <div className="brand"><span className="crest"><ShieldCheck/></span><div><small>CLASH PATH</small><strong>Roadmap đồng bộ War Report</strong></div></div>
      <form className="searchbox" onSubmit={e=>{e.preventDefault();loadPlayer()}}>
        <Search/><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Nhập Player Tag, ví dụ #R0CV8RVU2" aria-label="Player Tag"/><button disabled={loading}>{loading?<LoaderCircle className="spin"/>:"Tải tài khoản"}</button>
      </form>
      <button className="icon-button" onClick={()=>loadPlayer()} disabled={loading} title="Đồng bộ lại"><RefreshCw className={loading?"spin":""}/></button>
    </header>

    {error&&<div className="error-banner"><AlertTriangle/><span>{error}</span></div>}

    {player&&<>
      <section className="profile-hero">
        <div className="th-art"><div className="aura"/><img src={thImage(player.townHallLevel)} alt={`Town Hall ${player.townHallLevel}`}/><span>TH<strong>{player.townHallLevel}</strong></span></div>
        <div className="profile-copy"><p>HỒ SƠ NGƯỜI CHƠI</p><h1>{player.name}</h1><h2>{player.tag} {player.clan&&<>· {player.clan.name}</>}</h2>
          <div className="profile-badges"><span><Trophy/>{player.trophies} cúp</span><span><Swords/>{player.warStars} sao war</span><span><Zap/>Cấp kinh nghiệm {player.expLevel}</span>{player.builderHallLevel&&<span><Hammer/>BH{player.builderHallLevel}</span>}</div>
          <small className="sync-time"><Clock3/>Đồng bộ lúc {syncedAt?.toLocaleTimeString("vi-VN")||"bản lưu trên máy"}</small>
        </div>
      </section>

      <section className="stats">
        <article><Crown/><div><small>Hero</small><strong>{homeHeroes.length} · {progress.heroes}%</strong></div></article>
        <article><Users/><div><small>Quân đã mở</small><strong>{homeTroops.filter(x=>!x.name.startsWith("Super ")).length} · {progress.troops}%</strong></div></article>
        <article><FlaskConical/><div><small>Phép đã mở</small><strong>{homeSpells.length} · {progress.spells}%</strong></div></article>
        <article><Sparkles/><div><small>Trang bị</small><strong>{equipment.length} · {progress.equipment}%</strong></div></article>
      </section>
    </>}

    <nav className="tabs">
      <button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Hồ sơ người chơi</button>
      <button className={tab==="planner"?"active":""} onClick={()=>setTab("planner")}>Upgrade Tracker</button>
      <button className={tab==="roadmap"?"active":""} onClick={()=>setTab("roadmap")}>Roadmap TH1–18</button>
      <button className={tab==="base-planner"?"active":""} onClick={()=>setTab("base-planner")}>
        Base Planner (Lưới 44x44)
      </button>
    </nav>

    {tab==="overview"&&(!player?<section className="empty-banner">
      {loading?<><LoaderCircle className="spin"/><h1>Đang kết nối War Report…</h1></>
        :<><Info/><h1>Chưa có dữ liệu người chơi</h1><p>Nhập Player Tag ở trên rồi bấm "Tải tài khoản" để xem tình trạng làng, quân và hero. Muốn tính nâng cấp ngay mà chưa có tag? Sang tab <b>Upgrade Tracker</b> — công cụ đó dùng được ngay cả khi chưa kết nối tài khoản.</p></>}
    </section>:<>
      <section className="panel army-panel">
        <p className="roster-hint"><Info/>Hiển thị toàn bộ hero/quân/phép/pet/máy công thành có trong game — mục nào chưa mở khóa vẫn hiện, làm mờ và có khóa; rê chuột vào để xem điều kiện mở.</p>
        <RosterGroup title="Hero" subtitle="Toàn bộ hero hiện có trong game" items={rosterHeroes} player={player} manualLevels={manualLevels}/>
        <RosterGroup title="Quân đội" subtitle="Quân thường dùng để tấn công (không tính quân Super tạm thời)" items={rosterTroops} player={player} manualLevels={manualLevels}/>
        <RosterGroup title="Phép thuật" subtitle="Phép từ Spell Factory và Dark Spell Factory" items={rosterSpells} player={player} manualLevels={manualLevels}/>
        <RosterGroup title="Máy công thành" subtitle="Mở khóa qua Workshop, dùng để phá lớp phòng thủ ngoài" items={rosterSiege} player={player} manualLevels={manualLevels}/>
        <RosterGroup title="Pet" subtitle="Ghép cùng hero qua Pet House" items={rosterPets} player={player} manualLevels={manualLevels}/>
        <RosterGroup title="Trang bị" subtitle="Toàn bộ trang bị hero, nâng qua Blacksmith — xem nhãn hero trên từng thẻ" items={rosterEquipment} player={player} manualLevels={manualLevels}/>
      </section>

      <section className="panel village-panel">
        <div className="section-head">
          <div><p>NHẬP DỮ LIỆU KHÔNG CÓ TRONG API</p><h2>Tình trạng công trình và bẫy</h2></div>
          <span className="road-current">{manualFilled}/{manualUpgradeItems.length} đã nhập · {manualPercent}%</span>
        </div>
        <div className="paste-panel">
          <div className="paste-head">
            <div>
              <strong>Lấy dữ liệu chính xác từ game — không cần gõ tay</strong>
              <ol className="paste-steps">
                <li>Trong game: <b>Cài đặt → More Settings → Data Export → Copy</b>.</li>
                <li>Quay lại đây, bấm "Đọc từ clipboard" hoặc dán tay (Ctrl+V / Cmd+V) vào ô bên dưới.</li>
                <li>Bấm "Xử lý dữ liệu" — cấp công trình, phòng thủ, bẫy tự điền đúng theo làng thật, không cần chỉnh tay từng mục. Hero, quân, phép, trang bị đã tự đồng bộ qua API nên được bỏ qua ở đây, cùng với dữ liệu Builder Base.</li>
              </ol>
            </div>
            <button className="ghost" onClick={openVillagePaste}><ClipboardPaste/> Đọc từ clipboard</button>
          </div>
          <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="Dán nội dung Data Export tại đây…" rows={3}/>
          <div className="paste-actions">
            <button onClick={()=>applyVillagePaste(pasteText)} disabled={!pasteText.trim()}>Xử lý dữ liệu</button>
          </div>
          {pasteReport&&<div className="paste-report">
            {pasteReport.error?<p className="paste-error"><AlertTriangle/>{pasteReport.error}</p>:<>
              <p>
                Đọc {pasteReport.total} bản ghi · nhận diện {pasteReport.recognized} loại · cập nhật {pasteReport.updated} loại · không đổi {pasteReport.unchanged} loại.
              </p>
              <p>
                Bỏ qua: Wall {pasteReport.wallSkipped} · Builder Base {pasteReport.builderBaseSkipped} · chưa hỗ trợ {pasteReport.unsupportedSkipped}.
              </p>
              {pasteReport.changes?.length?<ul>{pasteReport.changes.map(c=><li key={c.id}><span>{itemKindLabel[c.kind]}</span><b>{c.name}</b><small>{c.before} → {c.after}</small></li>)}</ul>:<p className="no-data">Không có thay đổi nào so với dữ liệu hiện tại.</p>}
            </>}
          </div>}
        </div>
        <div className="truth-note"><Info/><div><strong>Wall đã được bỏ qua.</strong><p>Planner không còn tính chi phí hoặc thời gian của tường. Dữ liệu dán vào chỉ giữ lại công trình, phòng thủ và bẫy.</p></div></div>
        <div className="truth-note"><Clock3/><div><strong>Nhớ dán lại sau khi nâng cấp xong.</strong><p>Data Export chỉ là ảnh chụp tại đúng thời điểm bạn Copy — công trình nào đang nâng cấp lúc đó sẽ được ghi nhận ở cấp TRƯỚC khi nâng. Dán lại dữ liệu mới sau khi nâng cấp hoàn tất để Upgrade Tracker tính đúng.</p></div></div>
        <div className="village-groups">
          {(["building","defense","trap"] as UpgradeItem["kind"][]).map(kind=>{
            const items=manualByKind[kind]||[];
            if(!items.length)return null;
            return <section className="village-group" key={kind}>
              <div className="group-title"><div><h2>{itemKindLabel[kind]}</h2><p>Cấp hiện tại theo dữ liệu đã dán, so với mục tiêu ở TH{player.townHallLevel}.</p></div><span>{items.length} mục</span></div>
              <div className="village-grid">
                {items.map(item=>{
                  const current=currentLevelFor(item,player,manualLevels);
                  const thTarget=targetForTownHall(item,player.townHallLevel);
                  const pctToTh=thTarget?Math.min(100,Math.round(current/thTarget*100)):0;
                  return <article className="village-item" key={item.id}>
                    <SmartArt item={item} size="sm"/>
                    <div className="village-item-copy">
                      <strong>{item.name}{item.quantity>1?` ×${item.quantity}`:""}</strong>
                      <small>{thTarget?`Cấp ${current}/${thTarget}`:"Chưa mở ở TH này"}</small>
                      <div className="mini-bar village-progress"><i style={{width:`${pctToTh}%`}}/></div>
                    </div>
                  </article>
                })}
              </div>
            </section>
          })}
        </div>
      </section>
    </>)}

    {tab==="planner"&&<section className="panel planner-panel">
        <div className="section-head">
          <div><p>MỘT CÔNG CỤ TÍNH TOÁN DUY NHẤT</p><h2>Upgrade Tracker</h2></div>
          <span className="road-current">{plannerItems.length} mục dữ liệu · bỏ qua Wall</span>
        </div>

        {/* Đổi chỗ: mode-switch (3 chế độ xem, không liên quan lối chơi) lên
            đầu tiên. Bộ chọn "Lối chơi" chỉ tác động tới cách chấm điểm ưu
            tiên của chế độ "Gợi ý cho tôi" nên chuyển hẳn vào bên trong nhánh
            đó — tránh gây hiểu lầm là nó ảnh hưởng luôn cả "Toàn bộ theo
            Town Hall" hay "Tra cứu chi tiết" (2 chế độ này chỉ liệt kê/tính
            theo cấp, không xếp hạng nên lối chơi không có tác dụng gì ở đó). */}
        <div className="mode-switch mode-switch-3">
          <button className={calcMode==="suggest"?"active":""} onClick={()=>setCalcMode("suggest")}>Gợi ý cho tôi</button>
          <button className={calcMode==="town-hall"?"active":""} onClick={()=>setCalcMode("town-hall")}>Toàn bộ theo Town Hall</button>
          <button className={calcMode==="single"?"active":""} onClick={()=>setCalcMode("single")}>Tra cứu chi tiết</button>
        </div>

        {calcMode==="suggest"&&<div className="planner-main">
          <div className="style-picker">
            <div className="style-group">
              <small>Lối chơi</small>
              <div className="pill-switch">
                <button className={playstyle==="rush"?"active":""} onClick={()=>setPlaystyle("rush")}>Tấn công trước</button>
                <button className={playstyle==="balanced"?"active":""} onClick={()=>setPlaystyle("balanced")}>Cân bằng</button>
                <button className={playstyle==="defense"?"active":""} onClick={()=>setPlaystyle("defense")}>Phòng thủ chắc</button>
                <button className={playstyle==="rush-hall"?"active":""} onClick={()=>setPlaystyle("rush-hall")}>Rush Hall</button>
              </div>
              <p className="style-hint">{playstyleHint[playstyle]}</p>
            </div>
            <div className="style-group">
              <small>Phong cách tấn công</small>
              <div className="pill-switch">
                <button className={attackFocus==="ground"?"active":""} onClick={()=>setAttackFocus("ground")}>Trên bộ</button>
                <button className={attackFocus==="air"?"active":""} onClick={()=>setAttackFocus("air")}>Trên không</button>
                <button className={attackFocus==="both"?"active":""} onClick={()=>setAttackFocus("both")}>Cả hai</button>
              </div>
            </div>
            <div className="style-group">
              <small>Mối lo phòng thủ</small>
              <div className="pill-switch">
                <button className={defenseFocusPick==="ground"?"active":""} onClick={()=>setDefenseFocusPick("ground")}>Chống quân bộ</button>
                <button className={defenseFocusPick==="air"?"active":""} onClick={()=>setDefenseFocusPick("air")}>Chống quân bay</button>
                <button className={defenseFocusPick==="both"?"active":""} onClick={()=>setDefenseFocusPick("both")}>Cả hai</button>
              </div>
            </div>
          </div>
          {!player&&<label className="tracker-builder">
            <small>Chưa kết nối tài khoản — giả định Town Hall</small>
            <input type="range" min="1" max="18" step="1" value={guestTownHall} onChange={e=>setGuestTownHall(clampInteger(e.target.valueAsNumber,1,18,8))}/>
            <strong>TH{guestTownHall}</strong>
          </label>}
          <p className="roster-hint"><Info/>Xếp hạng theo lối chơi bạn chọn ở trên, luôn tính tại Town Hall hiện tại (TH{effectiveTownHall}){!player&&" (giả định, vì chưa kết nối tài khoản)"}. Đổi lựa chọn phía trên là danh sách cập nhật ngay.</p>
          <div className="planner-summary">
            <article><small><Wrench/> Việc còn thiếu (tất cả)</small><strong>{suggestTotals.count}</strong><span>Để max mọi thứ ở TH{effectiveTownHall}</span></article>
            <article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={suggestTotals.costs}/></strong><span>Cộng dồn toàn bộ, không riêng danh sách gợi ý</span></article>
            <article><small><Hammer/> Builder</small><strong>{fmtTime(suggestTotals.laneHours.Builder/builderCount)}</strong><span>{fmtTime(suggestTotals.laneHours.Builder)} chia cho {builderCount} thợ</span></article>
            <article><small><FlaskConical/> Laboratory</small><strong>{fmtTime(suggestTotals.laneHours.Laboratory)}</strong><span>Một hàng chờ riêng</span></article>
          </div>
          <section className="phase-map">
            {suggestPhases.map((phase,index)=><article key={phase.name}>
              <span>{index+1}</span>
              <div><strong>{phase.name}</strong><small>{phase.rows.length} việc · {fmtTime(phase.hours)}</small></div>
            </article>)}
          </section>
          <section className="priority-planner">
            <div className="group-title"><div><h2>Nên làm gì tiếp theo</h2><p>Xếp theo lối chơi + phong cách bạn chọn ở trên, không phải thứ tự cố định.</p></div><span>Top {suggestTop.length}/{suggestRows.length}</span></div>
            <div className="priority-list">
              {suggestTop.map((row,index)=><article key={row.item.id}>
                <span className={`priority-rank ${row.priority.label==="Cao"?"high":row.priority.label==="Vừa"?"mid":"low"}`}>{index+1}</span>
                <div className="priority-icon"><SmartArt item={row.item} size="sm" townHallLevel={row.target}/></div>
                <div>
                  <small>{itemKindLabel[row.item.kind]} · {row.item.lane}</small>
                  <strong>{row.item.name} <em>{row.current} → {row.target}</em></strong>
                  <p>{row.reason}</p>
                </div>
                <div className="priority-meta"><b>{fmtCost(row.plan.costs)}</b><span>{fmtTime(row.plan.totalHours)}</span></div>
                <button onClick={()=>{setCalcMode("single");setPlannerItemId(row.item.id);setTargetLevel(row.target)}}>Xem cấp</button>
              </article>)}
              {!suggestTop.length&&<p className="no-data">Đã max toàn bộ ở TH{effectiveTownHall} theo lựa chọn hiện tại 🎉 — lên Town Hall tiếp theo để có thêm việc.</p>}
            </div>
          </section>
        </div>}

        {calcMode==="town-hall"&&<div className="planner-main">
          <div className="planner-summary">
            <article><small><Castle/> Tính tới</small><strong>TH{maxTownHall}</strong><span>Mặc định = Town Hall hiện tại, kéo thanh bên dưới để đổi</span></article>
            <article><small><Wrench/> Việc còn lại</small><strong>{townHallTotals.count}</strong><span>Wall đã bỏ qua theo yêu cầu</span></article>
            <article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={townHallTotals.costs}/></strong><span>Tính theo số lượng từng loại</span></article>
            <article><small><Hammer/> Builder</small><strong>{fmtTime(townHallTotals.laneHours.Builder/builderCount)}</strong><span>{fmtTime(townHallTotals.laneHours.Builder)} / {builderCount} thợ</span></article>
          </div>
          <div className="lane-grid">
            {(["Builder","Laboratory","Blacksmith","Pet House"] as UpgradeLane[]).map(lane=><article key={lane}><small>{lane}</small><strong>{fmtTime(townHallTotals.laneHours[lane])}</strong><span>{lane==="Builder"?`Ước tính ${fmtTime(townHallTotals.laneHours[lane]/builderCount)} với ${builderCount} thợ`:"Một hàng chờ riêng"}</span></article>)}
          </div>
          <label className="tracker-builder">
            <small>Tính tới Town Hall</small>
            <input type="range" min="1" max="18" step="1" value={maxTownHall} onChange={e=>setMaxTownHall(clampInteger(e.target.valueAsNumber,1,18,18))}/>
            <strong>TH{maxTownHall}</strong>
          </label>
          <label className="tracker-builder">
            <small>Số thợ xây để ước tính</small>
            <input type="range" min="1" max="6" step="1" value={builderCount} onChange={e=>setBuilderCount(clampInteger(e.target.valueAsNumber,1,6,5))}/>
            <strong>{builderCount} thợ xây</strong>
          </label>
          <div className="village-groups">
            {townHallGroups.map(group=><section className="village-group" key={group.kind}>
              <div className="group-title"><div><h2>{itemKindLabel[group.kind]}</h2><p>Cấp hiện tại so với cấp tối đa cho phép ở TH{maxTownHall}.</p></div><span>{group.rows.length} mục · {fmtCost(group.costs)} · {fmtTime(group.totalHours)}</span></div>
              <div className="upgrade-table">
                <div className="upgrade-row max-head"><span>Mục</span><span>Cấp</span><span>Chi phí</span><span>Thời gian</span><span>Điều kiện</span></div>
                {group.rows.map(row=><div className="upgrade-row" key={row.item.id}>
                  <span className="upgrade-item-cell"><SmartArt item={row.item} size="sm" townHallLevel={row.target}/><span><b>{row.item.name}</b><small>{dataStatusLabel[row.item.dataStatus]}{row.item.quantity>1?` ×${row.item.quantity}`:""}</small></span></span>
                  <span>{row.current} → {row.target}</span>
                  <span>{fmtCost(row.plan.costs)}</span>
                  <span>{fmtTime(row.plan.totalHours)}</span>
                  <span>TH{row.plan.requiredTownHall}{row.plan.requires.length?` · ${row.plan.requires.join(", ")}`:""}</span>
                </div>)}
              </div>
            </section>)}
            {!townHallGroups.length&&<p className="no-data">Không còn mục cần nâng để tới TH{maxTownHall}.</p>}
          </div>
        </div>}

        {calcMode==="single"&&<div className="planner-layout">
          <aside className="planner-controls">
            <label>
              <small>Lọc loại nâng cấp</small>
              <select value={plannerKind} onChange={e=>setPlannerKind(e.target.value as UpgradeItem["kind"]|"all")}>
                <option value="all">Tất cả</option>
                {Object.entries(itemKindLabel).filter(([kind])=>kind!=="wall").map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}
              </select>
            </label>
            <label>
              <small>Chọn mục nâng cấp</small>
              <select value={plannerItemId} onChange={e=>{const next=upgradeItems.find(x=>x.id===e.target.value)||upgradeItems[0];setPlannerItemId(next.id);setTargetLevel(next.levels.at(-1)?.level||1)}}>
                {plannerItemGroups.map(group=><optgroup label={itemKindLabel[group.kind]} key={group.kind}>
                  {group.items.map(item=><option key={item.id} value={item.id}>{item.name}{item.quantity>1?` ×${item.quantity}`:""}</option>)}
                </optgroup>)}
              </select>
            </label>
            {!plannerItem.apiTracked&&<label>
              <small>Cấp hiện tại nhập tay</small>
              <input type="number" min="0" max={maxPlannerLevel} step="1" value={currentPlannerLevel} onChange={e=>setManualLevel(plannerItem,e.target.valueAsNumber)}/>
            </label>}
            {plannerItem.apiTracked&&!player&&<p className="no-data">Mục này lấy cấp từ dữ liệu API (hero/quân/phép) — cần kết nối tài khoản mới có cấp hiện tại, tạm coi là cấp 0.</p>}
            <label>
              <small>Mục tiêu level</small>
              <input type="number" min={currentPlannerLevel} max={maxPlannerLevel} step="1" value={safeTargetLevel} onChange={e=>setTargetLevel(clampInteger(e.target.valueAsNumber,currentPlannerLevel,maxPlannerLevel,currentPlannerLevel))}/>
            </label>
            <label>
              <small>Số thợ xây để ước tính</small>
              <input type="range" min="1" max="6" step="1" value={builderCount} onChange={e=>setBuilderCount(clampInteger(e.target.valueAsNumber,1,6,5))}/>
              <strong>{builderCount} thợ xây</strong>
            </label>
            <div className="source-box">
              <strong>Nguồn dữ liệu</strong>
              {upgradeSources.map(source=><p key={source}>{source}</p>)}
            </div>
          </aside>
          <div className="planner-main">
            <div className="planner-item-head">
              <SmartArt item={plannerItem} size="sm" townHallLevel={safeTargetLevel}/>
              <div><small>{itemKindLabel[plannerItem.kind]} · {plannerItem.lane}</small><strong>{plannerItem.name}{plannerItem.quantity>1?` ×${plannerItem.quantity}`:""}</strong></div>
            </div>
            {/* Gộp 7 thẻ cũ (Hiện tại/Mục tiêu/TH cần đạt/Dữ liệu/Chi phí/Thời
                gian/Ước tính song song) xuống còn 4 thẻ — mỗi thẻ có icon,
                chỉ giữ thông tin cần để ra quyết định nâng cấp, phần "Dữ
                liệu" (độ chính xác số liệu) chuyển thành ghi chú nhỏ dưới
                thẻ chi phí thay vì chiếm hẳn 1 thẻ riêng. */}
            <div className="planner-summary">
              <article><small><Target/> Tiến độ</small><strong>Lv {currentPlannerLevel} → Lv {safeTargetLevel}</strong><span>{plan.steps.length} cấp cần nâng × {plannerItem.quantity} · Tối đa Lv {maxPlannerLevel}</span></article>
              <article><small><Castle/> Town Hall cần đạt</small><strong>TH{plan.requiredTownHall}</strong><span>{plannerItem.id==="town-hall"?"Theo cấp TH mục tiêu":"Theo điều kiện từng level"}</span></article>
              <article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={plan.costs}/></strong><span>{dataStatusLabel[plannerItem.dataStatus]} · {plannerItem.source}</span></article>
              <article><small><Clock3/> Thời gian</small><strong>{fmtTime(plan.totalHours)}</strong><span>{plannerItem.lane==="Builder"?`${fmtTime(plan.totalHours/builderCount)} nếu chạy song song ${builderCount} thợ xây`:"Lab/Blacksmith/Pet House chạy 1 hàng chờ riêng"}</span></article>
            </div>
            {plan.requires.length>0&&<div className="requires-box"><AlertTriangle/><div><strong>Cần chuẩn bị trước</strong><p>{plan.requires.join(" · ")}</p></div></div>}
            {/* Mục có ít cấp (đa số công trình/phòng thủ) thì hiện từng chấm
                cấp như cũ — dễ nhìn. Hero/trang bị đời mới có thể lên tới
                level 100 (Barbarian King) nên hiện hết từng chấm sẽ tràn
                trang; những mục đó đổi sang 1 thanh tiến độ gọn hơn nhiều. */}
            {plannerItem.levels.length>30
              ? <div className="level-progress">
                  <div className="level-progress-bar"><span style={{width:`${Math.min(100,Math.round((safeTargetLevel/maxPlannerLevel)*100))}%`}}/></div>
                  <div className="level-progress-labels"><span>Lv {currentPlannerLevel}</span><span>Mục tiêu Lv {safeTargetLevel}</span><span>Tối đa Lv {maxPlannerLevel}</span></div>
                </div>
              : <div className="level-strip">
                  {plannerItem.levels.map(level=>{
                    const state=level.level<=currentPlannerLevel?"done":level.level<=safeTargetLevel?"target":"future";
                    return <span key={level.level} className={state} title={`${plannerItem.name} level ${level.level}`}>{level.level}</span>
                  })}
                </div>}
            <div className="upgrade-table">
              <div className="upgrade-row head"><span>Cấp</span><span>Điều kiện</span><span>Chi phí</span><span>Thời gian</span><span>Ghi chú</span></div>
              {plan.steps.length?(showAllLevels?plan.steps:plan.steps.slice(0,LEVEL_TABLE_PREVIEW)).map(step=><div className="upgrade-row" key={step.level}>
                <span><b>{currentPlannerLevel+1===step.level?"Tiếp theo":"Level"} {step.level}</b></span>
                <span>TH{step.townHall}</span>
                <span>{fmtNumber(step.cost*plannerItem.quantity)} {step.resource}</span>
                <span>{fmtTime(step.timeHours*plannerItem.quantity)}</span>
                <span>{dataStatusLabel[plannerItem.dataStatus]}. {plannerItem.quantity>1?`Áp dụng cho ${plannerItem.quantity} mục. `:""}{step.requires?.join(", ")||"Không có điều kiện phụ"}</span>
              </div>):<p className="no-data">Mục này đã đạt hoặc vượt level mục tiêu.</p>}
            </div>
            {plan.steps.length>LEVEL_TABLE_PREVIEW&&<button className="show-more-levels" onClick={()=>setShowAllLevels(x=>!x)}>
              {showAllLevels?"Thu gọn danh sách":`Xem thêm ${plan.steps.length-LEVEL_TABLE_PREVIEW} cấp nữa (tổng ${plan.steps.length} cấp còn lại)`}
            </button>}
          </div>
        </div>}
      </section>}

      {tab==="roadmap"&&(!player?<section className="empty-banner">
        {loading?<><LoaderCircle className="spin"/><h1>Đang kết nối War Report…</h1></>
          :<><Info/><h1>Chưa có dữ liệu người chơi</h1><p>Nhập Player Tag ở trên rồi bấm "Tải tài khoản" để xem roadmap Town Hall 1 → 18 theo tài khoản của bạn.</p></>}
      </section>:(()=>{
        const info=townHallInfo[roadTH-1];
        const roadState=roadTH<player.townHallLevel?"past":roadTH===player.townHallLevel?"current":"future";
        const progressPct=((player.townHallLevel-1)/17)*100;
        return <section className="panel roadmap-panel">
          <div className="section-head"><div><p>TOÀN BỘ HÀNH TRÌNH</p><h2>Town Hall 1 → Town Hall 18</h2></div><span className="road-current">Bạn đang ở TH{player.townHallLevel}</span></div>
          <div className="th-track" style={{"--progress":`${progressPct}%`} as React.CSSProperties}>
            {townHallInfo.map(({level,title})=>{
              const state=level<player.townHallLevel?"past":level===player.townHallLevel?"current":"future";
              return <button key={level} className={`th-node ${state}${roadTH===level?" active":""}`} onClick={()=>setRoadTH(level)} title={`TH${level} · ${title}`}>
                <span className="th-node-img"><img src={thImage(level)} alt={`Town Hall ${level}`}/>{state==="past"&&<i className="th-node-done"><Check/></i>}{state==="future"&&<i className="th-node-lock"><Lock/></i>}</span>
                <small>TH{level}</small>
                <em>{title}</em>
              </button>;
            })}
          </div>
          <div className={`th-detail ${roadState}`}>
            <div className="th-detail-head">
              <div className="th-detail-art"><img src={thImage(roadTH)} alt={`Town Hall ${roadTH}`}/></div>
              <div className="th-detail-copy">
                <span className={`th-badge ${roadState}`}>{roadState==="past"?"Đã hoàn thành":roadState==="current"?"Chặng hiện tại":"Chặng sắp tới"}</span>
                <h3>TH{roadTH} · {info.title}</h3>
                <p>{info.blurb}</p>
                {info.unlocks.note&&<p className="th-note"><Info/>{info.unlocks.note}</p>}
              </div>
              <div className="th-detail-nav">
                <button disabled={roadTH<=1} onClick={()=>setRoadTH(x=>Math.max(1,x-1))}>‹ TH{roadTH-1}</button>
                <button disabled={roadTH>=18} onClick={()=>setRoadTH(x=>Math.min(18,x+1))}>TH{roadTH+1} ›</button>
              </div>
            </div>
            <div className="th-unlock-grid">
              {unlockGroups.map(group=>{
                const values=info.unlocks[group.key] as string[]|undefined;
                if(!values||!values.length)return null;
                const Icon=group.icon;
                return <div className="th-unlock-group" key={group.key}>
                  <header><Icon/><strong>{group.label}</strong><span>{values.length}</span></header>
                  <div className="th-unlock-pills">{values.map(v=><span key={v}>{v}</span>)}</div>
                </div>;
              })}
              {!Object.values(info.unlocks).some(v=>Array.isArray(v)&&v.length)&&<p className="no-data">Không có mở khóa mới nào ghi nhận ở mốc này.</p>}
            </div>
          </div>
        </section>;
      })())}

      {tab==="base-planner"&&<BasePlannerTab initialTownHall={player?.townHallLevel||guestTownHall||11}/>}
    <footer><span>Dữ liệu người chơi: War Report / API chính thức Clash of Clans</span><span>Tiến độ thủ công lưu riêng theo từng Player Tag</span><span>Nội dung không chính thức, không được Supercell xác nhận hay ủng hộ. Xem Fan Content Policy tại supercell.com/en/fan-content-policy</span></footer>
  </main>
}
