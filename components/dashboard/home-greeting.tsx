"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/components/dashboard/user-provider"

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function HomeGreeting() {
  const { firstName } = useUser()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  return (
    <section className="space-y-1.5 text-center">
      <p className="text-text-xl font-medium text-gray-cool-400">
        {now ? formatDate(now) : "\u00A0"}
      </p>
      <h1 className="text-[52px]/none italic text-gray-cool-800 [font-family:'PT_Serif',serif]">
        {now ? `${getGreeting(now.getHours())}, ${firstName}` : `Hello, ${firstName}`}
      </h1>
    </section>
  )
}
