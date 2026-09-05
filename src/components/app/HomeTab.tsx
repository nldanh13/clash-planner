import { ArrowRight, Castle, Compass, LogIn, MapPinned, Search, Wand2 } from "lucide-react";
import { useTranslation, type TranslationKey } from "../../i18n";

type NavigableTab = "overview" | "planner" | "roadmap" | "base-planner";

interface HomeTabProps {
  onNavigate: (tab: NavigableTab) => void;
  onOpenSearch?: () => void;
}

const FEATURES: {
  tab: NavigableTab;
  icon: typeof Castle;
  titleKey: TranslationKey;
  hintKey: TranslationKey;
}[] = [
  { tab: "overview", icon: Castle, titleKey: "app.nav.overview", hintKey: "home.features.overviewHint" },
  { tab: "planner", icon: Wand2, titleKey: "app.nav.planner", hintKey: "home.features.plannerHint" },
  { tab: "roadmap", icon: MapPinned, titleKey: "app.nav.roadmap", hintKey: "home.features.roadmapHint" },
  { tab: "base-planner", icon: Compass, titleKey: "home.features.basePlannerTitle", hintKey: "home.features.basePlannerHint" },
];

export function HomeTab({ onNavigate, onOpenSearch }: HomeTabProps) {
  const { t } = useTranslation();

  return (
    <div className="pt-6 pb-10 flex flex-col gap-10 w-full max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center flex flex-col items-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#F5F5F5] tracking-tight leading-[1.1] mb-5">
          {t("home.headlineLine1")}<br className="hidden sm:block" /> {t("home.headlineLine2")}
        </h1>
        <p className="text-[15px] text-[#8B98A5] leading-relaxed mb-8 max-w-lg">
          {t("home.subheadline")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              if (onOpenSearch) {
                onOpenSearch();
              } else {
                onNavigate("overview");
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e1406] text-sm font-bold transition-colors"
          >
            <Search className="w-4 h-4" />
            {t("home.ctaSearch")}
          </button>
          <button
            onClick={() => onNavigate("base-planner")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-bold transition-colors"
          >
            {t("home.ctaBasePlanner")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Features — a light strip, not a wall of cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FEATURES.map(({ tab, icon: Icon, titleKey, hintKey }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className="text-left p-4 rounded-xl border border-slate-800/80 hover:border-slate-600 hover:bg-slate-900/40 transition-colors flex flex-col gap-2"
          >
            <Icon className="w-4 h-4 text-slate-400" />
            <strong className="text-[13px] text-slate-100 font-bold leading-tight">{t(titleKey)}</strong>
            <span className="text-[11px] text-slate-500 leading-tight">{t(hintKey)}</span>
          </button>
        ))}
      </section>

      {/* One quiet line instead of a boxed guide + about section */}
      <section className="text-center text-xs text-slate-500 flex flex-col items-center gap-2 pt-2">
        <p className="flex items-center gap-1.5 m-0">
          <LogIn className="w-3.5 h-3.5" />
          {t("home.authNote")}
        </p>
        <p className="m-0">
          {t("home.credit", { name: t("home.creatorName") })}
        </p>
      </section>
    </div>
  );
}
