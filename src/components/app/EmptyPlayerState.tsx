import { Castle, Compass, LoaderCircle, Shield, Sparkles, Swords } from "lucide-react";
import { useTranslation } from "../../i18n";

export function EmptyPlayerState({ loading, message }: { loading: boolean; message?: string }) {
  const { t } = useTranslation();
  return (
    <section className="empty-banner !min-h-[380px] !p-8 relative overflow-hidden bg-gradient-to-b from-[#1B202A] to-[#14171F] border border-[#2C3340] rounded-2xl shadow-xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCircle className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{t("overview.connecting")}</h1>
          <p className="text-xs text-slate-400">{t("overview.connectingDetail")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto py-4">
          {/* Clash of Clans Village Centerpiece Illustration */}
          <div className="relative mb-6 flex items-center justify-center">
            {/* Ambient Backlight Glow */}
            <div className="absolute w-44 h-44 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
            <div className="absolute w-28 h-28 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />

            {/* Orbiting Decorative Badges */}
            <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 p-3 shadow-2xl flex items-center justify-center">
              <img
                src="/town-halls/th-11.png"
                alt="Town Hall"
                className="w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Left Accent Icon */}
            <div className="absolute -left-6 bottom-2 w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 shadow-lg flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            {/* Right Accent Icon */}
            <div className="absolute -right-6 top-2 w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 shadow-lg flex items-center justify-center text-amber-400">
              <Swords className="w-4 h-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {t("overview.readyBadge")}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F0F0F0] tracking-tight mb-2">
            {t("overview.emptyTitle")}
          </h1>

          <p className="text-sm text-[#B0BECA] leading-relaxed mb-6 max-w-md">
            {message || t("overview.emptyDescription", { syncLabel: t("common.syncProfile") })}
          </p>

          {/* Quick Guidance Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
              <Castle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-xs text-slate-200 block font-bold">{t("overview.guidance.townHallTitle")}</strong>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{t("overview.guidance.townHallHint")}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-xs text-slate-200 block font-bold">{t("home.features.basePlannerTitle")}</strong>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{t("overview.guidance.basePlannerHint")}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-xs text-slate-200 block font-bold">{t("overview.guidance.defenseTitle")}</strong>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{t("overview.guidance.defenseHint")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
