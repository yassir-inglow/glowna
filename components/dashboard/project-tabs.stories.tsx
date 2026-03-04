import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectTabs } from "./project-tabs";

const meta: Meta<typeof ProjectTabs> = {
  title: "Dashboard/ProjectTabs",
  component: ProjectTabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── States ────────────────────────────────────────────────

export const Default: Story = {};

export const InContext: Story = {
  render: () => (
    <div className="flex items-center justify-between gap-4 rounded-[32px] bg-bg-primary p-6" style={{ width: 700 }}>
      <ProjectTabs />
      <div className="text-text-sm text-gray-cool-400">← Interactive — click to switch tabs</div>
    </div>
  ),
};
