"use client";

import React from "react";
import { cn } from "@/lib/utils";
// 👇 Importa los tipos necesarios
import type { TaskWithDetails, Subtask, Tag, Project, User } from "@/types";
import { Timestamp } from "firebase/firestore";
// 👇 Importa los iconos necesarios
import {
  Archive as ArchiveIcon,
  Loader2,
  Square,
  CheckSquare,
  Calendar,
  FolderKanban,
} from "lucide-react";
// 👇 Importa las utilidades (asumiendo que las exportas desde MemberDashboard o un utils file)
const toDateSafe = (value?: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    try {
      const d = (value as Timestamp).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && "seconds" in value) {
    const s = Number(value.seconds);
    const n = Number(value.nanoseconds ?? 0);
    const d = new Date(s * 1000 + Math.floor(n / 1e6));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateValue?: any, locale = "es-PE"): string | null => {
  const d = toDateSafe(dateValue);
  if (!d) return null;
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const PriorityChip = ({ priority, isLight }: { priority?: string; isLight: boolean }) => {
  if (isLight) {
    return (
      <span className="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
        {priority}
      </span>
    );
  }

  const p = String(priority || "").toLowerCase();
  const map: Record<string, string> = {
    alta: "text-rose-500 ring-rose-500/40",
    high: "text-rose-500 ring-rose-500/40",
    media: "text-amber-600 ring-amber-500/40",
    medium: "text-amber-600 ring-amber-500/40",
    baja: "text-sky-600 ring-sky-500/40",
    low: "text-sky-600 ring-sky-500/40",
  };
  const cls = map[p] || "text-muted-foreground ring-neutral-300/80 dark:ring-white/20";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-2", cls)}>{priority}</span>;
};

const StatusBadge = ({ status, isLight }: { status?: string; isLight: boolean }) => {
  const s = String(status || "").toLowerCase();
  const label = s.replace(/-/g, " ") || "—";

  if (isLight) {
    return (
      <span className="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium ring-2 ring-neutral-300/80 text-muted-foreground dark:ring-white/20">
      {label}
    </span>
  );
};

const TagChip = ({ tag, isLight }: { tag: Tag; isLight: boolean }) => {
  // Color por defecto (gris-400 de Tailwind) si no se provee uno
  const color = tag.color || '#9ca3af'; 

  // --- Modo Claro (Borde Negro + Punto de Color) ---
  if (isLight) {
    return (
      <span className="inline-flex items-center rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
        {/* Punto de color */}
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {tag.tagName}
      </span>
    );
  }

  // --- Modo Normal/Oscuro (Chip Gris + Punto de Color) ---
  // Este es el estilo que te gustó
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-gray-500/10 bg-gray-50 dark:bg-gray-400/10 text-gray-600 dark:text-gray-400"
    >
      {/* Punto de color */}
      <span
        className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {tag.tagName}
    </span>
  );
};
interface DashboardTaskCardProps {
  task: TaskWithDetails;
  isLight: boolean;
  projects: Project[];
  onSubtaskToggle: (taskId: string, subId: string, newStatus: boolean) => void;
  updatingSubtaskId: string | null;
  // Nuevas props para archivar
  onArchiveTask: (taskId: string) => void;
  archivingTaskId: string | null;
}
export function DashboardTaskCard({
  task,
  isLight,
  projects,
  onSubtaskToggle,
  updatingSubtaskId,
  // --- 👇 CAMBIO 2: Recibir nuevas props ---
  onArchiveTask,
  archivingTaskId,
}: DashboardTaskCardProps) {

  const due = formatDate(task.dueDate);
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const done = subtasks.filter((s) => s.completed).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;
  const handleToggle = (sub: Subtask) => {
    onSubtaskToggle(task.id, sub.id, !sub.completed);
  };
  const isArchiving = archivingTaskId === task.id;
  const projectName = React.useMemo(() => {
    // Busca en la lista de proyectos usando el projectId de la tarea
    return projects.find(p => p.id === task.projectId)?.name ?? "Proyecto Desconocido";
  }, [projects, task.projectId]);
  // --- Renderizado (Modo claro) ---
  if (isLight) {
    // Modo claro: tarjeta con borde grueso en negro, sin colores
    return (
      <article className="relative rounded-2xl border-2 border-black p-2">
        {/* --- 👇 CAMBIO 4: Botón de Archivar --- */}
        {task.status === 'done' && (
           <button
             onClick={(e) => {
               e.stopPropagation(); // Evita que se dispare otro onClick si la tarjeta fuera clickeable
               onArchiveTask(task.id);
             }}
             disabled={isArchiving} // Deshabilitar mientras se archiva
             aria-label="Archivar tarea"
             title="Archivar tarea"
             className={cn(
               "absolute top-2 right-2 p-1 rounded-md text-black/50 hover:text-black hover:bg-black/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
               isArchiving && "animate-pulse" // Efecto visual opcional
             )}
           >
             {isArchiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
                <ArchiveIcon className="h-4 w-4" />
             )}
           </button>
        )}
        <div className="mb-1 flex items-center gap-1.5 text-xs text-black/60">
           <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
           <span className="truncate font-medium">{projectName}</span>
        </div>

        <h4 className="text-lg font-extrabold text-black">{task.title}</h4>
        <p className="mt-1 text-sm text-black/70">{task.description || "Sin descripción."}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-2">
            <span className="text-black/70">Prioridad:</span>
            <PriorityChip priority={task.priority as any} isLight />
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="text-black/70">Estado:</span>
            <StatusBadge status={task.status} isLight />
          </div>
          {due && (
            <div className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-black" />
              <span className="text-black/70">Vence:</span>
              <span className="font-semibold text-black">{due}</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="inline-flex items-center gap-2">
              <span className="text-black/70">Tags:</span>
              {task.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} isLight />
              ))}
            </div>
          )}
        </div>

        {subtasks.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-extrabold text-black uppercase tracking-wide">Subtareas</h5>
              <span className="text-xs text-black/70">
                {done} de {subtasks.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border-2 border-black">
              <div
                className="h-full bg-black transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>

            <ul className="mt-3 space-y-1.5">
              {subtasks.map((sub: Subtask) => (
                <li
                  key={sub.id}
                  onClick={() => handleToggle(sub)} // <-- Clic
                  className={cn(
                    "flex items-center text-sm text-black",
                    updatingSubtaskId ? "cursor-wait opacity-50" : "cursor-pointer" // <-- UI interactiva
                  )}
                >
                  {/* --- Icono dinámico --- */}
                  {updatingSubtaskId === sub.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
                  ) : sub.completed ? (
                    <CheckSquare className="mr-2 h-4 w-4 text-black" />
                  ) : (
                    <Square className="mr-2 h-4 w-4 text-black/60" />
                  )}
                  <span className={cn(sub.completed && "line-through text-black/60")}>{sub.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    );
  }

  // Modo oscuro existente (con acentos de color)
  const accent =
    task.status === "done"
      ? "bg-emerald-500"
      : task.status === "in-progress"
        ? "bg-indigo-500"
        : "bg-violet-500";

  return (
    <article
      className={cn(
        "relative rounded-2xl p-4 transition-all",
        "ring-2 ring-neutral-300/90 hover:ring-violet-500/60 dark:ring-white/20"
      )}
    >
      {/*---Botón de Archivar --- */}
       {task.status === 'done' && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               onArchiveTask(task.id);
             }}
             disabled={isArchiving}
             aria-label="Archivar tarea"
             title="Archivar tarea"
             className={cn(
               "absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
               isArchiving && "animate-pulse"
             )}
           >
             {isArchiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
                <ArchiveIcon className="h-4 w-4" />
             )}
           </button>
        )}
       {/* --- Fin Botón Archivar --- */}

      <span className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accent)} />
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate font-medium">{projectName}</span>
      </div>
      <h4 className="font-semibold">{task.title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{task.description || "Sin descripción."}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Prioridad:</span>{" "}
          <PriorityChip priority={task.priority as any} isLight={false} />
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Estado:</span>{" "}
          <StatusBadge status={task.status} isLight={false} />
        </div>
        {due && (
          <div className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Vence:</span>
            <span>{due}</span>
          </div>
        )}
        {task.tags && task.tags.length > 0 && (
          <div className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">Tags:</span>
            {task.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} isLight={false} />
            ))}
          </div>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-xs font-semibold">Subtareas</h5>
            <span className="text-xs text-muted-foreground">
              {done} de {subtasks.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full ring-1 ring-neutral-300/70 dark:ring-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1.5">
            {subtasks.map((sub: Subtask) => (
              <li
                key={sub.id}
                onClick={() => handleToggle(sub)} // <-- Clic
                className={cn(
                  "flex items-center text-sm",
                  updatingSubtaskId ? "cursor-wait opacity-50" : "cursor-pointer" // <-- UI interactiva
                )}
              >
                {/* --- Icono dinámico --- */}
                {updatingSubtaskId === sub.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                ) : sub.completed ? (
                  <CheckSquare className="mr-2 h-4 w-4 text-emerald-500" />
                ) : (
                  <Square className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(sub.completed && "line-through text-muted-foreground")}>{sub.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};
