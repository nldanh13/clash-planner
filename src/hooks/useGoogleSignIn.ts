import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

/**
 * Firebase auth error codes worth a specific, human-readable message.
 * Shared by every sign-in button so the wording never drifts between them.
 */
function describeSignInError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === "auth/popup-blocked") {
    return "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup cho trang này rồi thử lại.";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Cửa sổ đăng nhập đã bị đóng trước khi hoàn tất. Bấm lại để thử tiếp.";
  }
  if (code === "auth/network-request-failed") {
    return "Không thể kết nối tới máy chủ đăng nhập. Kiểm tra lại mạng rồi thử lại.";
  }
  return "Đăng nhập không thành công. Vui lòng thử lại.";
}

/**
 * Single source of truth for "sign in with Google" button behavior: loading
 * state while the popup is open, and a readable error message on failure.
 * Every sign-in entry point (header menu, Base Planner gate, ...) should use
 * this instead of calling AuthContext's signInWithGoogle directly, so they
 * can't drift into inconsistent feedback.
 */
export function useGoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(describeSignInError(error));
    } finally {
      setIsSigningIn(false);
    }
  }, [signInWithGoogle]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { isSigningIn, errorMessage, signIn, clearError };
}
