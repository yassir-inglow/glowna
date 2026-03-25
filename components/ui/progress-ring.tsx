import * as React from "react"

import { cn } from "@/lib/utils"
import { CheckIcon } from "@/components/ui/checkbox"

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * SVG geometry — base viewBox is 20×20 to match the Figma source.
 */
const SIZE = 20
const OUTER_RADIUS = 8
const OUTER_STROKE = 1.5
const PIE_RADIUS = 6

// ─── Colour tokens (reference CSS variables so they respond to theme changes) ─

const COLOR = {
  track: "var(--color-gray-cool-100)", // outer ring
  empty: "var(--color-gray-cool-300)", // dashed "not started" ring
  low: "var(--color-warning-500)", // 1–49 % → orange
  high: "var(--color-purple-500)", // 50–99 % → purple
  complete: "var(--color-success-500)", // 100 % → green
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgressRingProps = {
  /**
   * Completion percentage, clamped to [0, 100].
   * Visually:
   * - `0`        → full dashed grey ring, no inner progress
   * - `1–49`     → full solid grey outer ring + orange pie segment
   * - `50–99`    → full solid grey outer ring + purple pie segment
   * - `100`      → full solid grey outer ring + full green pie
   */
  value: number
  /** Rendered pixel size. Defaults to 20 (matches Figma). */
  size?: number
  /**
   * Optional override for the ring/pie colour.
   * When omitted, the colour is derived from `value` (warning/purple/success).
   */
  color?: string
  className?: string
  "aria-label"?: string
}

// ─── Checkmark path ───────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPiePath(cx: number, cy: number, r: number, angle: number): string {
  // Clamp angle to just under a full circle to avoid SVG arc edge-cases.
  const clamped = Math.max(0, Math.min(angle, 2 * Math.PI - 0.001))
  const startX = cx
  const startY = cy - r
  const endX = cx + r * Math.sin(clamped)
  const endY = cy - r * Math.cos(clamped)
  const largeArcFlag = clamped > Math.PI ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${startX} ${startY}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
    "Z",
  ].join(" ")
}

// ─── Component ────────────────────────────────────────────────────────────────

function ProgressRing({
  value,
  size = SIZE,
  color,
  className,
  "aria-label": ariaLabel,
}: ProgressRingProps) {
  const v = Math.min(100, Math.max(0, Math.round(value)))

  const svgProps = {
    width: size,
    height: size,
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    role: "img" as const,
    "aria-label": ariaLabel,
    className: cn("shrink-0", className),
  }

  // ── 0–100 % — full outer ring + inner pie progress ─────────────────────────
  const hasProgress = v > 0
  const progressColor =
    color ?? (v >= 100 ? COLOR.complete : v >= 50 ? COLOR.high : COLOR.low)
  const angle = (v / 100) * 2 * Math.PI

  // Special "done" state — solid green circle with animated check, no inner pie.
  if (v === 100) {
    return (
      <svg {...svgProps} aria-label={ariaLabel ?? "Complete"}>
        <circle cx="10" cy="10" r={OUTER_RADIUS} fill={progressColor} />
        {/* Slightly smaller animated checkmark, centred in the circle */}
        <g transform="translate(10 10) scale(0.78) translate(-9 -9)">
          <CheckIcon />
        </g>
      </svg>
    )
  }

  return (
    <svg
      {...svgProps}
      aria-label={ariaLabel ?? (hasProgress ? `${v}% complete` : "Not started")}
    >
      {/* Outer ring — always a full circle, colour matches the current state */}
      <circle
        cx="10"
        cy="10"
        r={OUTER_RADIUS}
        stroke={v === 0 ? (color ?? COLOR.empty) : progressColor}
        strokeWidth={OUTER_STROKE}
        strokeDasharray={v === 0 ? "2.75 3" : undefined}
        fill="none"
      />

      {/* Inner progress pie — only when there is progress */}
      {hasProgress && (
        <>
          {v === 100 ? (
            // Full pie — just draw a filled circle.
            <circle cx="10" cy="10" r={PIE_RADIUS} fill={progressColor} />
          ) : (
            // Partial pie — draw a wedge from centre to circumference.
            <path
              d={buildPiePath(10, 10, PIE_RADIUS, angle)}
              fill={progressColor}
            />
          )}
        </>
      )}
    </svg>
  )
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { ProgressRing }
export type { ProgressRingProps }
