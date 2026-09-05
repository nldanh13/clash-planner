import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { useTranslation } from '../i18n';
import { AlertTriangle, LoaderCircle, LogOut, LogIn, UserCircle2, X } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, loading } = useAuth();
  const { isSigningIn, errorMessage, signIn, clearError } = useGoogleSignIn();
  const { t } = useTranslation();

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-slate-800 animate-pulse" />;
  }

  if (user) {
    return <SignedInMenu displayName={user.displayName} photoURL={user.photoURL} />;
  }

  return (
    <div className="relative">
      <button
        onClick={signIn}
        disabled={isSigningIn}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shrink-0"
      >
        {isSigningIn ? (
          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogIn className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">{isSigningIn ? t("auth.openingPopup") : t("auth.signIn")}</span>
      </button>

      {errorMessage && (
        <div className="absolute right-0 top-full mt-2 w-64 z-50 flex items-start gap-2 text-left text-xs text-red-300 bg-[#1B202A] border border-red-500/30 rounded-lg p-3 shadow-xl">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={clearError} className="text-red-300/70 hover:text-red-200 shrink-0" title={t("common.close")}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

function SignedInMenu({ displayName, photoURL }: { displayName: string | null; photoURL: string | null }) {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-xs font-bold text-slate-200">{displayName || t("auth.guestName")}</span>
        <span className="text-[10px] text-slate-400">{t("auth.signedIn")}</span>
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full bg-[#142636] border border-[#ffffff12] hover:bg-[#1f374e] text-slate-300 transition-colors"
        title={t("auth.signOut")}
      >
        {photoURL ? (
          <img src={photoURL} alt="Avatar" className="w-6 h-6 rounded-full" />
        ) : (
          <UserCircle2 className="w-6 h-6 text-slate-400" />
        )}
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
