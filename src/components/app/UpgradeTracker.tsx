import React, { useState, useMemo } from "react";
import { AlertTriangle, Castle, Clock3, Coins, Crosshair, Gem, Info, Target, Hammer, FlaskConical, PawPrint, Wrench } from "lucide-react";
import type { Player } from "../../types";
import { type UpgradeItem, upgradeItems, type UpgradeLane, upgradeSources } from "../../upgradeData";
import { CostBadges, SmartArt } from "../SmartArt";
import { pct, fmtNumber, fmtTime, fmtTimeExact, itemKindLabel, dataStatusLabel, fmtCost, dataStatusDetail } from "../../utils/formatters";
import { type Playstyle, type StyleFocus, readStoredChoice, currentLevelFor, summarizePlan, manualKey, trackerKindOrder, playstyleHint } from "../../utils/upgradeLogic";
import { useUpgradeTracker, plannerItems } from "../../hooks/useUpgradeTracker";
import { clampInteger } from "../../utils/villageImport";

const playstyleValues: Playstyle[] = ["rush", "balanced", "defense", "rush-hall"];
const styleFocusValues: StyleFocus[] = ["ground", "air", "both"];
const LEVEL_TABLE_PREVIEW = 15;

interface UpgradeTrackerProps {
  setGuestTownHall: (th: number) => void;
  setManualLevels: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  player: Player | null;
  manualLevels: Record<string, number>;
  guestTownHall: number;
}

export function UpgradeTracker({ player, manualLevels, guestTownHall, setGuestTownHall, setManualLevels }: UpgradeTrackerProps) {
  const [calcMode, setCalcMode] = useState<"suggest"|"town-hall"|"single">("suggest");
  const [plannerKind, setPlannerKind] = useState<UpgradeItem["kind"]|"all">("all");
  const [plannerItemId, setPlannerItemId] = useState("barbarian-king");
  const [targetLevel, setTargetLevel] = useState(100);
  const [maxTownHall, setMaxTownHall] = useState(18);
  const [builderCount, setBuilderCount] = useState(5);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [playstyle, setPlaystyle] = useState<Playstyle>(() => readStoredChoice("coc-playstyle", playstyleValues, "balanced"));
  const [attackFocus, setAttackFocus] = useState<StyleFocus>(() => readStoredChoice("coc-attack-focus", styleFocusValues, "both"));
  const [defenseFocusPick, setDefenseFocusPick] = useState<StyleFocus>(() => readStoredChoice("coc-defense-focus", styleFocusValues, "both"));

  const {
    townHallRows,
    townHallGroups,
    townHallTotals,
    suggestRows,
    suggestTotals,
    suggestTop,
    suggestPhases,
    effectiveTownHall
  } = useUpgradeTracker({
    player,
    manualLevels,
    maxTownHall,
    playstyle,
    attackFocus,
    defenseFocusPick,
    guestTownHall
  });

  const plannerItem = plannerItems.find(x => x.id === plannerItemId) || plannerItems[0];
  const currentPlannerLevel = currentLevelFor(plannerItem, player, manualLevels);
  const maxPlannerLevel = plannerItem.levels[plannerItem.levels.length - 1]?.level || 1;
  const safeTargetLevel = Math.max(currentPlannerLevel, Math.min(maxPlannerLevel, targetLevel));
  const plan = summarizePlan(plannerItem, currentPlannerLevel, safeTargetLevel, plannerItem.quantity);
  const plannerItemGroups = useMemo(()=>trackerKindOrder.map(kind=>({ kind, items: plannerItems.filter(i=>i.kind===kind) })).filter(g=>g.items.length), []);
  const setManualLevel = (item: any, val: number) => setManualLevels(prev => ({ ...prev, [manualKey(player, item)]: val }));

  return (
<section className="panel planner-panel">
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
            <article><small><Castle/> Tính tới</small><strong>TH{maxTownHall}</strong><span>Mặc định = Town Hall hiện tại, kéo thanh bên dưới để đổi</span></article>
            <article><small><Wrench/> Việc còn lại</small><strong>{townHallTotals.count}</strong><span>Wall đã bỏ qua theo yêu cầu</span></article>
            <article><small><Coins/> Tổng chi phí</small><strong><CostBadges costs={townHallTotals.costs}/></strong><span>Tính theo số lượng từng loại</span>{townHallTotals.hasEstimated && <span className="text-yellow-400 text-xs mt-1 block">⚠️ Tổng có dùng số liệu ước tính</span>}</article>
          </div>
          <div className="lane-grid">
            {(["Builder","Laboratory","Blacksmith","Pet House"] as UpgradeLane[]).map(lane => {
              const totalHours = townHallTotals.laneHours[lane];
              if (lane === "Builder") {
                return (
                  <article key={lane}>
                    <small><Hammer/> Thợ xây (Builder)</small>
                    <strong title={fmtTimeExact(totalHours / builderCount)}>{fmtTime(totalHours / builderCount)}</strong>
                    <span title={fmtTimeExact(totalHours)}>Tổng: {fmtTime(totalHours, true)} chia cho {builderCount} thợ</span>
                  </article>
                );
              }
              return (
                <article key={lane}>
                  <small>{lane === "Laboratory" ? <FlaskConical/> : lane === "Blacksmith" ? <Hammer/> : <PawPrint/>} {lane}</small>
                  <strong title={fmtTimeExact(totalHours)}>{fmtTime(totalHours)}</strong>
                  <span>Hàng chờ riêng</span>
                </article>
              );
            })}
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
              <article><small><Clock3/> Thời gian</small><strong title={fmtTimeExact(plan.totalHours)}>{fmtTime(plan.totalHours)}</strong><span>{plannerItem.lane==="Builder"?`${fmtTime(plan.totalHours/builderCount)} nếu chia ${builderCount} thợ xây`:"Lab/Blacksmith/Pet House chạy 1 hàng chờ riêng"}</span></article>
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
      </section>
  );
}
