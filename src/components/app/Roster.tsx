import React from "react";
import { Lock } from "lucide-react";
import type { Player } from "../../types";
import type { UpgradeItem } from "../../upgradeData";
import { currentLevelFor, lockNoteFor } from "../../utils/upgradeLogic";
import { SmartArt } from "../SmartArt";
import { useTranslation } from "../../i18n";

export function RosterCard({item,player,manualLevels}:{item:UpgradeItem;player:Player;manualLevels:Record<string,number>}){
  const { t } = useTranslation();
  const current=currentLevelFor(item,player,manualLevels);
  const max=item.levels.at(-1)?.level||1;
  const unlocked=player.townHallLevel>=item.unlockTownHall;
  return <article className={`roster-card${unlocked?"":" locked"}`} title={unlocked?undefined:(lockNoteFor(item, player.townHallLevel) || undefined)}>
    <div className="roster-image">
      <SmartArt item={item} />
      {!unlocked&&<span className="roster-lock"><Lock/></span>}
    </div>
    <div className="roster-copy">
      <strong>{item.name}</strong>
      {item.owner&&<span className="roster-owner">{item.owner}</span>}
      <small>{unlocked?t("overview.rosterLevelLabel",{current,max}):t("overview.rosterLockedLabel",{th:item.unlockTownHall})}</small>
    </div>
  </article>;
}
export function RosterGroup({title,subtitle,items,player,manualLevels}:{title:string;subtitle:string;items:UpgradeItem[];player:Player;manualLevels:Record<string,number>}){
  const { t } = useTranslation();
  const unlockedCount=items.filter(i=>player.townHallLevel>=i.unlockTownHall).length;
  return <section className="group">
    <div className="group-title"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{t("overview.unlockedCount",{unlocked:unlockedCount,total:items.length})}</span></div>
    <div className="roster-grid">{items.map(item=><RosterCard key={item.id} item={item} player={player} manualLevels={manualLevels}/>)}</div>
  </section>;
}
