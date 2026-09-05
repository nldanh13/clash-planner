import { useEffect } from "react";
import { Home, LayoutGrid, Map, ShieldCheck, TrendingUp, UserRound, X } from "lucide-react";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { Tab } from "../../App";

interface MobileNavDrawerProps {
  isOpen: boolean;
  activeTab: Tab;
  onClose: () => void;
  onSelectTab: (tab: Tab) => void;
}

const NAV_ITEMS: { tab: Tab; icon: typeof Home; labelKey: TranslationKey }[] = [
  { tab: "home", icon: Home, labelKey: "app.nav.home" },
  { tab: "overview", icon: UserRound, labelKey: "app.nav.overview" },
  { tab: "planner", icon: TrendingUp, labelKey: "app.nav.planner" },
  { tab: "roadmap", icon: Map, labelKey: "app.nav.roadmap" },
  { tab: "base-planner", icon: LayoutGrid, labelKey: "app.nav.basePlanner" },
];

export function MobileNavDrawer({ isOpen, activeTab, onClose, onSelectTab }: MobileNavDrawerProps) {
  const { t } = useTranslation();

  // Escape closes the drawer, and body scroll is locked while it's open so
  // the page behind can't be dragged/rubber-banded under the fixed overlay
  // on touch devices (same reasoning as the Base Planner fullscreen mode).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="mobile-nav-overlay" onClick={onClose}>
      <nav
        className="mobile-nav-drawer"
        aria-label="Main Navigation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-nav-drawer-head">
          <span className="mobile-nav-brand">
            <ShieldCheck className="w-[18px] h-[18px]" />
            <strong>{t("app.brandName")}</strong>
          </span>
          <button type="button" className="mobile-nav-close-btn" onClick={onClose} aria-label="Đóng menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        <ul className="mobile-nav-list">
          {NAV_ITEMS.map(({ tab, icon: Icon, labelKey }) => (
            <li key={tab}>
              <button
                type="button"
                className={`mobile-nav-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => onSelectTab(tab)}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{t(labelKey)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
