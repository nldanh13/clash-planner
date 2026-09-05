import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { AuthModal } from './AuthModal';
import { 
  Cloud, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  User, 
  UserCircle2, 
  UserPlus, 
  X 
} from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const { t } = useTranslation();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signIn' | 'signUp'>('signIn');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  if (loading) {
    return <div className="w-10 h-10 rounded-full bg-[#172330] border border-[#2b3c4f] animate-pulse shrink-0" />;
  }

  const handleOpenAuth = (tab: 'signIn' | 'signUp' = 'signIn') => {
    setAuthDefaultTab(tab);
    setIsAuthModalOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {user ? (
          /* Signed In: Circular Profile Avatar Button */
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#1b2b3b] to-[#2e4760] border border-[#435e7a] hover:border-[var(--gold)] focus:outline-none transition-all flex items-center justify-center shrink-0 shadow-md group"
            title={`Tài khoản: ${user.displayName || user.email || "Clasher"} (Bấm để xem)`}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#1b2c3d] flex items-center justify-center text-[var(--gold)] font-bold text-xs uppercase">
                {(user.displayName || user.email || "C").slice(0, 2)}
              </div>
            )}
            {/* Active sync indicator ring */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#10151e] shadow-sm" />
          </button>
        ) : (
          /* Not Signed In: Aesthetic Circular Auth Button with User Icon & Glow */
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#1b2836] to-[#121c27] border border-[#304356] hover:border-[var(--gold)] hover:shadow-[0_0_12px_rgba(255,200,87,0.25)] text-[#a1b5c6] hover:text-[var(--gold)] focus:outline-none transition-all flex items-center justify-center shrink-0 group cursor-pointer"
            title="Tài khoản / Đăng nhập & Đăng ký"
          >
            <User className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--gold)] border-2 border-[#10151e]" />
          </button>
        )}

        {/* Dropdown Popover */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2.5 w-72 rounded-2xl bg-[#111923] border border-[#273849] p-4 shadow-2xl z-50 animate-fadeIn text-left">
            {user ? (
              /* Signed In Dropdown View */
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-[#213141]">
                  <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#1b2b3b] to-[#2e4760] border border-[#435e7a] shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#1b2c3d] flex items-center justify-center text-[var(--gold)] font-bold text-sm">
                        {(user.displayName || user.email || "C").slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs font-bold text-[#f0f4f8] truncate">
                      {user.displayName || t("auth.guestName")}
                    </strong>
                    <span className="block text-[11px] text-[#788e9f] truncate">
                      {user.email || "Tài khoản Clasher"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0b1218] border border-[#1d2b38] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-[#8ba0b2]">
                    <span className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-[#4ec3da]" />
                      Base Planner Cloud:
                    </span>
                    <span className="text-emerald-400 font-medium">Đã bật</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8ba0b2]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--gold)]" />
                      Tài khoản:
                    </span>
                    <span className="text-[#c7d5e0]">Bảo mật cao</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut();
                  }}
                  className="w-full h-9 rounded-xl bg-[#1a2634] hover:bg-[#253648] hover:text-[#ff7b7b] border border-[#2b3c4e] text-xs font-bold text-[#a6bac9] flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("auth.signOut")}</span>
                </button>
              </div>
            ) : (
              /* Guest Dropdown View with Sign In & Sign Up choices */
              <div className="space-y-3">
                <div className="pb-2.5 border-b border-[#213141]">
                  <strong className="block text-xs font-bold text-[#f0f4f8]">
                    Tài khoản Clasher
                  </strong>
                  <p className="text-[11px] text-[#788e9f] leading-relaxed mt-0.5">
                    Đăng nhập hoặc đăng ký để lưu trữ bản vẽ Base Planner 44×44 không giới hạn.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('signIn')}
                    className="h-9 px-3 rounded-xl bg-[var(--gold)] hover:bg-[#f6ce75] text-[#1b1204] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t("auth.signIn")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('signUp')}
                    className="h-9 px-3 rounded-xl bg-[#182735] hover:bg-[#223547] border border-[#2e4255] text-[#e0ecf5] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[var(--gold)]" />
                    <span>{t("auth.signUp")}</span>
                  </button>
                </div>

                <div className="pt-2 text-[10.5px] text-[#6d8293] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-3 h-3 text-[#4ec3da]" />
                    <span>Lưu bản thiết kế vào đám mây</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-[var(--gold)]" />
                    <span>Hỗ trợ Google 1 chạm miễn phí</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authDefaultTab}
      />
    </>
  );
};
