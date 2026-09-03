import { useEffect, useMemo, useState, useRef } from "react";
import { AlertTriangle, ClipboardPaste, Info, LoaderCircle, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { usePlayer } from "./hooks/usePlayer";
import { useGameDatabase, getTownHallInfo } from "./hooks/useGameDatabase";
import { readStoredRecord, writeStoredRecord } from "./storage/playerStorage";
import { clampInteger, extractDataLevels, type VillagePasteReport, type VillagePasteData, type VillagePasteChange } from "./utils/villageImport";
import { normalizeTag, pct } from "./utils/formatters";
import { villageDataIdMap } from "./villageDataMap";
import { upgradeItems } from "./upgradeData";
import { BasePlannerTab } from "./components/BasePlannerTab";

import { EmptyPlayerState } from "./components/app/EmptyPlayerState";
import { PlayerProfile } from "./components/app/PlayerProfile";
import { Roadmap } from "./components/app/Roadmap";
import { UpgradeTracker } from "./components/app/UpgradeTracker";
import { RosterGroup } from "./components/app/Roster";
import { manualKey } from "./utils/upgradeLogic";

export type Tab = "overview" | "planner" | "roadmap" | "base-planner";

const plannerItems = upgradeItems.filter(item => item.kind !== "wall");
const byUnlock = (a: any, b: any) => a.unlockTownHall - b.unlockTownHall || a.name.localeCompare(b.name);
const rosterHeroes = upgradeItems.filter(i => i.kind === "hero").sort(byUnlock);
const rosterTroops = upgradeItems.filter(i => i.kind === "troop").sort(byUnlock);
const rosterSpells = upgradeItems.filter(i => i.kind === "spell").sort(byUnlock);
const rosterSiege = upgradeItems.filter(i => i.kind === "siege").sort(byUnlock);
const rosterPets = upgradeItems.filter(i => i.kind === "pet").sort(byUnlock);
const rosterEquipment = upgradeItems.filter(i => i.kind === "equipment")
  .sort((a, b) => a.unlockTownHall - b.unlockTownHall || (a.owner || "").localeCompare(b.owner || "") || a.name.localeCompare(b.name));

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [prevTab, setPrevTab] = useState<Tab>("overview");
  const [guestTownHall, setGuestTownHall] = useState(() => {
    const saved = Number(localStorage.getItem("coc-guest-townhall"));
    return Number.isFinite(saved) && saved >= 1 && saved <= 18 ? saved : 8;
  });

  const handleTabChange = (nextTab: Tab) => {
    if (nextTab !== tab) {
      if (tab !== "base-planner") {
        setPrevTab(tab);
      }
      setTab(nextTab);
    }
  };
  const [manualLevels, setManualLevels] = useState<Record<string, number>>(() => readStoredRecord<number>("coc-manual-levels"));
  const [pasteText, setPasteText] = useState("");
  const [pasteReport, setPasteReport] = useState<VillagePasteReport | null>(null);
  const [, bumpDbVersion] = useState(0);

  const [input, setInput] = useState("");
  const { player, loading, error, syncedAt, load } = usePlayer();
  const { warnings } = useGameDatabase(() => bumpDbVersion(v => v + 1));
  const isStale = Boolean(player && syncedAt && (Date.now() - syncedAt.getTime() > 1000 * 60 * 60 * 2));

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tag = searchParams.get("tag");
    if (tag) {
      setInput(tag);
      load(tag);
    }
  }, [load]);

  const loadPlayer = () => {
    const tag = normalizeTag(input);
    if (tag) {
      load(tag);
      window.history.replaceState({}, "", `?tag=${encodeURIComponent(tag)}`);
    }
  };

  const { homeHeroes, homeTroops, homeSpells, equipment, progress } = useMemo(() => {
    if (!player) return { homeHeroes: [], homeTroops: [], homeSpells: [], equipment: [], progress: { heroes: 0, troops: 0, spells: 0, equipment: 0 } };
    const hH = (player.heroes || []).filter(x => x.village === "home");
    const hT = (player.troops || []).filter(x => x.village === "home");
    const hS = (player.spells || []).filter(x => x.village === "home");
    const eq = player.heroEquipment || [];
    return {
      homeHeroes: hH, homeTroops: hT, homeSpells: hS, equipment: eq,
      progress: {
        heroes: pct(hH),
        troops: pct(hT),
        spells: pct(hS),
        equipment: pct(eq)
      }
    };
  }, [player]);

  const manualUpgradeItems = useMemo(() => plannerItems.filter(item => !item.apiTracked && item.unlockTownHall <= (player?.townHallLevel || guestTownHall)), [player, guestTownHall]);
  const manualByKind = useMemo(() => manualUpgradeItems.reduce((groups, item) => {
    (groups[item.kind] ||= []).push(item);
    return groups;
  }, {} as Record<string, any[]>), [manualUpgradeItems]);
  const manualFilled = manualUpgradeItems.filter(item => (manualLevels[manualKey(player, item)] || 0) > 0).length;
  const manualPercent = manualUpgradeItems.length > 0 ? Math.round((manualFilled / manualUpgradeItems.length) * 100) : 0;

  const handleManualChange = (item: any, value: string) => {
    const level = clampInteger(value, 0, item.levels[item.levels.length - 1]?.level || 1);
    setManualLevels(prev => {
      const next = { ...prev, [manualKey(player, item)]: level };
      writeStoredRecord("coc-manual-levels", next);
      return next;
    });
  };

  const applyVillagePaste = () => {
    try {
      const parsed = extractDataLevels(pasteText);
      const changes: VillagePasteChange[] = [];
      const nextManual = { ...manualLevels };
      for (const [dataId, lvl] of parsed.levels) {
        const itemId = villageDataIdMap[dataId];
        if (!itemId) continue;
        const item = upgradeItems.find(x => x.id === itemId);
        if (!item || item.apiTracked) continue;
        const key = manualKey(player, item);
        const old = nextManual[key] || 0;
        if (old !== lvl) {
          nextManual[key] = lvl;
          changes.push({ id: item.id, name: item.name, kind: item.kind, before: old, after: lvl });
        }
      }
      writeStoredRecord("coc-manual-levels", nextManual);
      setManualLevels(nextManual);
      setPasteText("");
      setPasteReport({ changes, updated: changes.length });
    } catch (err: any) {
      setPasteReport({ error: err?.message || "Dữ liệu không hợp lệ.", changes: [] });
    }
  };

  const cacheWarning = !player && input && !loading && !error;

  return (
    <main className={`app ${tab === "base-planner" ? "base-planner-full" : ""}`}>
      <header className="topbar">
        <div className="brand"><span className="crest"><ShieldCheck /></span><div><small>CLASH PATH</small><strong>Roadmap đồng bộ War Report</strong></div></div>
        <form className="searchbox" onSubmit={e => { e.preventDefault(); loadPlayer() }}>
          <Search /><input value={input} onChange={e => setInput(e.target.value)} placeholder="Nhập Player Tag, ví dụ #R0CV8RVU2" aria-label="Player Tag" /><button disabled={loading}>{loading ? <LoaderCircle className="spin" /> : "Tải tài khoản"}</button>
        </form>
        <button className="icon-button" onClick={() => loadPlayer()} disabled={loading} title="Đồng bộ lại"><RefreshCw className={loading ? "spin" : ""} /></button>
      </header>

      {error && <div className="error-banner"><AlertTriangle /><span>{error}</span></div>}
      {cacheWarning && <div className="error-banner" style={{ marginTop: "10px", backgroundColor: "#ffc85717", borderColor: "#ffc85750", color: "#ffd678" }}>
        <Info /><span>Hệ thống chỉ có thể tìm thấy Player Tag hợp lệ nếu tài khoản đó đã được tìm kiếm ít nhất một lần trên War Report. Thử mở hồ sơ của bạn trên trang war-report.com trước, sau đó quay lại đây.</span>
      </div>}
      {isStale && <div className="error-banner" style={{ marginTop: "10px", backgroundColor: "#3498db17", borderColor: "#3498db50", color: "#85c1e9" }}>
        <Info /><span>Dữ liệu hiển thị là bản lưu trên máy từ lần đồng bộ trước (có thể đã cũ). Hãy bấm "Tải tài khoản" hoặc nút Làm mới góc trên bên phải để cập nhật số liệu mới nhất.</span>
      </div>}
      {warnings.length > 0 && <div className="error-banner" style={{ marginTop: "10px", backgroundColor: "#ffc85717", borderColor: "#ffc85750", color: "#ffd678" }}>
        <AlertTriangle />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>Cảnh báo dữ liệu:</strong>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>}

      {player && tab !== "base-planner" && (
        <PlayerProfile player={player} syncedAt={syncedAt} homeHeroes={homeHeroes} homeTroops={homeTroops} homeSpells={homeSpells} equipment={equipment} progress={progress} />
      )}

      <nav className="tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => handleTabChange("overview")}>Hồ sơ người chơi</button>
        <button className={tab === "planner" ? "active" : ""} onClick={() => handleTabChange("planner")}>Upgrade Tracker</button>
        <button className={tab === "roadmap" ? "active" : ""} onClick={() => handleTabChange("roadmap")}>Roadmap TH1–18</button>
        <button className={tab === "base-planner" ? "active" : ""} onClick={() => handleTabChange("base-planner")}>
          Base Planner (Lưới 44x44)
        </button>
      </nav>

      {tab === "overview" && (!player ? <EmptyPlayerState loading={loading} /> : <>
        <section className="panel army-panel">
          <p className="roster-hint"><Info />Hiển thị toàn bộ hero/quân/phép/pet/máy công thành có trong game — mục nào chưa mở khóa vẫn hiện, làm mờ và có khóa; rê chuột vào để xem điều kiện mở.</p>
          <RosterGroup title="Hero" subtitle="Toàn bộ hero hiện có trong game" items={rosterHeroes} player={player} manualLevels={manualLevels} />
          <RosterGroup title="Quân đội" subtitle="Quân thường dùng để tấn công (không tính quân Super tạm thời)" items={rosterTroops} player={player} manualLevels={manualLevels} />
          <RosterGroup title="Phép thuật" subtitle="Phép từ Spell Factory và Dark Spell Factory" items={rosterSpells} player={player} manualLevels={manualLevels} />
          <RosterGroup title="Máy công thành" subtitle="Mở khóa qua Workshop, dùng để phá lớp phòng thủ ngoài" items={rosterSiege} player={player} manualLevels={manualLevels} />
          <RosterGroup title="Pet" subtitle="Ghép cùng hero qua Pet House" items={rosterPets} player={player} manualLevels={manualLevels} />
          <RosterGroup title="Trang bị" subtitle="Toàn bộ trang bị hero, nâng qua Blacksmith — xem nhãn hero trên từng thẻ" items={rosterEquipment} player={player} manualLevels={manualLevels} />
        </section>
        <section className="panel village-panel">
          <div className="section-head">
            <div><p>NHẬP DỮ LIỆU KHÔNG CÓ TRONG API</p><h2>Tình trạng công trình và bẫy</h2></div>
            <span className="road-current">{manualFilled}/{manualUpgradeItems.length} đã nhập · {manualPercent}%</span>
          </div>
          <div className="paste-panel">
            <p><Info />War Report không cung cấp cấp độ của công trình phòng thủ, bẫy và máy khai thác. Bạn có thể tự nhập tay ở dưới hoặc dùng tool <b>Clash Mini Scraper</b> để lấy dữ liệu json dán vào đây cập nhật hàng loạt.</p>
            <div className="paste-controls">
              <input value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Dán mã dữ liệu (JSON) vào đây..." />
              <button onClick={applyVillagePaste} disabled={!pasteText.trim()}><ClipboardPaste /> Áp dụng</button>
            </div>
            {pasteReport && (
              <div className={`paste-report ${pasteReport.error ? "error" : "success"}`}>
                {pasteReport.error ? pasteReport.error
                  : (pasteReport.changes || []).length === 0 ? "Dữ liệu hợp lệ nhưng không có cấp độ nào thay đổi."
                    : `Đã cập nhật ${(pasteReport.changes || []).length} công trình: ${(pasteReport.changes || []).map(c => `${c.name} lên Lv ${c.after}`).join(", ")}.`}
              </div>
            )}
          </div>
          <div className="manual-grid">
            {Object.entries(manualByKind).map(([kind, items]) => (
              <div className="manual-group" key={kind}>
                <h3>{kind === "building" ? "Tài nguyên & Quân sự" : kind === "defense" ? "Phòng thủ" : "Bẫy"}</h3>
                <div className="manual-items">
                  {items.map(item => {
                    const k = manualKey(player, item);
                    const val = manualLevels[k] || 0;
                    const max = item.levels[item.levels.length - 1]?.level || 1;
                    return (
                      <label key={item.id}>
                        <span>{item.name} <em>Max {max}</em></span>
                        <input type="number" min="0" max={max} value={val || ""} placeholder="0" onChange={e => handleManualChange(item, e.target.value)} />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {manualUpgradeItems.length === 0 && <p className="no-data">Chưa mở khóa công trình nào ở mốc Town Hall này.</p>}
          </div>
        </section>
      </>)}

      {tab === "planner" && <UpgradeTracker player={player} manualLevels={manualLevels} guestTownHall={guestTownHall} setGuestTownHall={setGuestTownHall} setManualLevels={setManualLevels} />}
      {tab === "roadmap" && <Roadmap player={player} loading={loading} />}
      {tab === "base-planner" && (
        <BasePlannerTab
          initialTownHall={player?.townHallLevel || guestTownHall || 11}
          onBackToPreviousTab={() => handleTabChange(prevTab || "overview")}
        />
      )}

      {tab !== "base-planner" && (
        <footer>
          <span>Dữ liệu người chơi: War Report / API chính thức Clash of Clans</span>
          <span>Tiến độ thủ công lưu riêng theo từng Player Tag</span>
          <span>Nội dung không chính thức, không được Supercell xác nhận hay ủng hộ. Xem Fan Content Policy tại supercell.com/en/fan-content-policy</span>
        </footer>
      )}
    </main>
  );
}
