import { useState } from "react";
import { Check, Info, Lock, Hammer, ShieldCheck, Target, Users, FlaskConical, Crown, Truck, PawPrint, Sparkles, LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { thImage } from "../SmartArt";
import type { Player } from "../../types";
import { townHallInfo, type TownHallInfo, type TownHallUnlocks } from "../../townHallData";
import { useTranslation, type TranslationKey } from "../../i18n";

interface RoadmapProps {
  player: Player | null;
  loading: boolean;
}

const unlockGroups: { key: keyof TownHallUnlocks; labelKey: TranslationKey; icon: LucideIcon }[] = [
  {key:"buildings",labelKey:"roadmap.unlockGroups.buildings",icon:Hammer},
  {key:"defenses",labelKey:"roadmap.unlockGroups.defenses",icon:ShieldCheck},
  {key:"traps",labelKey:"roadmap.unlockGroups.traps",icon:Target},
  {key:"troops",labelKey:"roadmap.unlockGroups.troops",icon:Users},
  {key:"spells",labelKey:"roadmap.unlockGroups.spells",icon:FlaskConical},
  {key:"heroes",labelKey:"roadmap.unlockGroups.heroes",icon:Crown},
  {key:"siege",labelKey:"roadmap.unlockGroups.siege",icon:Truck},
  {key:"pets",labelKey:"roadmap.unlockGroups.pets",icon:PawPrint},
  {key:"guardians",labelKey:"roadmap.unlockGroups.guardians",icon:Sparkles}
];

export function Roadmap({ player, loading }: RoadmapProps) {
  const { t } = useTranslation();
  const [roadTH, setRoadTH] = useState(player ? player.townHallLevel : 11);

  if (!player) {
    return (
      <section className="empty-banner">
        {loading ? (
          <>
            <LoaderCircle className="spin" />
            <h1>{t("overview.connecting")}</h1>
          </>
        ) : (
          <>
            <Info />
            <h1>{t("overview.emptyTitle")}</h1>
            <p>{t("roadmap.emptyCta", { syncLabel: t("common.syncProfile") })}</p>
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
          <p>{t("roadmap.eyebrow")}</p>
          <h2>{t("roadmap.title")}</h2>
        </div>
        <span className="road-current">{t("roadmap.currentTownHall", { th: player.townHallLevel })}</span>
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
            <span className={`th-badge ${roadState}`}>{roadState === "past" ? t("roadmap.statusPast") : roadState === "current" ? t("roadmap.statusCurrent") : t("roadmap.statusFuture")}</span>
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
                <header><Icon /><strong>{t(group.labelKey)}</strong><span>{values.length}</span></header>
                <div className="th-unlock-pills">{values.map(v => <span key={v}>{v}</span>)}</div>
              </div>
            );
          })}
          {!Object.values(info.unlocks).some(v => Array.isArray(v) && v.length) && <p className="no-data">{t("roadmap.noUnlocks")}</p>}
        </div>
      </div>
    </section>
  );
}
