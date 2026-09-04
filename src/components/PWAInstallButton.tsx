import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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
        title="Cài đặt ứng dụng vào máy"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Cài đặt App</span>
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
          title="Hướng dẫn cài đặt trên iOS"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cài iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-[#0c1620] border border-[#ffffff12] p-6 shadow-2xl text-slate-200">
              <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Cài đặt trên iPhone / iPad
              </h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Ứng dụng này hỗ trợ chạy toàn màn hình siêu mượt không cần trình duyệt web!
              </p>
              <ul className="mt-4 text-sm text-slate-400 space-y-3 bg-[#142636] p-4 rounded-lg">
                <li className="flex items-start gap-2">
                  <span className="bg-amber-500 text-slate-950 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                  <span>Nhấn vào nút <strong>Chia sẻ (Share)</strong> ở thanh công cụ Safari dưới cùng.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-amber-500 text-slate-950 font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                  <span>Kéo xuống và chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</span>
                </li>
              </ul>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-[#142636] hover:bg-[#1f374e] py-2.5 text-sm font-bold text-slate-200 transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
