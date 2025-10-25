"use client"

import React from "react"
import { useTheme } from "next-themes"
import { StrictModeDroppable } from "./StrictModeDroppable"
import TaskCard from "./TaskCard"
import type { TaskWithDetails, User } from "@/types"

interface KanbanColumnProps {
  column: {
    id: string
    title: string
    tasks: TaskWithDetails[]
  }
  onTaskClick: (task: TaskWithDetails) => void
  userRole: "admin" | "member" | null
  currentUserId: string
  // Props de subtareas
  onSubtaskToggle: (taskId: string, subtaskId: string, newStatus: boolean) => void;
  updatingSubtaskId: string | null;
}

export default function KanbanColumn({
  column,
  onTaskClick,
  userRole,
  currentUserId,
  // --- CAMBIO 2: Recibir props ---
  onSubtaskToggle,
  updatingSubtaskId,
}: KanbanColumnProps) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === "light"

  return (
    <section
      aria-label={`Columna ${column.title}`}
      className={[
        "group relative flex min-h-[420px] flex-col rounded-2xl p-3 md:p-4",
        // columna angosta/fija para que no se extienda
        "flex-[0_0_300px] md:flex-[0_0_320px] xl:flex-[0_0_360px] shrink-0",
        isLight
          ? "border-2 border-black bg-transparent"
          : "bg-white/5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35)]",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={cx("inline-flex items-center gap-2 text-sm font-semibold tracking-tight", isLight ? "text-black" : "text-white")}>
          <span className={cx("h-2.5 w-2.5 rounded-full", isLight ? "bg-black" : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500")} />
          {column.title}
        </h2>

        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium border border-black/20 dark:border-white/20 text-black dark:text-white bg-black/5 dark:bg-white/10"
          aria-label={`Total tareas en ${column.title}: ${column.tasks.length}`}
        >
          {column.tasks.length}
        </span>
      </div>

      <StrictModeDroppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            aria-live="polite"
            className={[
              "flex-1 space-y-3 rounded-xl p-1.5 sm:p-2 select-none transition-colors",
              isLight
                ? snapshot.isDraggingOver
                  ? "border border-black bg-black/5"
                  : "border border-black bg-transparent"
                : snapshot.isDraggingOver
                  ? "bg-white/10"
                  : "bg-white/5",
            ].join(" ")}
          >
            {column.tasks.map((task, index) => {
              const isAssignedToMe =
                task.assignedToIds?.includes(currentUserId) ?? false
              const canDrag = userRole === "admin" || isAssignedToMe
              const canEdit = userRole === "admin" 
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => onTaskClick(task)}
                  isDraggable={canDrag}
                  isEditable={canEdit}
                  
                  // --- CAMBIO 3: Pasar las nuevas props ---
                  onSubtaskToggle={onSubtaskToggle}
                  updatingSubtaskId={updatingSubtaskId}
                />
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </StrictModeDroppable>
    </section>
  )
}

function cx(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(" ")
}