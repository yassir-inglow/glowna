import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TaskRow, TaskRowSkeleton } from "./task-row";
import type { ProjectMember } from "@/lib/data";

const sampleAvatars = [
  { fallback: "A" },
  { fallback: "B" },
];

const sampleMembers: ProjectMember[] = [
  { id: "u1", full_name: "Alice Brown", email: "alice@example.com", avatar_url: null },
  { id: "u2", full_name: "Bob Smith", email: "bob@example.com", avatar_url: null },
  { id: "u3", full_name: "Carol Johnson", email: "carol@example.com", avatar_url: null },
];

const meta: Meta<typeof TaskRow> = {
  title: "Dashboard/TaskRow",
  component: TaskRow,
  render: function Render(args) {
    const [checked, setChecked] = useState(!!args.completed);

    return (
      <TaskRow
        {...args}
        completed={checked}
        onCompletedChange={async (next) => {
          setChecked(next);
        }}
      />
    );
  },
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Task title",
    },
    id: {
      control: "text",
      description: "Task id used by server action",
    },
    completed: {
      control: "boolean",
      description: "Completed task state",
    },
    onCompletedChange: {
      table: { disable: true },
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
    id: undefined,
    title: "Project name",
    completed: false,
    onCompletedChange: async () => {},
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
      <div className="w-[1052px] rounded-xl overflow-hidden">
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

export const Completed: Story = {
  args: {
    completed: true,
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

// ─── Skeleton ───────────────────────────────────────────────

export const Skeleton: Story = {
  decorators: [
    () => (
      <div className="w-[1052px] rounded-xl overflow-hidden">
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
      </div>
    ),
  ],
};

// ─── Assignee Dropdown ──────────────────────────────────────

export const WithAssigneeDropdown: Story = {
  args: {
    id: "task-1",
    title: "Redesign landing page",
    members: sampleMembers,
    assignedIds: ["u1"],
    avatars: [{ fallback: "AB", value: "Alice Brown" }],
  },
};

export const WithAssigneeEmpty: Story = {
  args: {
    id: "task-2",
    title: "Fix authentication bug",
    members: sampleMembers,
    assignedIds: [],
    avatars: [],
  },
};

// ─── Gallery ───────────────────────────────────────────────

export const List: Story = {
  decorators: [
    () => (
      <div className="w-[1052px] rounded-xl overflow-hidden">
        <TaskRow
          title="Redesign landing page"
          onCompletedChange={async () => {}}
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
          completed
          onCompletedChange={async () => {}}
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
          onCompletedChange={async () => {}}
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
          onCompletedChange={async () => {}}
          showAddons={false}
          projectName="Platform"
          avatars={[{ fallback: "B" }]}
        />
      </div>
    ),
  ],
};

export const ListWithAssignees: Story = {
  decorators: [
    () => (
      <div className="w-[1052px] rounded-xl overflow-hidden">
        <TaskRow
          id="t1"
          title="Redesign landing page"
          onCompletedChange={async () => {}}
          subTaskCurrent={3}
          subTaskTotal={5}
          addText="Text"
          labelText="Design"
          commentCount={4}
          projectName="Brand"
          members={sampleMembers}
          assignedIds={["u1", "u2"]}
          avatars={[{ fallback: "AB", value: "Alice Brown" }, { fallback: "BS", value: "Bob Smith" }]}
        />
        <TaskRow
          id="t2"
          title="Fix authentication bug"
          onCompletedChange={async () => {}}
          subTaskCurrent={0}
          subTaskTotal={3}
          addText="Add"
          labelText="Bug"
          commentCount={1}
          projectName="Platform"
          members={sampleMembers}
          assignedIds={["u3"]}
          avatars={[{ fallback: "CJ", value: "Carol Johnson" }]}
        />
        <TaskRow
          id="t3"
          title="Write release notes"
          onCompletedChange={async () => {}}
          showAddons={false}
          projectName="Internal"
          members={sampleMembers}
          assignedIds={[]}
          avatars={[]}
        />
      </div>
    ),
  ],
};
