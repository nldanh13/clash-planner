import { useState, useEffect } from "react";
import {
  Database,
  LoaderCircle,
  Lock,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  FolderGit2,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Sparkles,
  Layers
} from "lucide-react";
import { useTranslation } from "../i18n";

interface ManifestCategory {
  name: string;
  total: number;
  local: number;
  folder: string;
}

interface ManifestItem {
  id: string;
  name: string;
  kind: string;
  category: string;
  owner?: string | null;
  localPath: string;
  format: string;
  available: boolean;
  sizeBytes: number;
}

interface AssetsManifest {
  updatedAt: string;
  version: string;
  summary: {
    totalItems: number;
    totalLocal: number;
    coveragePercent: number;
    categories: Record<string, ManifestCategory>;
  };
  items: ManifestItem[];
}

export function AdminPanel() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"repository" | "gallery" | "scraper">("repository");

  // Asset Repository state
  const [manifest, setManifest] = useState<AssetsManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [syncingImages, setSyncingImages] = useState(false);
  const [forceSync, setForceSync] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string; output?: string } | null>(null);

  // Gallery state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Scraper state
  const [updatingScraper, setUpdatingScraper] = useState(false);
  const [scraperResult, setScraperResult] = useState<{ type: "success" | "error"; message: string; output?: string } | null>(null);

  const fetchAssetsStatus = async () => {
    setLoadingManifest(true);
    try {
      const res = await fetch("/api/admin/assets-status");
      if (res.ok) {
        const data = await res.json();
        setManifest(data);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu kho ảnh:", err);
    } finally {
      setLoadingManifest(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchAssetsStatus();
    }
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() !== "") {
      setAuthenticated(true);
    }
  };

  const handleSyncImages = async (force: boolean) => {
    const actionText = force
      ? t("admin.confirmRefreshAll")
      : t("admin.confirmIncrementalSync");

    if (!window.confirm(actionText)) return;

    setSyncingImages(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/download-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        },
        body: JSON.stringify({ force })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("admin.syncImagesError"));

      setSyncResult({
        type: "success",
        message: t("admin.syncSuccess", { message: data.message }),
        output: data.output
      });
      await fetchAssetsStatus();
    } catch (err: any) {
      setSyncResult({ type: "error", message: t("admin.errorPrefix", { message: err.message }) });
    } finally {
      setSyncingImages(false);
    }
  };

  const handleUpdateScraper = async () => {
    if (!window.confirm(t("admin.confirmScraperUpdate"))) return;
    setUpdatingScraper(true);
    setScraperResult(null);
    try {
      const res = await fetch("/api/admin/update-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("admin.scraperUpdateError"));

      setScraperResult({
        type: "success",
        message: t("admin.scraperSuccess"),
        output: data.output
      });
      await fetchAssetsStatus();
    } catch (err: any) {
      setScraperResult({ type: "error", message: t("admin.errorPrefix", { message: err.message }) });
    } finally {
      setUpdatingScraper(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ maxWidth: "420px", margin: "50px auto", padding: "24px", background: "#101b25", borderRadius: "12px", border: "1px solid #2a3a4a", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
        <h2 style={{ fontSize: "17px", color: "var(--gold)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Lock size={20} /> {t("admin.login.title")}
        </h2>
        <p style={{ fontSize: "13px", color: "#9fb0bb", marginBottom: "16px", lineHeight: "1.5" }}>
          {t("admin.login.description")}
        </p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="password"
            placeholder={t("admin.login.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "11px 14px", borderRadius: "8px", border: "1px solid #35495a", background: "#08131c", color: "#fff", outline: "none", fontSize: "14px" }}
            autoFocus
          />
          <button
            type="submit"
            style={{ padding: "11px", borderRadius: "8px", background: "linear-gradient(#ffd678, #e8a73a)", color: "#1e1406", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "14px" }}
          >
            {t("admin.login.submit")}
          </button>
        </form>
      </div>
    );
  }

  const filteredItems = (manifest?.items || []).filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || (item.owner && item.owner.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ maxWidth: "1100px", margin: "20px auto", padding: "24px", background: "#101b25", borderRadius: "14px", border: "1px solid #2a3a4a", color: "#e6edf2" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "14px", marginBottom: "20px", borderBottom: "1px solid #243545", paddingBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "20px", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={24} color="var(--gold)" /> {t("admin.header.title")}
          </h2>
          <p style={{ fontSize: "13px", color: "#9fb0bb", margin: "4px 0 0 0" }}>
            {t("admin.header.descriptionPrefix")} <code style={{ color: "#7cd3ff", background: "#08131c", padding: "2px 6px", borderRadius: "4px" }}>public/</code> {t("admin.header.descriptionSuffix")}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={fetchAssetsStatus}
            disabled={loadingManifest}
            aria-label={t("admin.header.refreshManifest")}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1a2936", border: "1px solid #35495a", color: "#7cd3ff", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}
          >
            <RefreshCw size={14} className={loadingManifest ? "spin" : ""} /> {loadingManifest ? t("admin.header.checking") : t("admin.header.checkRepo")}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #243545", paddingBottom: "12px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("repository")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 16px",
            borderRadius: "8px",
            border: activeTab === "repository" ? "1px solid var(--gold)" : "1px solid transparent",
            background: activeTab === "repository" ? "rgba(255, 214, 120, 0.12)" : "#0d1720",
            color: activeTab === "repository" ? "var(--gold)" : "#9fb0bb",
            fontWeight: activeTab === "repository" ? "bold" : "normal",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          <FolderGit2 size={16} /> {t("admin.tabs.repository")}
        </button>

        <button
          onClick={() => setActiveTab("gallery")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 16px",
            borderRadius: "8px",
            border: activeTab === "gallery" ? "1px solid var(--gold)" : "1px solid transparent",
            background: activeTab === "gallery" ? "rgba(255, 214, 120, 0.12)" : "#0d1720",
            color: activeTab === "gallery" ? "var(--gold)" : "#9fb0bb",
            fontWeight: activeTab === "gallery" ? "bold" : "normal",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          <ImageIcon size={16} /> {manifest ? t("admin.tabs.galleryCount", { available: manifest.summary.totalLocal, total: manifest.summary.totalItems }) : t("admin.tabs.galleryLoading")}
        </button>

        <button
          onClick={() => setActiveTab("scraper")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 16px",
            borderRadius: "8px",
            border: activeTab === "scraper" ? "1px solid var(--gold)" : "1px solid transparent",
            background: activeTab === "scraper" ? "rgba(255, 214, 120, 0.12)" : "#0d1720",
            color: activeTab === "scraper" ? "var(--gold)" : "#9fb0bb",
            fontWeight: activeTab === "scraper" ? "bold" : "normal",
            fontSize: "13px",
            cursor: "pointer"
          }}
        >
          <Database size={16} /> {t("admin.tabs.scraper")}
        </button>
      </div>

      {/* Tab 1: Kho ảnh trên Git & Đồng bộ */}
      {activeTab === "repository" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status Banner */}
          <div style={{ padding: "18px", background: "#0d1720", borderRadius: "10px", border: "1px solid #35495a", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <CheckCircle2 size={18} color="#2ecc71" />
                <span style={{ fontSize: "15px", fontWeight: "bold", color: "#fff" }}>
                  {t("admin.repository.statusLabel")} {manifest ? t("admin.repository.statusValue", { available: manifest.summary.totalLocal, total: manifest.summary.totalItems, percent: manifest.summary.coveragePercent }) : t("admin.repository.checking")}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#9fb0bb", margin: 0, lineHeight: 1.5 }}>
                {t("admin.repository.descriptionPrefix")} <code style={{ color: "#ffd678" }}>public/</code>{t("admin.repository.descriptionSuffix")}
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: manifest?.summary.coveragePercent === 100 ? "#2ecc71" : "var(--gold)" }}>
                {manifest ? `${manifest.summary.coveragePercent}%` : "--"}
              </div>
              <div style={{ fontSize: "11px", color: "#7cd3ff" }}>{t("admin.repository.coverageLabel")}</div>
            </div>
          </div>

          {/* Categories Grid */}
          <div>
            <h3 style={{ fontSize: "14px", color: "var(--gold)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} /> {t("admin.repository.categoriesTitle")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {manifest?.summary.categories &&
                Object.entries(manifest.summary.categories).map(([key, cat]) => {
                  const isFull = cat.local === cat.total;
                  return (
                    <div key={key} style={{ padding: "14px", background: "#0c151e", borderRadius: "8px", border: "1px solid #233444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#fff" }}>{cat.name}</div>
                        <div style={{ fontSize: "11px", color: "#7cd3ff", marginTop: "2px" }}>public/{cat.folder}/</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", color: isFull ? "#2ecc71" : "#ffd678" }}>
                          {cat.local} / {cat.total}
                        </div>
                        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: isFull ? "rgba(46, 204, 113, 0.15)" : "rgba(255, 214, 120, 0.15)", color: isFull ? "#2ecc71" : "#ffd678" }}>
                          {isFull ? t("admin.repository.full") : t("admin.repository.missing")}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Sync Controls */}
          <div style={{ padding: "18px", background: "#0d1720", borderRadius: "10px", border: "1px solid #35495a" }}>
            <h3 style={{ fontSize: "15px", color: "#fff", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <HardDrive size={18} color="var(--gold)" /> {t("admin.repository.smartUpdateTitle")}
            </h3>
            <p style={{ fontSize: "13px", color: "#9fb0bb", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              {t("admin.repository.smartUpdateDescriptionPrefix")} <strong style={{ color: "#fff" }}>{t("admin.repository.smartUpdateBold")}</strong>{t("admin.repository.smartUpdateDescriptionSuffix")}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}>
              <button
                onClick={() => handleSyncImages(false)}
                disabled={syncingImages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(#ffd678, #e8a73a)",
                  border: "none",
                  color: "#1e1406",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: syncingImages ? "not-allowed" : "pointer",
                  opacity: syncingImages ? 0.7 : 1
                }}
              >
                {syncingImages ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
                {syncingImages ? t("admin.repository.syncing") : t("admin.repository.syncIncremental")}
              </button>

              <button
                onClick={() => handleSyncImages(true)}
                disabled={syncingImages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#1e2c3a",
                  border: "1px solid #3c5268",
                  color: "#ffd678",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  cursor: syncingImages ? "not-allowed" : "pointer"
                }}
              >
                <RefreshCw size={15} /> {t("admin.repository.syncForce")}
              </button>
            </div>

            {syncResult && (
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "8px", background: syncResult.type === "success" ? "#132b1f" : "#3d1c1c", border: `1px solid ${syncResult.type === "success" ? "#2ecc71" : "#e74c3c"}` }}>
                <p style={{ margin: 0, fontSize: "13px", color: syncResult.type === "success" ? "#2ecc71" : "#e74c3c", fontWeight: "bold" }}>
                  {syncResult.message}
                </p>
                {syncResult.output && (
                  <pre style={{ marginTop: "10px", padding: "10px", background: "#050b10", color: "#a8b5c2", fontSize: "11px", borderRadius: "6px", overflowX: "auto", maxHeight: "250px" }}>
                    {syncResult.output}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Thư viện duyệt ảnh Offline */}
      {activeTab === "gallery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between", background: "#0d1720", padding: "14px", borderRadius: "10px", border: "1px solid #2a3a4a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#071018", border: "1px solid #2f4356", borderRadius: "8px", padding: "6px 12px", minWidth: "260px" }}>
              <Search size={16} color="#7cd3ff" />
              <input
                type="text"
                placeholder={t("admin.gallery.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "13px", width: "100%" }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "all", label: t("admin.gallery.filters.all") },
                { id: "town-halls", label: t("admin.gallery.filters.townHalls") },
                { id: "buildings", label: t("admin.gallery.filters.buildings") },
                { id: "heroes", label: t("admin.gallery.filters.heroes") },
                { id: "troops", label: t("admin.gallery.filters.troops") },
                { id: "spells", label: t("admin.gallery.filters.spells") },
                { id: "equipment", label: t("admin.gallery.filters.equipment") },
                { id: "pets", label: t("admin.gallery.filters.pets") }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: selectedCategory === c.id ? "1px solid var(--gold)" : "1px solid #233444",
                    background: selectedCategory === c.id ? "rgba(255, 214, 120, 0.15)" : "#0c151e",
                    color: selectedCategory === c.id ? "var(--gold)" : "#9fb0bb",
                    cursor: "pointer"
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#9fb0bb" }}>
            {t("admin.gallery.showingCount", { count: filteredItems.length })}
          </div>

          {/* Grid Gallery */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))", gap: "10px", maxHeight: "650px", overflowY: "auto", paddingRight: "4px" }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#0c151e",
                  border: "1px solid #233444",
                  borderRadius: "8px",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "6px"
                }}
              >
                <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", background: "#060c12", borderRadius: "8px", overflow: "hidden", border: "1px solid #1c2b38" }}>
                  <img
                    src={item.localPath}
                    alt={item.name}
                    loading="lazy"
                    style={{ maxWidth: "56px", maxHeight: "56px", objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                    }}
                  />
                </div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>
                  {item.name}
                </div>
                {item.owner && (
                  <div style={{ fontSize: "10px", color: "var(--gold)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.owner}>
                    {item.owner}
                  </div>
                )}
                <div style={{ display: "flex", gap: "4px", fontSize: "10px", color: "#7cd3ff" }}>
                  <span>{item.format.toUpperCase()}</span>
                  <span>•</span>
                  <span>{Math.round(item.sizeBytes / 1024)} KB</span>
                </div>
                <span style={{ fontSize: "10px", color: "#2ecc71", display: "flex", alignItems: "center", gap: "2px" }}>
                  <CheckCircle2 size={10} /> {t("admin.gallery.ready")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Cập nhật Scraper Dữ liệu Clash of Clans */}
      {activeTab === "scraper" && (
        <div style={{ padding: "18px", background: "#0d1720", borderRadius: "10px", border: "1px solid #35495a", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ fontSize: "15px", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={18} color="var(--gold)" /> {t("admin.scraper.title")}
          </h3>
          <p style={{ fontSize: "13px", color: "#9fb0bb", margin: 0, lineHeight: 1.5 }}>
            {t("admin.scraper.description")}
          </p>

          <div>
            <button
              onClick={handleUpdateScraper}
              disabled={updatingScraper}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(#ffd678, #e8a73a)",
                border: "none",
                color: "#1e1406",
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: updatingScraper ? "not-allowed" : "pointer",
                opacity: updatingScraper ? 0.7 : 1
              }}
            >
              {updatingScraper ? <LoaderCircle className="spin" size={16} /> : <Database size={16} />}
              {updatingScraper ? t("admin.scraper.scanning") : t("admin.scraper.start")}
            </button>
          </div>

          {scraperResult && (
            <div style={{ marginTop: "10px", padding: "14px", borderRadius: "8px", background: scraperResult.type === "success" ? "#132b1f" : "#3d1c1c", border: `1px solid ${scraperResult.type === "success" ? "#2ecc71" : "#e74c3c"}` }}>
              <p style={{ margin: 0, fontSize: "13px", color: scraperResult.type === "success" ? "#2ecc71" : "#e74c3c", fontWeight: "bold" }}>
                {scraperResult.message}
              </p>
              {scraperResult.output && (
                <pre style={{ marginTop: "10px", padding: "10px", background: "#050b10", color: "#a8b5c2", fontSize: "11px", borderRadius: "6px", overflowX: "auto", maxHeight: "250px" }}>
                  {scraperResult.output}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
