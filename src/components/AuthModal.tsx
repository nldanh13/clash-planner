import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Cloud, Eye, EyeOff, LoaderCircle, LogIn, Shield, UserPlus, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signIn" | "signUp";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "signIn",
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"signIn" | "signUp">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultTab);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      const code = err?.code;
      if (code === "auth/popup-blocked") {
        setErrorMessage(t("auth.errors.popupBlocked"));
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setErrorMessage(t("auth.errors.popupClosed"));
      } else if (code === "auth/network-request-failed") {
        setErrorMessage(t("auth.errors.networkFailed"));
      } else {
        setErrorMessage(err?.message || t("auth.errors.generic"));
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    if (mode === "signUp") {
      if (password.length < 6) {
        setErrorMessage(t("auth.errors.weakPassword"));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t("auth.errors.passwordMismatch"));
        return;
      }

      setLoadingEmail(true);
      try {
        await signUpWithEmail(email.trim(), password, displayName.trim());
        setSuccessMessage("Đăng ký thành công! Đang đăng nhập…");
        setTimeout(() => {
          onClose();
        }, 600);
      } catch (err: any) {
        const code = err?.code;
        if (code === "auth/email-already-in-use") {
          setErrorMessage(t("auth.errors.emailInUse"));
        } else if (code === "auth/invalid-email") {
          setErrorMessage(t("auth.errors.invalidEmail"));
        } else if (code === "auth/weak-password") {
          setErrorMessage(t("auth.errors.weakPassword"));
        } else if (code === "auth/operation-not-allowed") {
          setErrorMessage(t("auth.errors.emailDisabled"));
        } else {
          setErrorMessage(err?.message || t("auth.errors.generic"));
        }
      } finally {
        setLoadingEmail(false);
      }
    } else {
      setLoadingEmail(true);
      try {
        await signInWithEmail(email.trim(), password);
        setSuccessMessage("Đăng nhập thành công!");
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (err: any) {
        const code = err?.code;
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
          setErrorMessage(t("auth.errors.invalidCredentials"));
        } else if (code === "auth/invalid-email") {
          setErrorMessage(t("auth.errors.invalidEmail"));
        } else if (code === "auth/operation-not-allowed") {
          setErrorMessage(t("auth.errors.emailDisabled"));
        } else {
          setErrorMessage(err?.message || t("auth.errors.generic"));
        }
      } finally {
        setLoadingEmail(false);
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-md flex items-center justify-center min-h-screen animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto bg-[#111923] border border-[#273849] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#213141] bg-[#14202d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a3c4f] to-[#162330] border border-[#3b5168] flex items-center justify-center text-[var(--gold)] shadow-inner shrink-0">
              {mode === "signUp" ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#eef3f7] leading-tight">
                {t("auth.accountModal.title")}
              </h2>
              <p className="text-xs text-[#7e91a0] leading-tight">
                {mode === "signUp" ? "Tạo tài khoản mới để lưu bản vẽ" : "Đăng nhập để đồng bộ dữ liệu"}
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0b1218] border border-[#1e2b38]">
            <button
              type="button"
              onClick={() => {
                setMode("signIn");
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                mode === "signIn"
                  ? "bg-[var(--gold)] text-[#181105] shadow-sm"
                  : "text-[#8799a8] hover:text-[#e3ecf2]"
              }`}
            >
              {t("auth.accountModal.tabSignIn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signUp");
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                mode === "signUp"
                  ? "bg-[var(--gold)] text-[#181105] shadow-sm"
                  : "text-[#8799a8] hover:text-[#e3ecf2]"
              }`}
            >
              {t("auth.accountModal.tabSignUp")}
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#ff4d5a18] border border-[#ff4d5a45] text-xs text-[#ffb0b6] flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#ff6472]" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#2ecc7118] border border-[#2ecc7145] text-xs text-[#a3f0c2] flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-[#2ecc71]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Button (Primary / Recommended) */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingGoogle || loadingEmail}
              className="w-full h-11 px-4 rounded-xl bg-[#172533] hover:bg-[#1e3042] border border-[#2d4053] hover:border-[var(--gold)] text-[#e8f1f7] text-xs font-bold flex items-center justify-center gap-2.5 transition-all shadow-sm group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingGoogle ? (
                <LoaderCircle className="w-4 h-4 animate-spin text-[var(--gold)]" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.6 7C.6 9 0 11.4 0 14s.6 5 1.6 7l3.7-3.3z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"
                  />
                </svg>
              )}
              <span>
                {loadingGoogle
                  ? t("auth.openingPopup")
                  : mode === "signUp"
                  ? "Đăng ký nhanh bằng Google"
                  : t("auth.signInWithGoogle")}
              </span>
            </button>
            <p className="text-[10.5px] text-[#697f90] text-center mt-1.5">
              {t("auth.accountModal.googleNote")}
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="w-full border-t border-[#1c2937]" />
            <span className="absolute px-2.5 bg-[#111923] text-[10.5px] text-[#607485] font-medium">
              {t("auth.accountModal.orEmail")}
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === "signUp" && (
              <div>
                <label className="block text-[11px] font-semibold text-[#8b9dae] mb-1">
                  {t("auth.accountModal.nameLabel")}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={t("auth.accountModal.namePlaceholder")}
                  className="w-full h-10 px-3 rounded-lg bg-[#0b1218] border border-[#233342] focus:border-[var(--gold)] text-[#e8f1f7] placeholder-[#4f6271] text-xs outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#8b9dae] mb-1">
                {t("auth.accountModal.emailLabel")} <span className="text-[#ff7b7b]">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t("auth.accountModal.emailPlaceholder")}
                className="w-full h-10 px-3 rounded-lg bg-[#0b1218] border border-[#233342] focus:border-[var(--gold)] text-[#e8f1f7] placeholder-[#4f6271] text-xs outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8b9dae] mb-1">
                {t("auth.accountModal.passwordLabel")} <span className="text-[#ff7b7b]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("auth.accountModal.passwordPlaceholder")}
                  className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#0b1218] border border-[#233342] focus:border-[var(--gold)] text-[#e8f1f7] placeholder-[#4f6271] text-xs outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#64798a] hover:text-[#b2c4d2] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === "signUp" && (
              <div>
                <label className="block text-[11px] font-semibold text-[#8b9dae] mb-1">
                  {t("auth.accountModal.confirmPasswordLabel")} <span className="text-[#ff7b7b]">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t("auth.accountModal.confirmPasswordPlaceholder")}
                  className="w-full h-10 px-3 rounded-lg bg-[#0b1218] border border-[#233342] focus:border-[var(--gold)] text-[#e8f1f7] placeholder-[#4f6271] text-xs outline-none transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loadingEmail || loadingGoogle}
              className="w-full h-10 rounded-lg bg-[var(--gold)] hover:bg-[#f6ce75] disabled:opacity-50 text-[#181105] font-bold text-xs flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {loadingEmail ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : mode === "signUp" ? (
                <UserPlus className="w-3.5 h-3.5" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>{mode === "signUp" ? t("auth.accountModal.btnSignUp") : t("auth.accountModal.btnSignIn")}</span>
            </button>
          </form>

          {/* Toggle between Sign In / Sign Up */}
          <div className="text-center text-xs text-[#718595] pt-1">
            {mode === "signIn" ? (
              <>
                <span>{t("auth.accountModal.noAccountPrompt")}{" "}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signUp");
                    setErrorMessage(null);
                  }}
                  className="text-[var(--gold)] font-bold hover:underline"
                >
                  {t("auth.accountModal.linkSignUp")}
                </button>
              </>
            ) : (
              <>
                <span>{t("auth.accountModal.hasAccountPrompt")}{" "}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signIn");
                    setErrorMessage(null);
                  }}
                  className="text-[var(--gold)] font-bold hover:underline"
                >
                  {t("auth.accountModal.linkSignIn")}
                </button>
              </>
            )}
          </div>

          {/* Perks */}
          <div className="pt-3 border-t border-[#1c2937] space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-[#7d93a5]">
              <Cloud className="w-3.5 h-3.5 text-[#4ec3da] shrink-0" />
              <span>{t("auth.accountModal.perk1Desc")}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#7d93a5]">
              <Shield className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
              <span>{t("auth.accountModal.perk2Desc")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
