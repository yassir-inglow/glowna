import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Logo } from "./logo";

const meta: Meta<typeof Logo> = {
  title: "Design System/Logo",
  component: Logo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "number", min: 16, max: 128, step: 4 },
      description: "Logo size in pixels (width & height)",
    },
  },
  args: {
    size: 46,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Sizes ──────────────────────────────────────────────────

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 32,
  },
};

export const Large: Story = {
  args: {
    size: 64,
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 96,
  },
};

// ─── Gallery ────────────────────────────────────────────────

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <Logo size={24} />
      <Logo size={32} />
      <Logo size={42} />
      <Logo size={64} />
      <Logo size={96} />
    </div>
  ),
};

export const OnDarkBackground: Story = {
  render: () => (
    <div className="flex items-center justify-center rounded-2xl bg-gray-cool-800 p-10">
      <Logo size={64} />
    </div>
  ),
};
