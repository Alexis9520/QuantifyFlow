"use client"

import React, { useMemo } from "react"
import { Draggable } from "react-beautiful-dnd"
import type { TaskWithDetails, Subtask } from "@/types"
import { Timestamp } from "firebase/firestore"
import { Loader2, Square, CheckSquare } from "lucide-react"

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ")

const toDateSafe = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === "function") {
    try {
      const d = (value as Timestamp).toDate()
      return isNaN(d.getTime()) ? null : d
    } catch { }
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
  isDraggable: boolean
  isEditable: boolean
  onSubtaskToggle: (taskId: string, subtaskId: string, newStatus: boolean) => void;
  updatingSubtaskId: string | null;
}

export default function TaskCard({
  task,
  index,
  onClick,
  isDraggable,
  isEditable,
  // --- CAMBIO 2: Recibir nuevas props ---
  onSubtaskToggle,
  updatingSubtaskId,
}: TaskCardProps) {

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



  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!isDraggable}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps} 
          style={provided.draggableProps.style}
          onClick={isEditable ? onClick : undefined}
          className={cx(
            "group relative rounded-2xl p-4 transition-shadow select-none",
            "ring-2 ring-neutral-200/80 dark:ring-white/20 hover:shadow-lg",
            "bg-white/70 dark:bg-black/20",
            "text-black dark:text-white",
            snapshot.isDragging && "ring-violet-500/70",
            !isDraggable && "opacity-70 cursor-not-allowed hover:shadow-none"
          )}
          role={isEditable ? "button" : undefined}
          tabIndex={isEditable ? 0 : undefined}
          aria-grabbed={snapshot.isDragging}
          aria-disabled={!isDraggable}
        >
          <span className={cx("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accentClass)} />

          <h3 className="mb-2 line-clamp-2 text-sm font-semibold">{task.title}</h3>

          {/* ... (La lógica de Subtasks no cambia) ... */}
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
              {subtasks.map((sub: Subtask) => {
                const isLoading = updatingSubtaskId === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={(e) => {
                      e.stopPropagation(); // Previene que se abra el modal
                      if (!isDraggable || isLoading) return; // Respeta permisos y previene doble clic
                      onSubtaskToggle(task.id, sub.id, !sub.completed);
                    }}
                    className={cx(
                      "flex select-none items-center gap-2 rounded-lg px-2 py-1",
                      !isDraggable && "cursor-not-allowed opacity-60",
                      isDraggable && !isLoading && "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5",
                      isLoading && "cursor-wait opacity-60"
                    )}
                  >
                    {/* Reemplazamos <input> con iconos para mostrar estado de carga */}
                    {isLoading ? (
                       <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : sub.completed ? (
                       <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                       <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <span className={cx("text-xs", sub.completed && "line-through text-muted-foreground")}>
                      {sub.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ... (La lógica de Tags no cambia) ... */}
          {task.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={cx(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    "ring-1 ring-neutral-200/70 dark:ring-white/15",
                    "text-black dark:text-white",
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

          {/* 👇 CAMBIO: Renderizar un "avatar stack" para múltiples asignados */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="mt-3 flex items-center -space-x-2">
              {/* Mostramos los primeros 3 avatares */}
              {task.assignedTo.slice(0, 3).map((user) => {
                // Calculamos las iniciales para este usuario
                const initials =
                  user.displayName
                    ?.split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?";

                return user.photoURL ? (
                  <img
                    key={user.uid}
                    src={user.photoURL}
                    alt={user.displayName || "usuario"}
                    title={user.displayName || "usuario"} // Tooltip con el nombre
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-neutral-200/80 dark:ring-white/20"
                  />
                ) : (
                  <div
                    key={user.uid}
                    title={user.displayName || "usuario"} // Tooltip con el nombre
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-neutral-200/80 dark:ring-white/20 bg-black/5 dark:bg-white/10"
                  >
                    {initials}
                  </div>
                );
              })}

              {/* Si hay más de 3, mostramos un indicador "+N" */}
              {task.assignedTo.length > 3 && (
                <div
                  title={`${task.assignedTo.length - 3} más asignados`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-neutral-200/80 dark:ring-white/20 bg-black/5 dark:bg-white/10"
                >
                  +{task.assignedTo.length - 3}
                </div>
              )}
            </div>
          )}
        </article>
      )}
    </Draggable>
  )
}