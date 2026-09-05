import { useState } from "react";
import { Check, Info, Lock, Hammer, ShieldCheck, Target, Users, FlaskConical, Crown, Truck, PawPrint, Sparkles, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { thImage } from "../SmartArt";
import type { Player } from "../../types";
import { townHallInfo, type TownHallInfo, type TownHallUnlocks } from "../../townHallData";

interface RoadmapProps {
  player: Player | null;
  loading: boolean;
}

const unlockGroups: { key: keyof TownHallUnlocks; label: string; icon: LucideIcon }[] = [
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

export function Roadmap({ player, loading }: RoadmapProps) {
  const [roadTH, setRoadTH] = useState(player ? player.townHallLevel : 11);

  if (!player) {
    return (
      <section className="empty-banner">
        {loading ? (
          <>
            <LoaderCircle className="spin" />
            <h1>Đang kết nối War Report…</h1>
          </>
        ) : (
          <>
            <Info />
            <h1>Chưa có dữ liệu người chơi</h1>
            <p>Nhập Player Tag ở trên rồi bấm "Đồng bộ hồ sơ" để xem roadmap Town Hall 1 → 18 theo tài khoản của bạn.</p>
          </>
        )}
      </section>
    );
  }

  const info = townHallInfo[roadTH - 1];
  const roadState = roadTH < player.townHallLevel ? "past" : roadTH === player.townHallLevel ? "current" : "future";
  const progressPct = ((player.townHallLevel - 1) / 17) * 100;

  return (
    <section className="panel roadmap-panel">
      <div className="section-head">
        <div>
          <p>TOÀN BỘ HÀNH TRÌNH</p>
          <h2>Town Hall 1 → Town Hall 18</h2>
        </div>
        <span className="road-current">Bạn đang ở TH{player.townHallLevel}</span>
      </div>
      <div className="th-track" style={{ "--progress": `${progressPct}%` } as React.CSSProperties}>
        {townHallInfo.map(({ level, title }) => {
          const state = level < player.townHallLevel ? "past" : level === player.townHallLevel ? "current" : "future";
          return (
            <button key={level} className={`th-node ${state}${roadTH === level ? " active" : ""}`} onClick={() => setRoadTH(level)} title={`TH${level} · ${title}`}>
              <span className="th-node-img">
                <img src={thImage(level)} alt={`Town Hall ${level}`} />
                {state === "past" && <i className="th-node-done"><Check /></i>}
                {state === "future" && <i className="th-node-lock"><Lock /></i>}
              </span>
              <small>TH{level}</small>
              <em>{title}</em>
            </button>
          );
        })}
      </div>
      <div className={`th-detail ${roadState}`}>
        <div className="th-detail-head">
          <div className="th-detail-art"><img src={thImage(roadTH)} alt={`Town Hall ${roadTH}`} /></div>
          <div className="th-detail-copy">
            <span className={`th-badge ${roadState}`}>{roadState === "past" ? "Đã hoàn thành" : roadState === "current" ? "Chặng hiện tại" : "Chặng sắp tới"}</span>
            <h3>TH{roadTH} · {info.title}</h3>
            <p>{info.blurb}</p>
            {info.unlocks.note && <p className="th-note"><Info />{info.unlocks.note}</p>}
          </div>
          <div className="th-detail-nav">
            <button disabled={roadTH <= 1} onClick={() => setRoadTH(x => Math.max(1, x - 1))}>‹ TH{roadTH - 1}</button>
            <button disabled={roadTH >= 18} onClick={() => setRoadTH(x => Math.min(18, x + 1))}>TH{roadTH + 1} ›</button>
          </div>
        </div>
        <div className="th-unlock-grid">
          {unlockGroups.map(group => {
            const values = info.unlocks[group.key] as string[] | undefined;
            if (!values || !values.length) return null;
            const Icon = group.icon;
            return (
              <div className="th-unlock-group" key={group.key}>
                <header><Icon /><strong>{group.label}</strong><span>{values.length}</span></header>
                <div className="th-unlock-pills">{values.map(v => <span key={v}>{v}</span>)}</div>
              </div>
            );
          })}
          {!Object.values(info.unlocks).some(v => Array.isArray(v) && v.length) && <p className="no-data">Không có mở khóa mới nào ghi nhận ở mốc này.</p>}
        </div>
      </div>
    </section>
  );
}
