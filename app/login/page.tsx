"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Image from "next/image";

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
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const lastAutoSubmittedOtpRef = useRef("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show OAuth callback errors passed via ?error= query param
  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError === "auth_callback_failed") {
      setError("Sign-in failed. Please try again.");
    } else if (callbackError === "auth_code_exchange_failed") {
      setError("Authentication failed during sign-in. Please try again.");
    }
  }, [searchParams]);

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

    const { error } = await supabase.auth.signInWithOtp({ email });

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
  }, [email, cooldown, startCooldown]);

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
        email,
        token,
        type: "email",
      });

      if (emailError) {
        const { error: signupError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "signup",
        });

        if (signupError) {
          setError(signupError.message);
          setLoading(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    },
    [email, router]
  );

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
    void verifyOtpToken(otp);
  }, [step, otp, loading, verifyOtpToken]);

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    if (error) {
      setError(error.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <div className="flex w-full max-w-[404px] flex-col gap-2">
        {step === "email" && (
          <div className="flex flex-col items-center gap-1.5 pb-6">
            <div className="flex size-[46px] items-center justify-center rounded-md bg-white/50">
              <Image
                src="/logo.svg"
                alt="Glowna"
                width={24}
                height={24}
                className="size-6"
              />
            </div>
            <h1 className="text-display-xs font-medium text-text-secondary">
              Sign up
            </h1>
            <p className="text-text-md font-medium text-text-placeholder">
              Simple, Beautiful web analytics.
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full"
              />

              {error && (
                <p className="text-text-sm text-text-error">{error}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="xl"
                loading={loading}
                disabled={cooldown > 0}
                className="w-full"
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : "Sign in"}
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
                  Sign in with Google
                </span>
              </button>

              <p className="text-text-sm font-medium text-text-tertiary">
                Don&apos;t have an account?{" "}
                <span className="cursor-pointer text-text-brand">Sign up</span>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* OTP verification card */}
            <div className="flex flex-col items-center gap-6 rounded-[32px] bg-white p-8">
              <p className="w-full max-w-[234px] text-center text-text-md font-medium text-text-placeholder">
                We send the verification code to{" "}
                <span className="text-text-secondary">{email}.</span>
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
