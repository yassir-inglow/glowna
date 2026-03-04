import type { TaskRowProps } from "@/components/dashboard/task-row"

export type Project = {
  id: string
  title: string
  description?: string
  compactAvatars?: boolean
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    title: "Name Project",
    description: "this is description on the project",
  },
  {
    id: "proj-2",
    title: "Name Project",
    compactAvatars: true,
  },
]

export const MOCK_TASKS: TaskRowProps[] = [
  {
    title: "Task name",
    subTaskCurrent: 1,
    subTaskTotal: 5,
    commentCount: 2,
    avatars: [{ fallback: "YO" }],
  },
  {
    title: "Task name",
    subTaskCurrent: 1,
    subTaskTotal: 5,
    commentCount: 2,
    avatars: [{ fallback: "YO" }, { fallback: "AN" }],
  },
  {
    title: "Task name",
    subTaskCurrent: 1,
    subTaskTotal: 5,
    addText: "Text",
    commentCount: 2,
    avatars: [{ fallback: "YO" }],
  },
]

export function getProjectById(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id)
}
