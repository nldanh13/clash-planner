import { Clock3, Crown, FlaskConical, Hammer, RefreshCw, Search, Sparkles, Swords, Trophy, Users, Zap } from "lucide-react";
import type { Player } from "../../types";
import { thImage } from "../SmartArt";
import { AnimatedCounter, AnimatedProgressBar } from "../ui/AnimatedFeedback";
import { useTranslation } from "../../i18n";

interface PlayerProfileProps {
  player: Player;
  syncedAt: Date | null;
  loading?: boolean;
  onOpenSearch?: () => void;
  onSync?: () => void;
  homeHeroes: any[];
  homeTroops: any[];
  homeSpells: any[];
  equipment: any[];
  progress: {
    heroes: number;
    troops: number;
    spells: number;
    equipment: number;
  };
}

export function PlayerProfile({ 
  player, 
  syncedAt, 
  loading,
  onOpenSearch,
  onSync,
  homeHeroes, 
  homeTroops, 
  homeSpells, 
  equipment, 
  progress 
}: PlayerProfileProps) {
  const { t } = useTranslation();
  return (
    <>
      <section className="profile-hero">
        <div className="th-art">
          <div className="aura" />
          <img src={thImage(player.townHallLevel)} alt={`Town Hall ${player.townHallLevel}`} />
          <span>TH<strong>{player.townHallLevel}</strong></span>
        </div>
        <div className="profile-copy">
          <div className="profile-top-bar">
            <div>
              <p>{t("overview.profileEyebrow")}</p>
              <h1>{player.name}</h1>
              <h2>
                <span className="player-tag-highlight">#{player.tag.replace(/^#+/, "")}</span>
                {player.clan && <> · {player.clan.name}</>}
              </h2>
            </div>
            
            <div className="profile-controls">
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="profile-ctrl-btn profile-ctrl-search"
                  title={t("app.searchModal.title")}
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{t("app.searchModal.changeTag")} / {t("app.searchModal.trigger")}</span>
                </button>
              )}
              {onSync && (
                <button
                  type="button"
                  onClick={onSync}
                  disabled={loading}
                  className="profile-ctrl-btn profile-ctrl-sync"
                  title={t("app.syncTooltip")}
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "spin" : ""}`} />
                  <span>{loading ? t("app.syncing") : t("app.syncNow")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="profile-badges">
            <span><Trophy />{player.trophies} {t("overview.trophies")}</span>
            <span><Swords />{player.warStars} {t("overview.warStars")}</span>
            <span><Zap />{t("overview.expLevel", { level: player.expLevel })}</span>
            {player.builderHallLevel && <span><Hammer />BH{player.builderHallLevel}</span>}
          </div>
          <small className="sync-time">
            <Clock3 />{t("overview.syncedAt", { time: syncedAt?.toLocaleTimeString("vi-VN") || t("overview.syncedFromCache") })}
          </small>
        </div>
      </section>
      <section className="stats">
        <article className="flex-col !items-stretch !justify-center gap-1.5">
          <div className="flex items-center gap-2">
            <Crown className="shrink-0" />
            <div className="min-w-0 flex-1">
              <small>{t("overview.heroStat")}</small>
              <strong>
                {homeHeroes.length} · <AnimatedCounter value={progress.heroes} suffix="%" />
              </strong>
            </div>
          </div>
          <AnimatedProgressBar
            percent={progress.heroes}
            className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-0.5"
            barClassName="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
          />
        </article>
        <article className="flex-col !items-stretch !justify-center gap-1.5">
          <div className="flex items-center gap-2">
            <Users className="shrink-0" />
            <div className="min-w-0 flex-1">
              <small>{t("overview.troopsUnlockedStat")}</small>
              <strong>
                {homeTroops.filter((x) => !x.name.startsWith("Super ")).length} ·{" "}
                <AnimatedCounter value={progress.troops} suffix="%" />
              </strong>
            </div>
          </div>
          <AnimatedProgressBar
            percent={progress.troops}
            className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-0.5"
            barClassName="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-300"
          />
        </article>
        <article className="flex-col !items-stretch !justify-center gap-1.5">
          <div className="flex items-center gap-2">
            <FlaskConical className="shrink-0" />
            <div className="min-w-0 flex-1">
              <small>{t("overview.spellsUnlockedStat")}</small>
              <strong>
                {homeSpells.length} · <AnimatedCounter value={progress.spells} suffix="%" />
              </strong>
            </div>
          </div>
          <AnimatedProgressBar
            percent={progress.spells}
            className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-0.5"
            barClassName="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-300"
          />
        </article>
        <article className="flex-col !items-stretch !justify-center gap-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="shrink-0" />
            <div className="min-w-0 flex-1">
              <small>{t("overview.equipmentStat")}</small>
              <strong>
                {equipment.length} · <AnimatedCounter value={progress.equipment} suffix="%" />
              </strong>
            </div>
          </div>
          <AnimatedProgressBar
            percent={progress.equipment}
            className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-0.5"
            barClassName="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
          />
        </article>
      </section>
    </>
  );
}

