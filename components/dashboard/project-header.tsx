"use client"

import * as React from "react"
import {
  Add01Icon,
  ArrowRight01Icon,
  LeftToRightListBulletIcon,
  LayoutTwoColumnIcon,
  Search01Icon,
  TimelineListIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutGroup, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColumnsPopover } from "@/components/dashboard/columns-popover"
import { SharePopover } from "@/components/dashboard/invite-popover"
import { useProjectPresence } from "@/hooks/use-project-presence"
import { useUser } from "@/components/dashboard/user-provider"
import type { BoardColumnConfig } from "@/hooks/use-project-board-columns"
import type { ProjectMember, ProjectWithMembers } from "@/lib/data"

type ProjectView = "overview" | "list" | "board" | "timeline"

type ProjectHeaderProps = {
  project: Pick<ProjectWithMembers, "id" | "title" | "members" | "user_id">
  activeView: ProjectView
  onActiveViewChange: (next: ProjectView) => void
  columns: BoardColumnConfig[]
  onSaveColumns: (next: BoardColumnConfig[]) => Promise<void> | void
  onNewTask: () => void
}

export function ProjectHeader({
  project,
  activeView,
  onActiveViewChange,
  columns,
  onSaveColumns,
  onNewTask,
}: ProjectHeaderProps) {
  const user = useUser()
  const activeUserIds = useProjectPresence(project.id, user.id)

  const { activeMembers, inactiveMembers } = React.useMemo(() => {
    const ownerId = project.user_id
    const ownerFirst = (a: ProjectMember, b: ProjectMember) => {
      if (a.id === ownerId) return -1
      if (b.id === ownerId) return 1
      return 0
    }
    const active: ProjectMember[] = []
    const inactive: ProjectMember[] = []
    for (const m of project.members) {
      if (activeUserIds.has(m.id)) active.push(m)
      else inactive.push(m)
    }
    active.sort(ownerFirst)
    inactive.sort(ownerFirst)
    return { activeMembers: active, inactiveMembers: inactive }
  }, [project.members, project.user_id, activeUserIds])

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          <h1 className="text-[20px] font-medium leading-[30px] text-gray-cool-700">
            {project.title}
          </h1>
          <Button
            type="button"
            aria-label="Project options"
            variant="secondary"
            size="icon-xxs"
            iconOnly={ArrowRight01Icon}
            iconStrokeWidth={1.5}
            className="size-[22px] rotate-90 bg-alpha-800 p-[3px] text-gray-cool-700 [--icon-color:currentColor] hover:bg-alpha-800"
          />
        </div>

        <div className="flex items-center gap-2">
          {project.members.length > 0 && (
            <LayoutGroup>
              <div className="flex items-center gap-2 opacity-50">
                <AvatarGroup className="[&>[data-slot=avatar]]:-ml-1 [&>[data-slot=avatar]:first-child]:ml-0">
                  {[...activeMembers, ...inactiveMembers].slice(0, 3).map((member) => {
                    const isActive = activeUserIds.has(member.id)
                    return (
                      <motion.div key={member.id} layoutId={`presence-${member.id}`} data-slot="avatar" className="inline-flex" transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                        <Avatar size="xs" active={isActive} className="ring-offset-[1.5px] ring-offset-white">
                          {member.avatar_url ? (
                            <AvatarImage src={member.avatar_url} alt="" />
                          ) : (
                            <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
                          )}
                        </Avatar>
                      </motion.div>
                    )
                  })}
                </AvatarGroup>
              </div>
            </LayoutGroup>
          )}

          <SharePopover
            projectId={project.id}
            members={project.members}
            ownerId={project.user_id}
            showIcon={false}
            className="h-7 border border-gray-cool-100 bg-alpha-900 px-3 py-1 text-text-sm text-gray-cool-500 hover:bg-alpha-800"
          />
        </div>
      </div>

      <div aria-hidden="true" className="my-4 h-px w-full bg-gray-cool-100" />

      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeView} onValueChange={(v) => onActiveViewChange(v as ProjectView)}>
          <TabsList className="h-auto gap-1 rounded-full bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="rounded-full bg-alpha-950 px-3 py-1.5 text-text-sm font-medium text-gray-cool-500 transition-colors hover:text-gray-cool-700 data-[state=active]:bg-alpha-900 data-[state=active]:text-gray-cool-500"
            >
              Overview
            </TabsTrigger>

            <div aria-hidden="true" className="mx-1 h-[18px] w-px bg-gray-cool-100" />

            <TabsTrigger
              value="list"
              className="rounded-full bg-alpha-950 py-1.5 pl-2 pr-3 text-text-sm font-medium text-gray-cool-500 transition-colors hover:text-gray-cool-700 data-[state=active]:bg-alpha-900 data-[state=active]:text-gray-cool-500"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={LeftToRightListBulletIcon} size={20} color="currentColor" strokeWidth={1.5} />
                List
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="board"
              className="rounded-full bg-alpha-950 py-1.5 pl-2 pr-3 text-text-sm font-medium text-gray-cool-500 transition-colors hover:text-gray-cool-700 data-[state=active]:bg-alpha-900 data-[state=active]:text-gray-cool-500"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={LayoutTwoColumnIcon} size={20} color="currentColor" strokeWidth={1.5} />
                Board
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="timeline"
              className="rounded-full bg-alpha-950 py-1.5 pl-2 pr-3 text-text-sm font-medium text-gray-cool-500 transition-colors hover:text-gray-cool-700 data-[state=active]:bg-alpha-900 data-[state=active]:text-gray-cool-500"
            >
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={TimelineListIcon} size={20} color="currentColor" strokeWidth={1.5} />
                Timeline
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            aria-label="Search"
            variant="secondary"
            size="icon-xs"
            iconOnly={Search01Icon}
            iconStrokeWidth={1.5}
            className="size-8 border-0 bg-alpha-900 text-gray-cool-500 [--icon-color:currentColor] hover:bg-alpha-800"
          />
          <ColumnsPopover columns={columns} onSave={onSaveColumns} />
          <Button
            type="button"
            variant="primary"
            size="sm"
            leadingIcon={Add01Icon}
            iconStrokeWidth={1.5}
            className="h-8 py-1.5 pl-1.5 pr-3"
            onClick={onNewTask}
          >
            New Task
          </Button>
        </div>
      </div>

      <div aria-hidden="true" className="mt-4 h-px w-full bg-gray-cool-100" />
    </div>
  )
}

