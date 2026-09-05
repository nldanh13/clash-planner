import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation, type TranslationKey } from "../i18n";

/**
 * Firebase auth error codes worth a specific, human-readable message.
 * Shared by every sign-in button so the wording never drifts between them.
 */
function describeSignInError(error: unknown, t: (key: TranslationKey) => string): string {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === "auth/popup-blocked") return t("auth.errors.popupBlocked");
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return t("auth.errors.popupClosed");
  if (code === "auth/network-request-failed") return t("auth.errors.networkFailed");
  return t("auth.errors.generic");
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
  const { t } = useTranslation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(describeSignInError(error, t));
    } finally {
      setIsSigningIn(false);
    }
  }, [signInWithGoogle, t]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { isSigningIn, errorMessage, signIn, clearError };
}
