import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TaskRow } from "./task-row";

const sampleAvatars = [
  { fallback: "A" },
  { fallback: "B" },
];

const meta: Meta<typeof TaskRow> = {
  title: "Dashboard/TaskRow",
  component: TaskRow,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Task title",
    },
    showAddons: {
      control: "boolean",
      description: "Show the label buttons row (task count, add, label, comments)",
    },
    subTaskCurrent: {
      control: { type: "number", min: 0 },
      description: "Number of completed sub-tasks",
    },
    subTaskTotal: {
      control: { type: "number", min: 1 },
      description: "Total number of sub-tasks",
    },
    addText: {
      control: "text",
      description: "Text for the add button",
    },
    labelText: {
      control: "text",
      description: "Text for the label button",
    },
    commentCount: {
      control: { type: "number", min: 0 },
      description: "Number shown in the comment button",
    },
    projectName: {
      control: "text",
      description: "Project folder name shown on the right",
    },
    selected: {
      control: "boolean",
      description: "Highlighted / selected row state",
    },
  },
  args: {
    title: "Project name",
    showAddons: true,
    subTaskCurrent: 1,
    subTaskTotal: 5,
    addText: "Text",
    labelText: "Label",
    commentCount: 2,
    projectName: "Project name",
    avatars: sampleAvatars,
    selected: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[1052px] rounded-xl border border-gray-cool-100 overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── States ────────────────────────────────────────────────

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

// ─── Variants ──────────────────────────────────────────────

export const WithoutAddons: Story = {
  args: {
    showAddons: false,
  },
};

export const WithoutProjectName: Story = {
  args: {
    projectName: undefined,
  },
};

export const WithoutAvatars: Story = {
  args: {
    avatars: [],
  },
};

export const Minimal: Story = {
  args: {
    showAddons: false,
    projectName: undefined,
    avatars: [],
  },
};

// ─── Gallery ───────────────────────────────────────────────

export const List: Story = {
  decorators: [
    () => (
      <div className="w-[1052px] rounded-xl border border-gray-cool-100 overflow-hidden">
        <TaskRow
          title="Redesign landing page"
          subTaskCurrent={3}
          subTaskTotal={5}
          addText="Text"
          labelText="Design"
          commentCount={4}
          projectName="Brand"
          avatars={[{ fallback: "A" }, { fallback: "B" }]}
        />
        <TaskRow
          title="Fix authentication bug"
          subTaskCurrent={0}
          subTaskTotal={3}
          addText="Add"
          labelText="Bug"
          commentCount={1}
          projectName="Platform"
          avatars={[{ fallback: "C" }]}
        />
        <TaskRow
          title="Write release notes"
          subTaskCurrent={2}
          subTaskTotal={2}
          addText="Text"
          labelText="Docs"
          commentCount={0}
          projectName="Internal"
          avatars={[{ fallback: "A" }, { fallback: "D" }, { fallback: "E" }]}
          selected
        />
        <TaskRow
          title="Update dependencies"
          showAddons={false}
          projectName="Platform"
          avatars={[{ fallback: "B" }]}
        />
      </div>
    ),
  ],
};
