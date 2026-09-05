import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Loader2, Search, UploadCloud } from "lucide-react";
import { useTranslation } from "../i18n";
import { BUILDINGS_CATALOG } from "./base-planner/constants";
import { DECORATIONS_CATALOG } from "./base-planner/decorationCatalog";
import { getMaxBuildingLevel } from "./base-planner/buildingLevels";

type UploadTargetKind = "building" | "townhall" | "decoration";

type SlotStatus = { state: "idle" } | { state: "uploading" } | { state: "success" } | { state: "error"; message: string };

interface ImageSlotProps {
  targetKind: UploadTargetKind;
  id: string;
  level?: number;
  label: string;
  password: string;
}

/**
 * One upload slot: a thumbnail (loaded straight from its conventional public/
 * path — no separate "does this exist" API needed, a 404 just renders as an
 * empty placeholder) plus a button that posts a replacement to the server,
 * which resizes/re-encodes it and writes it back to that same path.
 */
function ImageSlot({ targetKind, id, level, label, password }: ImageSlotProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SlotStatus>({ state: "idle" });
  const [cacheBust, setCacheBust] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const relPath =
    targetKind === "townhall"
      ? `/town-halls/th-${level}.png`
      : targetKind === "decoration"
        ? `/decorations/${id}.png`
        : level
          ? `/buildings/${id}-${level}.png`
          : `/buildings/${id}.png`;

  const handleFile = async (file: File) => {
    setStatus({ state: "uploading" });
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("target", targetKind);
      formData.append("id", id);
      if (level !== undefined) formData.append("level", String(level));

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("admin.images.uploadError"));

      setStatus({ state: "success" });
      setCacheBust((c) => c + 1);
    } catch (err: any) {
      setStatus({ state: "error", message: err.message || t("admin.images.uploadError") });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        padding: "10px",
        background: "#0c151e",
        border: "1px solid #233444",
        borderRadius: "8px",
        width: "104px",
      }}
    >
      <div
        style={{
          width: "68px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060c12",
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid #1c2b38",
        }}
      >
        <img
          key={cacheBust}
          src={`${relPath}?v=${cacheBust}`}
          alt={label}
          style={{ maxWidth: "60px", maxHeight: "60px", objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.12";
          }}
          onLoad={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "1";
          }}
        />
      </div>
      <div style={{ fontSize: "10.5px", color: "#9fb0bb", textAlign: "center", lineHeight: 1.2 }}>{label}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status.state === "uploading"}
        title={status.state === "error" ? status.message : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "10.5px",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #35495a",
          background: status.state === "success" ? "rgba(46,204,113,0.15)" : "#1a2936",
          color: status.state === "success" ? "#2ecc71" : status.state === "error" ? "#e74c3c" : "#7cd3ff",
          cursor: status.state === "uploading" ? "not-allowed" : "pointer",
        }}
      >
        {status.state === "uploading" ? (
          <Loader2 size={12} className="spin" />
        ) : status.state === "success" ? (
          <CheckCircle2 size={12} />
        ) : status.state === "error" ? (
          <AlertCircle size={12} />
        ) : (
          <UploadCloud size={12} />
        )}
        {status.state === "uploading" ? t("admin.images.uploading") : t("admin.images.uploadButton")}
      </button>
    </div>
  );
}

interface AdminImageManagerProps {
  password: string;
}

export function AdminImageManager({ password }: AdminImageManagerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nonTownHall = BUILDINGS_CATALOG.filter((d) => d.id !== "town-hall");
  const query = search.toLowerCase().trim();
  const filtered = nonTownHall.filter(
    (d) => !query || d.name.toLowerCase().includes(query) || d.id.toLowerCase().includes(query)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <p style={{ fontSize: "13px", color: "#9fb0bb", margin: 0, lineHeight: 1.5 }}>{t("admin.images.intro")}</p>

      {/* Town Halls */}
      <section>
        <h3 style={{ fontSize: "14px", color: "var(--gold)", marginBottom: "12px" }}>{t("admin.images.townHallsTitle")}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => (
            <ImageSlot key={lvl} targetKind="townhall" id="town-hall" level={lvl} label={`TH ${lvl}`} password={password} />
          ))}
        </div>
      </section>

      {/* Buildings, per level */}
      <section>
        <h3 style={{ fontSize: "14px", color: "var(--gold)", marginBottom: "12px" }}>
          {t("admin.images.buildingsTitle", { count: nonTownHall.length })}
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#071018",
            border: "1px solid #2f4356",
            borderRadius: "8px",
            padding: "6px 12px",
            marginBottom: "12px",
            maxWidth: "320px",
          }}
        >
          <Search size={16} color="#7cd3ff" />
          <input
            type="text"
            placeholder={t("admin.images.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", color: "#fff", outline: "none", fontSize: "13px", width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((def) => {
            const isOpen = expanded.has(def.id);
            const maxLevel = getMaxBuildingLevel(18, def.id);
            return (
              <div key={def.id} style={{ background: "#0d1720", border: "1px solid #233444", borderRadius: "8px", overflow: "hidden" }}>
                <button
                  onClick={() => toggle(def.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isOpen ? <ChevronDown size={14} color="#7cd3ff" /> : <ChevronRight size={14} color="#7cd3ff" />}
                    {def.name}
                    <span style={{ fontSize: "10px", color: "#9fb0bb" }}>({def.id})</span>
                  </span>
                  <span style={{ fontSize: "11px", color: "#9fb0bb" }}>
                    {t("admin.images.levelCount", { count: maxLevel })}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "0 14px 14px 14px" }}>
                    {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
                      <ImageSlot
                        key={lvl}
                        targetKind="building"
                        id={def.id}
                        level={lvl}
                        label={t("admin.images.levelLabel", { level: lvl })}
                        password={password}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Decorations */}
      <section>
        <h3 style={{ fontSize: "14px", color: "var(--gold)", marginBottom: "12px" }}>
          {t("admin.images.decorationsTitle", { count: DECORATIONS_CATALOG.length })}
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {DECORATIONS_CATALOG.map((def) => (
            <ImageSlot key={def.id} targetKind="decoration" id={def.id} label={def.name} password={password} />
          ))}
        </div>
      </section>

      <p style={{ fontSize: "11.5px", color: "#7cd3ff", margin: 0 }}>{t("admin.images.cacheHint")}</p>
    </div>
  );
}
