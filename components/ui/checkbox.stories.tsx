import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Design System/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "select",
      options: [false, true, "indeterminate"],
      description: "The checked state of the checkbox",
    },
    disabled: {
      control: "boolean",
      description: "Whether the checkbox is disabled",
    },
  },
  args: {
    onCheckedChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── States ────────────────────────────────────────────────

export const Unchecked: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    checked: "indeterminate",
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

// ─── Gallery: All States ───────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Checkbox checked={false} aria-label="Unchecked" />
        <Checkbox checked={true} aria-label="Checked" />
        <Checkbox checked="indeterminate" aria-label="Indeterminate" />
      </div>
      <div className="flex items-center gap-4">
        <Checkbox checked={false} disabled aria-label="Disabled unchecked" />
        <Checkbox checked={true} disabled aria-label="Disabled checked" />
        <Checkbox checked="indeterminate" disabled aria-label="Disabled indeterminate" />
      </div>
    </div>
  ),
};
