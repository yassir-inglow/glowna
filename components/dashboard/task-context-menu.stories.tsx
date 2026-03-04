import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TaskContextMenu } from "./task-context-menu"
import { TaskRow } from "./task-row"

const meta: Meta<typeof TaskContextMenu> = {
  title: "Dashboard/TaskContextMenu",
  component: TaskContextMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    taskId: "demo-task-1",
  },
  decorators: [
    (Story) => (
      <div className="w-[1052px] rounded-xl border border-gray-cool-100 overflow-hidden">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <TaskContextMenu {...args}>
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
    </TaskContextMenu>
  ),
}

export const MultipleRows: Story = {
  decorators: [
    (Story) => (
      <div className="w-[1052px] rounded-xl border border-gray-cool-100 overflow-hidden">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <TaskContextMenu taskId="task-1" projectId="proj-1">
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
      </TaskContextMenu>
      <TaskContextMenu taskId="task-2" projectId="proj-1">
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
      </TaskContextMenu>
      <TaskContextMenu taskId="task-3" projectId="proj-1">
        <TaskRow
          title="Write release notes"
          subTaskCurrent={2}
          subTaskTotal={2}
          addText="Text"
          labelText="Docs"
          commentCount={0}
          projectName="Internal"
          avatars={[{ fallback: "A" }, { fallback: "D" }, { fallback: "E" }]}
        />
      </TaskContextMenu>
    </>
  ),
}
