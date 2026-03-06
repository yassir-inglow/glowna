import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Switch } from "./switch";

const meta: Meta<typeof Switch> = {
  title: "Design System/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
      description: "Whether the switch is on",
    },
    disabled: {
      control: "boolean",
      description: "Whether the switch is disabled",
    },
  },
  args: {
    onCheckedChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  args: {
    checked: false,
  },
};

export const On: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const DisabledOn: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={setChecked} />
        <span className="text-text-sm font-medium text-gray-cool-600">
          {checked ? "On" : "Off"}
        </span>
      </div>
    );
  },
};

export const WithLabel: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(true);
    return (
      <div className="flex items-center justify-between gap-8 rounded-xl border border-gray-cool-100 px-4 py-3">
        <span className="text-text-sm font-medium text-gray-cool-700">
          Add an end date
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Switch checked={false} onCheckedChange={() => {}} />
        <span className="text-text-xs text-gray-cool-400">Off</span>
      </div>
      <div className="flex items-center gap-4">
        <Switch checked={true} onCheckedChange={() => {}} />
        <span className="text-text-xs text-gray-cool-400">On</span>
      </div>
      <div className="flex items-center gap-4">
        <Switch checked={false} disabled onCheckedChange={() => {}} />
        <span className="text-text-xs text-gray-cool-400">Disabled off</span>
      </div>
      <div className="flex items-center gap-4">
        <Switch checked={true} disabled onCheckedChange={() => {}} />
        <span className="text-text-xs text-gray-cool-400">Disabled on</span>
      </div>
    </div>
  ),
};
