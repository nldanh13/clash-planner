import { AlertTriangle, ArrowLeft, Cloud, LoaderCircle, LogIn, Shield } from "lucide-react";
import { useGoogleSignIn } from "../../hooks/useGoogleSignIn";

interface SignInRequiredGateProps {
  onBackToPreviousTab?: () => void;
}

/**
 * Base Planner persists layouts to the signed-in user's Firestore doc
 * (see useCloudSync) — a guest's work only lives in this browser's
 * localStorage and disappears on a cache clear or device switch, so the
 * feature is gated behind sign-in rather than silently risking that.
 */
export function SignInRequiredGate({ onBackToPreviousTab }: SignInRequiredGateProps) {
  const { isSigningIn, errorMessage, signIn } = useGoogleSignIn();

  return (
    <section className="!min-h-[380px] !p-8 relative overflow-hidden bg-gradient-to-b from-[#1B202A] to-[#14171F] border border-[#2C3340] rounded-2xl shadow-xl flex items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-4">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl flex items-center justify-center">
            <Cloud className="w-9 h-9 text-blue-400" />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-[#F0F0F0] tracking-tight mb-2">
          Cần đăng nhập để tạo Base
        </h1>

        <p className="text-sm text-[#B0BECA] leading-relaxed mb-6">
          Bản thiết kế được lưu thẳng vào tài khoản của bạn để không bị mất khi đổi
          máy hoặc trình duyệt tự xoá bộ nhớ tạm. Đăng nhập bằng Google — miễn phí,
          không cần tạo mật khẩu riêng cho ClashPath.
        </p>

        {errorMessage && (
          <div className="w-full mb-4 flex items-start gap-2 text-left text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={signIn}
          disabled={isSigningIn}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors w-full"
        >
          {isSigningIn ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {isSigningIn ? "Đang mở cửa sổ đăng nhập…" : "Đăng nhập với Google"}
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3">
          <Shield className="w-3 h-3" />
          Chỉ dùng tài khoản Google để xác thực, không lưu mật khẩu của bạn.
        </div>

        {onBackToPreviousTab && (
          <button
            onClick={onBackToPreviousTab}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại
          </button>
        )}
      </div>
    </section>
  );
}
