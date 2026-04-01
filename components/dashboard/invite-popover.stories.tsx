import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"

import { SharePopover } from "./invite-popover"
import { UserProvider } from "@/components/dashboard/user-provider"
import type { ProjectMember } from "@/lib/data"

const ownerId = "owner-1"

const members: ProjectMember[] = [
  {
    id: ownerId,
    full_name: "Yassir Owner",
    email: "owner@example.com",
    avatar_url: null,
    role: "editor",
  },
  {
    id: "editor-1",
    full_name: "Sara Editor",
    email: "sara@example.com",
    avatar_url: null,
    role: "editor",
  },
  {
    id: "viewer-1",
    full_name: "Omar Viewer",
    email: "omar@example.com",
    avatar_url: null,
    role: "viewer",
  },
]

const meta: Meta<typeof SharePopover> = {
  title: "Dashboard/SharePopover",
  component: SharePopover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    projectId: "project-1",
    members,
    ownerId,
    activeUserIds: new Set([ownerId, "editor-1"]),
  },
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const OwnerCanManage: Story = {
  render: (args) => (
    <UserProvider id={ownerId} email="owner@example.com" fullName="Yassir Owner">
      <SharePopover {...args} />
    </UserProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /share/i }))
    await expect(canvas.getByPlaceholderText("Add people by email…")).toBeInTheDocument()
    await expect(canvas.getAllByText("Can edit").length).toBeGreaterThan(0)
  },
}

export const ViewerReadOnly: Story = {
  render: (args) => (
    <UserProvider id="viewer-1" email="omar@example.com" fullName="Omar Viewer">
      <SharePopover {...args} />
    </UserProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /share/i }))
    await expect(canvas.getByText(/only the owner can manage sharing/i)).toBeInTheDocument()
    await expect(canvas.queryByPlaceholderText("Add people by email…")).toBeNull()
    await expect(canvas.getByText("Full access")).toBeInTheDocument()
  },
}
