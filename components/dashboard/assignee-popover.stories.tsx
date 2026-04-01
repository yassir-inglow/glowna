import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AssigneePicker } from "./assignee-popover";
import type { ProjectMember } from "@/lib/data";

const sampleMembers: ProjectMember[] = [
  {
    id: "user-1",
    full_name: "Yassir ux",
    email: "yassir@example.com",
    avatar_url: null,
    role: "editor",
  },
  {
    id: "user-2",
    full_name: "Omar Riahi",
    email: "omar@example.com",
    avatar_url: null,
    role: "editor",
  },
  {
    id: "user-3",
    full_name: "Sara Johnson",
    email: "sara@example.com",
    avatar_url: null,
    role: "viewer",
  },
  {
    id: "user-4",
    full_name: "Alex Chen",
    email: "alex@example.com",
    avatar_url: null,
    role: "editor",
  },
];

const meta: Meta<typeof AssigneePicker> = {
  title: "Dashboard/AssigneePicker",
  component: AssigneePicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    taskId: { control: "text", description: "Task ID for server actions" },
    assignedIds: {
      control: "object",
      description: "Profile IDs of currently assigned members",
    },
    onChanged: { table: { disable: true } },
  },
  args: {
    taskId: "task-1",
    members: sampleMembers,
    assignedIds: ["user-1"],
  },
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MultipleAssigned: Story = {
  args: {
    assignedIds: ["user-1", "user-2", "user-3"],
  },
};

export const NoneAssigned: Story = {
  args: {
    assignedIds: [],
  },
};

export const SingleMember: Story = {
  args: {
    members: [sampleMembers[0]],
    assignedIds: [],
  },
};

export const AllAssigned: Story = {
  args: {
    assignedIds: sampleMembers.map((m) => m.id),
  },
};
