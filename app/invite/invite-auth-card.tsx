"use client"

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { createClient } from "@/lib/supabase/client"

type Step = "email" | "otp"

const COOLDOWN_SECONDS = 60
const OTP_LENGTH = 8

const supabase = createClient()

export function InviteAuthCard({
  email,
  hasAccount,
  nextUrl,
}: {
  email: string
  hasAccount: boolean
  nextUrl: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const lastAutoSubmittedOtpRef = useRef("")

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((value) => value - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const sendOtp = useCallback(async () => {
    if (cooldown > 0) return { sent: false }

    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      if (error.message.toLowerCase().includes("rate limit")) {
        setError(`Too many requests. Please wait ${COOLDOWN_SECONDS}s and try again.`)
        setCooldown(COOLDOWN_SECONDS)
      } else {
        setError(error.message)
      }
      return { sent: false }
    }

    setCooldown(COOLDOWN_SECONDS)
    return { sent: true }
  }, [cooldown, email])

  async function handleSendOtp() {
    setLoading(true)
    const { sent } = await sendOtp()
    if (sent) {
      setStep("otp")
    }
    setLoading(false)
  }

  const verifyOtpToken = useCallback(
    async (token: string) => {
      setLoading(true)
      setError(null)

      const { error: emailError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      })

      if (emailError) {
        const { error: signupError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "signup",
        })

        if (signupError) {
          setError(signupError.message)
          setLoading(false)
          return
        }
      }

      router.replace(nextUrl)
      router.refresh()
    },
    [email, nextUrl, router],
  )

  const submitOtp = useEffectEvent((value: string) => {
    void verifyOtpToken(value)
  })

  useEffect(() => {
    if (step !== "otp") return
    if (otp.length < OTP_LENGTH) {
      lastAutoSubmittedOtpRef.current = ""
      return
    }
    if (otp.length !== OTP_LENGTH) return
    if (loading) return
    if (lastAutoSubmittedOtpRef.current === otp) return

    lastAutoSubmittedOtpRef.current = otp
    submitOtp(otp)
  }, [loading, otp, step])

  return (
    <div className="rounded-[32px] bg-white p-8">
      {step === "email" ? (
        <div className="flex flex-col gap-3">
          <Input
            type="email"
            size="lg"
            value={email}
            readOnly
            className="w-full"
          />
          <p className="text-text-sm font-medium text-text-placeholder">
            {hasAccount
              ? "We'll send a verification code to this email so you can open the project."
              : "You don't have an account yet. Create it with this invited email and we'll open the project right after."}
          </p>
          {error && (
            <p className="text-text-sm text-text-error">{error}</p>
          )}
          <Button
            type="button"
            size="xl"
            className="w-full"
            loading={loading}
            disabled={cooldown > 0}
            onClick={handleSendOtp}
          >
            {cooldown > 0
              ? `Wait ${cooldown}s`
              : hasAccount
                ? "Continue with email"
                : "Create account"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <p className="w-full max-w-[260px] text-center text-text-md font-medium text-text-placeholder">
            We sent a verification code to{" "}
            <span className="text-text-secondary">{email}</span>.
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
              onClick={() => {
                void sendOtp()
              }}
              disabled={cooldown > 0}
              className="text-text-brand disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
