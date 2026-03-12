import * as React from "react"

type ProgressRingProps = {
  /**
   * Current step index (0-based). For example:
   * 0 = empty, 1 = 25%, 2 = 50%, 3 = 75%, 4 = 100% when totalSteps = 4.
   */
  step: number
  /**
   * Total number of discrete steps in the flow.
   * The ring fill is derived from step / totalSteps.
   */
  totalSteps: number
  /**
   * Overall pixel size of the ring. Defaults to 20px.
   */
  size?: number
  /**
   * Visual style of the outer ring + inner progress color.
   * "muted" is the dashed gray version from the design.
   */
  variant?: "muted" | "warning" | "purple" | "success"
  /**
   * Optional aria-label for accessibility.
   */
  "aria-label"?: string
}

const VARIANT_COLORS: Record<
  NonNullable<ProgressRingProps["variant"]>,
  { track: string; progress: string; dashed?: boolean }
> = {
  muted: {
    track: "var(--color-gray-cool-600)",
    progress: "var(--color-gray-cool-400)",
    dashed: true,
  },
  warning: {
    track: "var(--color-warning-500)",
    progress: "var(--color-warning-400)",
  },
  purple: {
    track: "var(--color-purple-500)",
    progress: "var(--color-purple-300)",
  },
  success: {
    track: "var(--color-success-500)",
    progress: "var(--color-success-300)",
  },
}

export function ProgressRing({
  step,
  totalSteps,
  size = 20,
  variant = "muted",
  "aria-label": ariaLabel,
}: ProgressRingProps) {
  const normalizedTotal = Math.max(totalSteps, 1)
  const clampedStep = Math.min(Math.max(step, 0), normalizedTotal)
  const progress = clampedStep / normalizedTotal

  const outerStrokeWidth = 2
  const innerStrokeWidth = 3
  const gapBetweenRings = 1

  const center = size / 2
  const outerRadius = center - outerStrokeWidth / 2
  const innerRadius = outerRadius - outerStrokeWidth / 2 - gapBetweenRings - innerStrokeWidth / 2

  const circumference = 2 * Math.PI * innerRadius
  const progressLength = circumference * progress

  const colors = VARIANT_COLORS[variant]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel ?? `Step ${clampedStep} of ${normalizedTotal}`}
    >
      {/* Outer ring — always a full circle */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill="none"
        stroke={colors.track}
        strokeWidth={outerStrokeWidth}
        strokeDasharray={colors.dashed ? "2 3" : undefined}
      />

      {/* Inner progress arc — fills based on the current step */}
      {progress > 0 && (
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke={colors.progress}
          strokeWidth={innerStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
          // Offset so the arc starts at the top (12 o'clock), not at 3 o'clock.
          strokeDashoffset={circumference * 0.25}
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
    </svg>
  )
}

