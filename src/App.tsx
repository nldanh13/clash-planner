import { useEffect, useMemo, useState, useRef } from "react";
import { AlertTriangle, ClipboardPaste, Info, LoaderCircle, RefreshCw, Search, ShieldCheck, Database } from "lucide-react";
import { usePlayer } from "./hooks/usePlayer";

import { AdminPanel } from "./components/AdminPanel";
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
import { PWAInstallButton } from "./components/PWAInstallButton";
import { UserMenu } from "./components/UserMenu";
import { PlayerSearchModal, saveRecentSearch } from "./components/PlayerSearchModal";
import { useCloudSync } from "./hooks/useCloudSync";
import { HomeTab } from "./components/app/HomeTab";
import { useTranslation } from "./i18n";

export type Tab = "home" | "overview" | "planner" | "roadmap" | "base-planner" | "admin";

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
  const { t } = useTranslation();
  useCloudSync();
  const [tab, setTab] = useState<Tab>("home");
  const [prevTab, setPrevTab] = useState<Tab>("home");
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
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

  // Save to recent search history when player is loaded
  useEffect(() => {
    if (player?.tag) {
      saveRecentSearch(player.tag, player.name, player.townHallLevel);
    }
  }, [player?.tag, player?.name, player?.townHallLevel]);

  // Keyboard shortcut to open search modal: "/" or Cmd/Ctrl+K
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (
        (e.key === "/" && targetTag !== "INPUT" && targetTag !== "TEXTAREA") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const loadPlayer = () => {
    const tag = normalizeTag(input || (player ? `#${player.tag}` : ""));
    if (tag) {
      load(tag);
      window.history.replaceState({}, "", `?tag=${encodeURIComponent(tag)}`);
    } else {
      setIsSearchModalOpen(true);
    }
  };

  const handleSearchTag = (tag: string) => {
    const clean = normalizeTag(tag);
    if (clean) {
      setInput(clean);
      load(clean);
      window.history.replaceState({}, "", `?tag=${encodeURIComponent(clean)}`);
      if (tab === "home") {
        setTab("overview");
      }
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
      setPasteReport({ error: err?.message || t("app.overviewTab.pasteInvalid"), changes: [] });
    }
  };

  const cacheWarning = !player && input && !loading && !error;

  return (
    <main className="app">
      <div className="app-header-area">
        <header className="topbar">
          <div className="brand" onClick={() => handleTabChange("home")} style={{ cursor: "pointer" }}>
            <span className="crest"><ShieldCheck /></span>
            <div>
              <strong>{t("app.brandName")}</strong>
              <small>{t("app.brandTagline")}</small>
            </div>
          </div>

          <nav className="topbar-nav" aria-label="Main Navigation">
            <button className={tab === "home" ? "active" : ""} onClick={() => handleTabChange("home")}>
              {t("app.nav.home")}
            </button>
            <button className={tab === "overview" ? "active" : ""} onClick={() => handleTabChange("overview")}>
              {t("app.nav.overview")}
            </button>
            <button className={tab === "planner" ? "active" : ""} onClick={() => handleTabChange("planner")}>
              {t("app.nav.planner")}
            </button>
            <button className={tab === "roadmap" ? "active" : ""} onClick={() => handleTabChange("roadmap")}>
              {t("app.nav.roadmap")}
            </button>
            <button className={tab === "base-planner" ? "active" : ""} onClick={() => handleTabChange("base-planner")}>
              {t("app.nav.basePlanner")}
            </button>
          </nav>

          <div className="topbar-actions">
            <PWAInstallButton />
            <div className="topbar-sep" />
            <UserMenu />
          </div>
        </header>
      </div>

      {/* Player Search Modal */}
      <PlayerSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleSearchTag}
        currentTag={input || (player ? `#${player.tag}` : "")}
        loading={loading}
      />

      {error && <div className="error-banner"><AlertTriangle /><span>{error}</span></div>}
      {cacheWarning && <div className="error-banner" style={{ marginTop: "10px", backgroundColor: "#ffc85717", borderColor: "#ffc85750", color: "#ffd678" }}>
        <Info /><span>{t("app.banners.notFound")}</span>
      </div>}
      {isStale && <div className="error-banner" style={{ marginTop: "10px", backgroundColor: "#3498db17", borderColor: "#3498db50", color: "#85c1e9" }}>
        <Info /><span>{t("app.banners.stale", { syncLabel: t("common.syncProfile") })}</span>
      </div>}
      {warnings.length > 0 && <div className="error-banner" style={{ marginTop: "10px", backgroundColor: "#ffc85717", borderColor: "#ffc85750", color: "#ffd678" }}>
        <AlertTriangle />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{t("app.banners.dataWarningTitle")}</strong>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>}

      <div className="tab-viewport">
        {tab === "home" && <HomeTab onNavigate={handleTabChange} onOpenSearch={() => setIsSearchModalOpen(true)} />}

        {tab === "overview" && (!player ? <EmptyPlayerState loading={loading} onOpenSearch={() => setIsSearchModalOpen(true)} /> : (
          <div className="overview-tab-content">
            <PlayerProfile 
              player={player} 
              syncedAt={syncedAt} 
              loading={loading}
              onOpenSearch={() => setIsSearchModalOpen(true)}
              onSync={loadPlayer}
              homeHeroes={homeHeroes} 
              homeTroops={homeTroops} 
              homeSpells={homeSpells} 
              equipment={equipment} 
              progress={progress} 
            />
            <section className="panel army-panel">
              <p className="roster-hint"><Info />{t("app.overviewTab.rosterHint")}</p>
              <RosterGroup title={t("common.hero")} subtitle={t("app.overviewTab.groupHeroSubtitle")} items={rosterHeroes} player={player} manualLevels={manualLevels} />
              <RosterGroup title={t("common.troopsFull")} subtitle={t("app.overviewTab.groupTroopSubtitle")} items={rosterTroops} player={player} manualLevels={manualLevels} />
              <RosterGroup title={t("app.overviewTab.spellTitle")} subtitle={t("app.overviewTab.groupSpellSubtitle")} items={rosterSpells} player={player} manualLevels={manualLevels} />
              <RosterGroup title={t("common.siege")} subtitle={t("app.overviewTab.groupSiegeSubtitle")} items={rosterSiege} player={player} manualLevels={manualLevels} />
              <RosterGroup title={t("common.pet")} subtitle={t("app.overviewTab.groupPetSubtitle")} items={rosterPets} player={player} manualLevels={manualLevels} />
              <RosterGroup title={t("common.equipment")} subtitle={t("app.overviewTab.groupEquipmentSubtitle")} items={rosterEquipment} player={player} manualLevels={manualLevels} />
            </section>
            <section className="panel village-panel">
              <div className="section-head">
                <div><p>{t("app.overviewTab.manualEyebrow")}</p><h2>{t("app.overviewTab.manualTitle")}</h2></div>
                <span className="road-current">{t("app.overviewTab.manualCountLabel", { filled: manualFilled, total: manualUpgradeItems.length, percent: manualPercent })}</span>
              </div>
              <div className="paste-panel">
                <p><Info />{t("app.overviewTab.pasteDescription")}</p>
                <div className="paste-controls">
                  <input value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={t("app.overviewTab.pastePlaceholder")} />
                  <button onClick={applyVillagePaste} disabled={!pasteText.trim()}><ClipboardPaste /> {t("app.overviewTab.pasteApply")}</button>
                </div>
                {pasteReport && (
                  <div className={`paste-report ${pasteReport.error ? "error" : "success"}`}>
                    {pasteReport.error ? pasteReport.error
                      : (pasteReport.changes || []).length === 0 ? t("app.overviewTab.pasteNoChange")
                        : t("app.overviewTab.pasteSuccess", {
                            count: (pasteReport.changes || []).length,
                            list: (pasteReport.changes || []).map(c => `${c.name} lên Lv ${c.after}`).join(", "),
                          })}
                  </div>
                )}
              </div>
              <div className="manual-grid">
                {Object.entries(manualByKind).map(([kind, items]) => (
                  <div className="manual-group" key={kind}>
                    <h3>{kind === "building" ? t("app.overviewTab.manualGroupResource") : kind === "defense" ? t("common.defense") : t("common.trap")}</h3>
                    <div className="manual-items">
                      {items.map(item => {
                        const k = manualKey(player, item);
                        const val = manualLevels[k] || 0;
                        const max = item.levels[item.levels.length - 1]?.level || 1;
                        return (
                          <label key={item.id}>
                            <span>{item.name} <em>{t("app.overviewTab.manualMax", { max })}</em></span>
                            <input type="number" min="0" max={max} value={val || ""} placeholder="0" onChange={e => handleManualChange(item, e.target.value)} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {manualUpgradeItems.length === 0 && <p className="no-data">{t("app.overviewTab.manualEmpty")}</p>}
              </div>
            </section>
          </div>
        ))}

        {tab === "planner" && <UpgradeTracker player={player} manualLevels={manualLevels} guestTownHall={guestTownHall} setGuestTownHall={setGuestTownHall} setManualLevels={setManualLevels} />}
        {tab === "roadmap" && <Roadmap player={player} loading={loading} />}
        {tab === "admin" && <AdminPanel />}
        {tab === "base-planner" && (
          <BasePlannerTab
            initialTownHall={player?.townHallLevel || guestTownHall || 11}
            onBackToPreviousTab={() => handleTabChange(prevTab || "overview")}
          />
        )}
      </div>

      {tab !== "base-planner" && (
        <footer>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px" }}>
              <span>{t("app.footer.dataSource")}</span>
              <span>{t("app.footer.manualProgressNote")}</span>
              <button
                onClick={() => handleTabChange("admin")}
                style={{ background: "transparent", border: "none", color: "var(--gold)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px" }}
              >
                <ShieldCheck size={12} /> {t("app.footer.admin")}
              </button>
            </div>
            <span>{t("app.footer.disclaimer")}</span>
          </div>
        </footer>
      )}
    </main>
  );
}
