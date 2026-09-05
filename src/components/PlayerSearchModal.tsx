import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Clock, Copy, ExternalLink, HelpCircle, LoaderCircle, Search, ShieldCheck, Trash2, User, X } from "lucide-react";
import { useTranslation } from "../i18n";
import { normalizeTag } from "../utils/formatters";

export interface RecentPlayerSearch {
  tag: string;
  name?: string;
  townHallLevel?: number;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = "coc-recent-tags";

export function getRecentSearches(): RecentPlayerSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(tag: string, name?: string, townHallLevel?: number) {
  try {
    const cleanTag = normalizeTag(tag);
    if (!cleanTag) return;
    const existing = getRecentSearches().filter(item => item.tag !== cleanTag);
    const updated: RecentPlayerSearch[] = [
      { tag: cleanTag, name: name || undefined, townHallLevel: townHallLevel || undefined, timestamp: Date.now() },
      ...existing
    ].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

const SAMPLE_ACCOUNTS = [
  { tag: "#2PP0L8CY0", name: "TH16 Full Max", desc: "Tài khoản mẫu đầy đủ Hero & Pet" },
  { tag: "#9V8U2PRY", name: "TH15 Active", desc: "Đội hình quân sự cấp cao" },
  { tag: "#8YV02G0P", name: "TH14 Balanced", desc: "Làng nâng cấp cân bằng" },
];

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (tag: string) => void;
  currentTag?: string;
  loading?: boolean;
}

export const PlayerSearchModal: React.FC<PlayerSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  currentTag = "",
  loading = false,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState(currentTag);
  const [recentList, setRecentList] = useState<RecentPlayerSearch[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTagInput(currentTag);
      setRecentList(getRecentSearches());
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentTag]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when search modal is open
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizeTag(tagInput);
    if (!clean) return;
    onSearch(clean);
    onClose();
  };

  const handleSelectTag = (selectedTag: string) => {
    setTagInput(selectedTag);
    const clean = normalizeTag(selectedTag);
    if (clean) {
      onSearch(clean);
      onClose();
    }
  };

  const handleClearRecent = () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentList([]);
    } catch {
      // ignore
    }
  };

  const handleRemoveRecentItem = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    try {
      const filtered = recentList.filter(item => item.tag !== tagToRemove);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
      setRecentList(filtered);
    } catch {
      // ignore
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-md flex items-center justify-center min-h-screen animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto bg-[#111923] border border-[#273849] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#213141] bg-[#14202d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a3c4f] to-[#162330] border border-[#3b5168] flex items-center justify-center text-[var(--gold)] shadow-inner shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#eef3f7] leading-tight">
                {t("app.searchModal.title")}
              </h2>
              <p className="text-xs text-[#7e91a0] leading-tight">
                {t("app.searchModal.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#8597a7] hover:text-[#eef3f7] hover:bg-[#203141] flex items-center justify-center transition-colors shrink-0"
            title={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          {/* Search Input Box */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#ffc857] font-mono font-bold text-sm select-none pointer-events-none">
                #
              </span>
              <input
                ref={inputRef}
                type="text"
                value={tagInput.startsWith("#") ? tagInput.slice(1) : tagInput}
                onChange={e => {
                  const val = e.target.value.toUpperCase().replace(/\s+/g, "");
                  setTagInput(val ? `#${val.replace(/^#+/, "")}` : "");
                }}
                placeholder="R0CV8RVU2 hoặc 2PP0L8CY0"
                className="w-full h-12 pl-8 pr-28 rounded-xl bg-[#0c131a] border border-[#2b3c4e] focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] text-[#f0f4f8] placeholder-[#576b7c] font-mono text-sm tracking-wider outline-none transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {tagInput && (
                  <button
                    type="button"
                    onClick={() => setTagInput("")}
                    className="p-1.5 text-[#738797] hover:text-[#d3e0ea] rounded-md transition-colors"
                    title="Xóa chữ"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || !tagInput.trim()}
                  className="h-8 px-3 rounded-lg bg-[var(--gold)] hover:bg-[#f6cf75] disabled:opacity-50 disabled:cursor-not-allowed text-[#1b1204] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {loading ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{t("common.syncProfile")}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#6d8191] flex items-center justify-between px-1">
              <span>{t("app.searchModal.inputPlaceholder")}</span>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[var(--gold)] hover:underline flex items-center gap-1 text-[11px]"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Xem cách lấy Tag</span>
              </button>
            </p>
          </form>

          {/* Guide Expandable */}
          {showGuide && (
            <div className="p-3.5 rounded-xl bg-[#0e1720] border border-[#233446] text-xs space-y-2 text-[#9ab0c1] animate-fadeIn">
              <strong className="text-[var(--gold)] block font-semibold">
                {t("app.searchModal.guideTitle")}
              </strong>
              <ol className="list-decimal list-inside space-y-1 text-[11.5px] leading-relaxed text-[#8da3b5]">
                <li>{t("app.searchModal.guideStep1")}</li>
                <li>{t("app.searchModal.guideStep2")}</li>
                <li>{t("app.searchModal.guideStep3")}</li>
              </ol>
            </div>
          )}

          {/* Recent Searches */}
          {recentList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#8fa1b0] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4ec3da]" />
                  {t("app.searchModal.recentTitle")}
                </span>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-[10px] text-[#677a88] hover:text-[#e05b5b] transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {t("app.searchModal.clearRecent")}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentList.map(item => (
                  <div
                    key={item.tag}
                    onClick={() => handleSelectTag(item.tag)}
                    className="group flex items-center justify-between p-2.5 rounded-xl bg-[#0e1721] border border-[#223344] hover:border-[var(--gold)] hover:bg-[#152331] cursor-pointer transition-all text-left"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#192735] flex items-center justify-center text-[var(--gold)] text-[11px] font-bold shrink-0 font-mono">
                        #
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-[#e1ebf2] group-hover:text-[var(--gold)] block truncate">
                          {item.tag}
                        </span>
                        {item.name && (
                          <span className="text-[10px] text-[#718696] block truncate">
                            {item.name} {item.townHallLevel ? `• TH${item.townHallLevel}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => handleRemoveRecentItem(e, item.tag)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#667a8b] hover:text-[#ff7b7b] rounded transition-opacity"
                      title="Xóa"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Accounts */}
          <div>
            <span className="text-[11px] font-bold text-[#8fa1b0] uppercase tracking-wider block mb-2">
              {t("app.searchModal.samplesTitle")}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_ACCOUNTS.map(sample => (
                <button
                  key={sample.tag}
                  type="button"
                  onClick={() => handleSelectTag(sample.tag)}
                  className="p-2.5 rounded-xl bg-[#0e1721] border border-[#223344] hover:border-[var(--gold)] hover:bg-[#152331] text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-mono text-xs font-bold text-[var(--gold)]">
                      {sample.tag}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f3042] text-[#91a6b7]">
                      Mẫu
                    </span>
                  </div>
                  <strong className="text-xs text-[#e1ebf2] group-hover:text-[#ffffff] block truncate">
                    {sample.name}
                  </strong>
                  <span className="text-[10px] text-[#6d8293] mt-0.5 block truncate">
                    {sample.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 border-t border-[#1e2c3b] bg-[#0c141c] flex items-center justify-between text-[11px] text-[#637788]">
          <span>Dữ liệu đồng bộ trực tiếp từ War Report CoC</span>
          <kbd className="px-2 py-0.5 rounded bg-[#182330] border border-[#273747] text-[#8ea2b3] font-mono text-[10px]">
            ESC để đóng
          </kbd>
        </div>
      </div>
    </div>,
    document.body
  );
};
