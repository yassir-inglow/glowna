import { useEffect, useRef, useState } from "react";
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
    loading: {
      control: "boolean",
      description: "Show a spinning brand-colored border while a server action is in-flight",
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

// ─── Loading ────────────────────────────────────────────────

export const Loading: Story = {
  args: {
    checked: false,
    loading: true,
  },
};

export const LoadingChecked: Story = {
  args: {
    checked: true,
    loading: true,
  },
};

export const DisabledClickTest: Story = {
  render: () => {
    const [changeCount, setChangeCount] = useState(0);

    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-gray-cool-100 p-4">
        <p className="text-text-sm text-gray-cool-700">
          Try clicking the disabled checkbox. It should never toggle.
        </p>
        <label className="flex items-center gap-2 text-text-sm text-gray-cool-700">
          <Checkbox
            checked={false}
            disabled
            aria-label="Disabled click test"
            onCheckedChange={() => setChangeCount((n) => n + 1)}
          />
          Disabled checkbox
        </label>
        <p className="text-text-xs text-gray-cool-500">onCheckedChange calls: {changeCount}</p>
      </div>
    );
  },
};

export const LoadingBetweenUncheckedAndChecked: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }, []);

    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-gray-cool-100 p-4">
        <p className="text-text-sm text-gray-cool-700">
          Click checkbox to simulate server loading before check completes.
        </p>
        <label className="flex items-center gap-2 text-text-sm text-gray-cool-700">
          <Checkbox
            checked={checked}
            loading={loading}
            aria-label="Loading transition test"
            onCheckedChange={(next) => {
              if (next === "indeterminate" || loading) return;
              setChecked(next);
              setLoading(true);
              if (timerRef.current) window.clearTimeout(timerRef.current);
              timerRef.current = window.setTimeout(() => {
                setLoading(false);
              }, 2000);
            }}
          />
          {checked ? "Checked" : "Unchecked"}
        </label>
      </div>
    );
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
      <div className="flex items-center gap-4">
        <Checkbox checked={false} loading aria-label="Loading unchecked" />
        <Checkbox checked={true} loading aria-label="Loading checked" />
      </div>
    </div>
  ),
};
