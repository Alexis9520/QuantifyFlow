"use client"

import React, { useMemo, useState } from "react"
import { Draggable } from "react-beautiful-dnd"
import type { TaskWithDetails } from "@/types"
import { Timestamp } from "firebase/firestore"
import { updateSubtaskStatus } from "@/services/kanbanService"

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ")

const toDateSafe = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === "function") {
    try {
      const d = (value as Timestamp).toDate()
      return isNaN(d.getTime()) ? null : d
    } catch {}
  }
  if (typeof value === "object" && value && "seconds" in value) {
    const s = Number((value as any).seconds)
    const n = Number((value as any).nanoseconds ?? 0)
    const d = new Date(s * 1000 + Math.floor(n / 1e6))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

type DueKind = "overdue" | "due-soon" | "normal"
const getDueDateStatus = (dueDate?: any): DueKind => {
  const d = toDateSafe(dueDate)
  if (!d) return "normal"
  const diffH = (d.getTime() - Date.now()) / 36e5
  if (diffH < 0) return "overdue"
  if (diffH <= 24) return "due-soon"
  return "normal"
}

interface TaskCardProps {
  task: TaskWithDetails
  index: number
  onClick: () => void
  onUpdate: () => void
}

export default function TaskCard({ task, index, onClick, onUpdate }: TaskCardProps) {
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null)

  const dueStatus = useMemo(() => getDueDateStatus(task.dueDate), [task.dueDate])
  const subtasks = task.subtasks ?? []
  const completedSubtasks = subtasks.filter((s) => s.completed).length
  const progressPct = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0

  const accentClass =
    dueStatus === "overdue"
      ? "bg-rose-500"
      : dueStatus === "due-soon"
      ? "bg-amber-500"
      : "bg-transparent"

  const handleSubtaskToggle = async (
    e: React.MouseEvent,
    subtaskId: string,
    currentStatus: boolean
  ) => {
    e.stopPropagation()
    setUpdatingSubtaskId(subtaskId)
    try {
      await updateSubtaskStatus(task.id, subtaskId, !currentStatus)
      onUpdate()
    } catch (err) {
      console.error("Fallo al cambiar estado de la subtarea:", err)
    } finally {
      setUpdatingSubtaskId(null)
    }
  }

  const initials =
    task.assignedTo?.displayName
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          // CLAVE: aplicar el style que provee react-beautiful-dnd para evitar el desfase
          style={provided.draggableProps.style}
          onClick={onClick}
          className={cx(
            "group relative rounded-2xl p-4 transition-shadow select-none",
            "ring-2 ring-neutral-200/80 dark:ring-white/20 hover:shadow-lg",
            "bg-white/70 dark:bg-black/20",
            "text-black dark:text-white",
            snapshot.isDragging && "ring-violet-500/70"
          )}
          role="button"
          tabIndex={0}
          aria-grabbed={snapshot.isDragging}
        >
          <span className={cx("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accentClass)} />

          <h3 className="mb-2 line-clamp-2 text-sm font-semibold">{task.title}</h3>

          {subtasks.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs text-muted-foreground">
                {completedSubtasks} de {subtasks.length} completadas
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full ring-1 ring-neutral-200/70 dark:ring-white/10">
                <div
                  className={cx(
                    "h-full rounded-full transition-[width]",
                    progressPct === 100
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {subtasks.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  onClick={(e) => handleSubtaskToggle(e, sub.id, sub.completed)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    readOnly
                    disabled={updatingSubtaskId === sub.id}
                    className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span className={cx("select-none text-xs", sub.completed && "line-through text-muted-foreground")}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {task.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={cx(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    "ring-1 ring-neutral-200/70 dark:ring-white/15",
                    // texto correcto en ambos modos
                    "text-black dark:text-white",
                    // fondo sutil para contraste en dark
                    "bg-black/5 dark:bg-white/10"
                  )}
                >
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color || "#64748b" }}
                  />
                  {tag.tagName}
                </span>
              ))}
            </div>
          ) : null}

          {task.assignedTo && (
            <div className="mt-3 flex items-center gap-2">
              {task.assignedTo.photoURL ? (
                <img
                  src={task.assignedTo.photoURL}
                  alt={task.assignedTo.displayName || "usuario"}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-neutral-200/80 dark:ring-white/20"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-neutral-200/80 dark:ring-white/20 bg-black/5 dark:bg-white/10">
                  {initials}
                </div>
              )}
              <span className="truncate text-xs text-muted-foreground">{task.assignedTo.displayName}</span>
            </div>
          )}
        </article>
      )}
    </Draggable>
  )
}