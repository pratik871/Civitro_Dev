"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.civitro.com";

type ContentType = "issue" | "voice" | "action";
type IntendedAction = "support" | "upvote" | "comment" | "sign" | null;

interface SharePageClientProps {
  contentType: ContentType;
  contentId: string;
  children: React.ReactNode;
  ctaLabel: string;
  ctaAction: IntendedAction;
}

// ── OTP Signup Modal ──────────────────────────────────────────────
function OTPModal({
  onSuccess,
  onClose,
  intendedAction,
}: {
  onSuccess: (token: string) => void;
  onClose: () => void;
  intendedAction: IntendedAction;
}) {
  const [step, setStep] = useState<"phone" | "otp" | "completing">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const normalizePhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (digits.startsWith("+")) return p;
    return `+91${digits}`;
  };

  const sendOTP = async () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), name: "Citizen" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // If user already exists, that's fine — just send OTP
        if (!data?.error?.message?.includes("already")) {
          throw new Error(data?.error?.message ?? "Failed to send OTP");
        }
      }
      setStep("otp");
      setCountdown(30);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), otp: code }),
      });
      if (!res.ok) {
        throw new Error("Invalid OTP. Please try again.");
      }
      const data = await res.json();
      const token = data.access_token ?? data.token;
      if (!token) throw new Error("Authentication failed");
      setStep("completing");
      // Small delay to show "completing" state
      setTimeout(() => onSuccess(token), 800);
    } catch (e: any) {
      setError(e.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const actionLabels: Record<string, string> = {
    support: "Supporting this action",
    upvote: "Upvoting this",
    comment: "Joining the conversation",
    sign: "Signing this petition",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:p-8 animate-slide-up">
        {step === "phone" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Join in 10 seconds</h3>
                <p className="text-sm text-gray-500 mt-1">Enter your mobile number to continue</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            {intendedAction && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M5 6l3-3 3 3" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <p className="text-sm text-orange-700 font-medium">
                  {actionLabels[intendedAction] ?? "Your action"} will complete automatically after signup
                </p>
              </div>
            )}

            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-lg">🇮🇳</span>
                <span className="text-sm font-medium text-gray-500">+91</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile number"
                className="w-full pl-20 pr-4 py-4 border-2 border-gray-200 rounded-xl text-lg font-medium focus:border-orange-400 focus:outline-none transition-colors"
                maxLength={10}
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={sendOTP}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
                  Sending...
                </span>
              ) : "Continue"}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              By continuing, you agree to Civitro&apos;s Terms of Service
            </p>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Verify your number</h3>
              <p className="text-sm text-gray-500 mt-1">
                OTP sent to <span className="font-medium text-gray-700">+91 {phone}</span>
              </p>
            </div>

            <div className="flex gap-3 justify-center mb-5">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="tel"
                  value={digit}
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(i, e)}
                  className="w-12 h-14 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:border-orange-400 focus:outline-none transition-colors"
                  maxLength={1}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

            <button
              onClick={verifyOTP}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
                  Verifying...
                </span>
              ) : "Verify & Continue"}
            </button>

            <div className="text-center mt-4">
              {countdown > 0 ? (
                <p className="text-sm text-gray-400">Resend in {countdown}s</p>
              ) : (
                <button onClick={sendOTP} className="text-sm text-orange-500 font-medium hover:underline">
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}

        {step === "completing" && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-bounce-once">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 16l6 6 10-12" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">You&apos;re in!</h3>
            <p className="text-sm text-gray-500">
              {intendedAction ? `Completing your action...` : "Redirecting..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Smart App Banner ──────────────────────────────────────────────
function SmartBanner({ contentType, contentId }: { contentType: ContentType; contentId: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const deepLink = `civitro://share/${contentType}/${contentId}`;
  const appStoreUrl = "https://apps.apple.com/app/civitro/id6760473893";

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 flex items-center gap-3">
      <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-white text-sm">✕</button>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">C</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">Civitro</p>
        <p className="text-xs text-gray-400">Better experience in the app</p>
      </div>
      <a
        href={deepLink}
        onClick={(e) => {
          // Try deep link first, fall back to app store
          setTimeout(() => { window.location.href = appStoreUrl; }, 1500);
        }}
        className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        Open
      </a>
    </div>
  );
}

// ── Blurred Content Overlay ──────────────────────────────────────
function BlurOverlay({ onSignup }: { onSignup: () => void }) {
  return (
    <div className="relative">
      <div className="blur-sm opacity-50 pointer-events-none select-none">
        <div className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-full bg-gray-100 rounded mb-2" />
          <div className="h-3 w-3/4 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-full bg-gray-100 rounded mb-2" />
          <div className="h-3 w-2/3 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={onSignup}
          className="px-6 py-3 bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow-lg text-sm font-semibold text-gray-700 hover:bg-white transition-all"
        >
          Sign up to see more →
        </button>
      </div>
    </div>
  );
}

// ── Main Share Page Client Wrapper ───────────────────────────────
export default function SharePageClient({
  contentType,
  contentId,
  children,
  ctaLabel,
  ctaAction,
}: SharePageClientProps) {
  const [showOTP, setShowOTP] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [intendedAction, setIntendedAction] = useState<IntendedAction>(null);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("civitro_access_token");
    if (token) setIsLoggedIn(true);
  }, []);

  const executeAction = useCallback(async (token: string) => {
    if (!ctaAction) return;
    try {
      let endpoint = "";
      let method = "POST";
      let body: string | undefined;

      switch (ctaAction) {
        case "support":
          endpoint = `${API_URL}/api/v1/actions/${contentId}/support`;
          break;
        case "upvote":
          endpoint = `${API_URL}/api/v1/issues/${contentId}/upvote`;
          break;
        case "sign":
          endpoint = `${API_URL}/api/v1/actions/${contentId}/support`;
          break;
        default:
          return;
      }

      await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      setActionCompleted(true);
    } catch {
      // Silently fail — user can retry
    }
  }, [ctaAction, contentId]);

  const handleCTAClick = () => {
    if (isLoggedIn) {
      const token = localStorage.getItem("civitro_access_token");
      if (token) executeAction(token);
    } else {
      setIntendedAction(ctaAction);
      setShowOTP(true);
    }
  };

  const handleOTPSuccess = (token: string) => {
    localStorage.setItem("civitro_access_token", token);
    setIsLoggedIn(true);
    setShowOTP(false);
    // Auto-complete the intended action
    if (intendedAction) {
      executeAction(token);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-gray-50">
      {/* Smart App Banner */}
      <SmartBanner contentType={contentType} contentId={contentId} />

      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Civitro</span>
          </div>
          {!isLoggedIn ? (
            <button
              onClick={() => { setIntendedAction(null); setShowOTP(true); }}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign Up
            </button>
          ) : (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-full">
              ✓ Signed in
            </span>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 pt-6">
        {children}

        {/* Blurred extra content for non-logged-in users */}
        {!isLoggedIn && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">More from this ward</p>
            <BlurOverlay onSignup={() => { setIntendedAction(null); setShowOTP(true); }} />
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 mb-6">
          {actionCompleted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5 9-11" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-bold text-green-800 mb-1">Done! You&apos;ve taken action</p>
              <p className="text-sm text-green-600">Thank you for participating in democracy</p>
              <div className="flex gap-3 justify-center mt-4">
                <button className="px-4 py-2 bg-white border border-green-200 text-green-700 text-sm font-medium rounded-xl hover:bg-green-50 transition-colors">
                  Share
                </button>
                <a
                  href={`civitro://share/${contentType}/${contentId}`}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                >
                  Open in App
                </a>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCTAClick}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 text-base flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M6 7l4-4 4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {ctaLabel}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-gray-400 font-medium">Democracy. You Shape.™</p>
        </div>
      </div>

      {/* OTP Modal */}
      {showOTP && (
        <OTPModal
          onSuccess={handleOTPSuccess}
          onClose={() => setShowOTP(false)}
          intendedAction={intendedAction}
        />
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bounce-once { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-bounce-once { animation: bounce-once 0.5s ease-out; }
      `}</style>
    </div>
  );
}
