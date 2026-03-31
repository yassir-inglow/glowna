import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ProgressRing } from "./progress-ring"

const meta: Meta<typeof ProgressRing> = {
  title: "Design System/ProgressRing",
  component: ProgressRing,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Completion percentage (0–100). Controls the visual state.",
    },
    size: {
      control: { type: "number", min: 12, max: 64, step: 2 },
      description: "Rendered size in pixels. Defaults to 20 (matches Figma).",
    },
  },
  args: {
    value: 50,
    size: 20,
  },
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Individual states ──────────────────────────────────────────────────────

export const Empty: Story = {
  args: { value: 0 },
}

export const LowProgress: Story = {
  args: { value: 25 },
}

export const HalfProgress: Story = {
  args: { value: 50 },
}

export const HighProgress: Story = {
  args: { value: 75 },
}

export const Complete: Story = {
  args: { value: 100 },
}

// ─── Interactive ────────────────────────────────────────────────────────────

export const Interactive: Story = {
  args: { value: 60, size: 32 },
}

// ─── Gallery: All four visual states ────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-text-sm font-semibold text-gray-cool-700">
        Discrete journey steps — 20 px (outer ring always full)
      </p>
      <div className="flex items-center gap-6">
        {[
          { value: 0, label: "Not started (dashed)" },
          { value: 25, label: "Step 1 — 25 % (orange)" },
          { value: 50, label: "Step 2 — 50 % (purple)" },
          { value: 75, label: "Step 3 — 75 % (purple)" },
          { value: 100, label: "Complete — 100 % (green)" },
        ].map((state) => (
          <div key={state.value} className="flex flex-col items-center gap-2">
            <ProgressRing value={state.value} />
            <span className="text-text-xs text-gray-cool-400">{state.label}</span>
          </div>
        ))}
      </div>
    </div>
  ),
}
