import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from '../i18n';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useTranslation();

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 text-xs font-bold transition-colors shrink-0"
        title={t("pwa.installAppTitle")}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("pwa.installApp")}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-[#142636] border border-[#ffffff12] hover:bg-[#1f374e] text-amber-400 px-3 py-1.5 text-xs font-bold transition-colors shrink-0"
          title={t("pwa.installIOSTitle")}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("pwa.installIOS")}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-[#0c1620] border border-[#ffffff12] p-6 shadow-2xl text-slate-200">
              <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {t("pwa.iosModalTitle")}
              </h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {t("pwa.iosModalDescription")}
              </p>
              <ul className="mt-4 text-sm text-slate-400 space-y-3 bg-[#142636] p-4 rounded-lg">
                <li className="flex items-start gap-2">
                  <span className="bg-amber-500 text-slate-950 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                  <span>{t("pwa.iosStep1Prefix")} <strong>{t("pwa.iosShareLabel")}</strong> {t("pwa.iosStep1Suffix")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-amber-500 text-slate-950 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                  <span>{t("pwa.iosStep2Prefix")} <strong>{t("pwa.iosAddToHomeLabel")}</strong>{t("pwa.iosStep2Suffix")}</span>
                </li>
              </ul>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-[#142636] hover:bg-[#1f374e] py-2.5 text-sm font-bold text-slate-200 transition-colors"
              >
                {t("pwa.gotIt")}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
