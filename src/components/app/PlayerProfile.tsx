import { Clock3, Crown, FlaskConical, Hammer, Sparkles, Swords, Trophy, Users, Zap } from "lucide-react";
import type { Player } from "../../types";
import { thImage } from "../SmartArt";

interface PlayerProfileProps {
  player: Player;
  syncedAt: Date | null;
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

export function PlayerProfile({ player, syncedAt, homeHeroes, homeTroops, homeSpells, equipment, progress }: PlayerProfileProps) {
  return (
    <>
      <section className="profile-hero">
        <div className="th-art">
          <div className="aura" />
          <img src={thImage(player.townHallLevel)} alt={`Town Hall ${player.townHallLevel}`} />
          <span>TH<strong>{player.townHallLevel}</strong></span>
        </div>
        <div className="profile-copy">
          <p>HỒ SƠ NGƯỜI CHƠI</p>
          <h1>{player.name}</h1>
          <h2>{player.tag} {player.clan && <>· {player.clan.name}</>}</h2>
          <div className="profile-badges">
            <span><Trophy />{player.trophies} cúp</span>
            <span><Swords />{player.warStars} sao war</span>
            <span><Zap />Cấp kinh nghiệm {player.expLevel}</span>
            {player.builderHallLevel && <span><Hammer />BH{player.builderHallLevel}</span>}
          </div>
          <small className="sync-time">
            <Clock3 />Đồng bộ lúc {syncedAt?.toLocaleTimeString("vi-VN") || "bản lưu trên máy"}
          </small>
        </div>
      </section>
      <section className="stats">
        <article>
          <Crown />
          <div><small>Hero</small><strong>{homeHeroes.length} · {progress.heroes}%</strong></div>
        </article>
        <article>
          <Users />
          <div><small>Quân đã mở</small><strong>{homeTroops.filter(x => !x.name.startsWith("Super ")).length} · {progress.troops}%</strong></div>
        </article>
        <article>
          <FlaskConical />
          <div><small>Phép đã mở</small><strong>{homeSpells.length} · {progress.spells}%</strong></div>
        </article>
        <article>
          <Sparkles />
          <div><small>Trang bị</small><strong>{equipment.length} · {progress.equipment}%</strong></div>
        </article>
      </section>
    </>
  );
}
