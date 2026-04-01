"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useEffectEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";

type Step = "email" | "otp";

const COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 8;

const supabase = createClient();

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const isInviteFlow = searchParams.get("invite") === "1";
  const inviteProject = searchParams.get("project");
  const inviterName = searchParams.get("inviter");
  const nextUrl = searchParams.get("next") ?? "/";
  const callbackError = searchParams.get("error");

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const lastAutoSubmittedOtpRef = useRef("");
  const emailLocked = isInviteFlow && inviteEmail.length > 0;
  const activeEmail = emailLocked ? inviteEmail : email;
  const callbackErrorMessage =
    callbackError === "auth_callback_failed"
      ? "Sign-in failed. Please try again."
      : callbackError === "auth_code_exchange_failed"
        ? "Authentication failed during sign-in. Please try again."
        : null;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
  }, []);

  // Shared OTP send logic for initial send and resend
  const sendOtp = useCallback(async () => {
    if (cooldown > 0) return { sent: false };
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({ email: activeEmail });

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        setError(
          `Too many requests. Please wait ${COOLDOWN_SECONDS}s and try again.`
        );
        startCooldown();
      } else {
        setError(error.message);
      }
      return { sent: false };
    }

    startCooldown();
    return { sent: true };
  }, [activeEmail, cooldown, startCooldown]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { sent } = await sendOtp();
    if (sent) {
      setStep("otp");
    }
    setLoading(false);
  }

  async function handleResendCode() {
    await sendOtp();
  }

  const verifyOtpToken = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);

      const { error: emailError } = await supabase.auth.verifyOtp({
        email: activeEmail,
        token,
        type: "email",
      });

      if (emailError) {
        const { error: signupError } = await supabase.auth.verifyOtp({
          email: activeEmail,
          token,
          type: "signup",
        });

        if (signupError) {
          setError(signupError.message);
          setLoading(false);
          return;
        }
      }

      router.push(nextUrl);
      router.refresh();
    },
    [activeEmail, router, nextUrl]
  );

  const submitOtp = useEffectEvent((value: string) => {
    void verifyOtpToken(value);
  });

  // Auto-submit OTP when all digits are entered
  useEffect(() => {
    if (step !== "otp") return;

    if (otp.length < OTP_LENGTH) {
      lastAutoSubmittedOtpRef.current = "";
      return;
    }

    if (otp.length !== OTP_LENGTH) return;
    if (loading) return;
    if (lastAutoSubmittedOtpRef.current === otp) return;

    lastAutoSubmittedOtpRef.current = otp;
    submitOtp(otp);
  }, [loading, otp, step]);

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });
    if (error) {
      setError(error.message);
    }
  }

  const title = isInviteFlow ? "You've been invited" : "Sign up";
  const subtitle = isInviteFlow
    ? inviterName && inviteProject
      ? `${inviterName} invited you to join "${inviteProject}". Use the invited email to continue.`
      : "Use the invited email to continue to your project."
    : "Simple, Beautiful web analytics.";
  const submitLabel = isInviteFlow ? "Send verification code" : "Sign in";
  const googleLabel = isInviteFlow ? "Continue with Google" : "Sign in with Google";
  const otpEmailLabel = activeEmail;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <div className="flex w-full max-w-[404px] flex-col gap-2">
        {step === "email" && (
          <div className="flex flex-col items-center gap-1.5 pb-6">
            <Logo size={42} />
            <h1 className="text-display-xs font-medium text-text-secondary">
              {title}
            </h1>
            <p className="text-text-md font-medium text-text-placeholder">
              {subtitle}
            </p>
          </div>
        )}

        {step === "email" ? (
          <>
            {/* Email + Sign in card */}
            <form
              onSubmit={handleSendOtp}
              className="flex flex-col gap-3 rounded-[32px] bg-white p-8"
            >
              <Input
                type="email"
                size="lg"
                value={activeEmail}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                readOnly={emailLocked}
                className="w-full"
              />

              {emailLocked && (
                <p className="text-text-sm font-medium text-text-placeholder">
                  This invite is tied to <span className="text-text-secondary">{inviteEmail}</span>.
                </p>
              )}

              {(error ?? callbackErrorMessage) && (
                <p className="text-text-sm text-text-error">{error ?? callbackErrorMessage}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="xl"
                loading={loading}
                disabled={cooldown > 0}
                className="w-full"
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : submitLabel}
              </Button>
            </form>

            {/* Google sign-in + footer card */}
            <div className="flex flex-col items-center gap-2 rounded-[32px] bg-white p-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-1 rounded-full bg-alpha-900 p-2.5 transition-colors hover:bg-alpha-800"
              >
                <Image
                  src="/google.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6"
                />
                <span className="text-text-md font-medium text-text-secondary">
                  {googleLabel}
                </span>
              </button>

              {!isInviteFlow && (
                <p className="text-text-sm font-medium text-text-tertiary">
                  Don&apos;t have an account?{" "}
                  <span className="cursor-pointer text-text-brand">Sign up</span>
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* OTP verification card */}
            <div className="flex flex-col items-center gap-6 rounded-[32px] bg-white p-8">
              <p className="w-full max-w-[234px] text-center text-text-md font-medium text-text-placeholder">
                We send the verification code to{" "}
                <span className="text-text-secondary">{otpEmailLabel}.</span>
              </p>

              <InputOTP
                value={otp}
                onChange={(value) => setOtp(value.replace(/\D/g, ""))}
                maxLength={OTP_LENGTH}
                pattern="^[0-9]+$"
                autoFocus
                containerClassName="w-full"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <p className="w-full text-text-sm text-text-error">{error}</p>
              )}

              <p className="text-text-sm font-medium text-text-tertiary">
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={cooldown > 0}
                  className="text-text-brand disabled:opacity-50"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                </button>
              </p>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
