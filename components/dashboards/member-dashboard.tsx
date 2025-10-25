"use client";

import React, { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { UserDashboardData } from "@/types/dashboard-types";
import type { TaskWithDetails, Subtask, Project } from "@/types";
import { Timestamp } from "firebase/firestore";
import {
  Archive as ArchiveIcon,
  Loader2,
  ListChecks,
  Clock,
  Activity as ActivityIcon,
  CheckCircle2,
  Square,
  CheckSquare,
  Users,
  History,
  Calendar,
} from "lucide-react";
import { updateSubtaskCompletion, archiveTask } from "@/services/kanbanService";
import { toast } from "sonner";
import { DashboardTaskCard } from "@/components/dashboards/DashboardTaskCard";

// ---------- Utils robustos de fecha ----------
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

// ---------- Micro componentes ----------

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const StatCard = ({
  title,
  value,
  Icon,
  gradient = "from-indigo-500 via-violet-500 to-fuchsia-500",
  isLight,
}: {
  title: string;
  value: string | number;
  Icon: IconType;
  gradient?: string;
  isLight: boolean;
}) => {
  if (isLight) {
    // Modo claro: minimalista B/N con lineado grueso
    return (
      <div className="rounded-2xl border-2 border-black p-2 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black text-black">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-black/70">{title}</p>
            <p className="text-2xl font-extrabold text-black leading-tight">{value}</p>
          </div>
        </div>
      </div>
    );
  }

  // Modo oscuro: diseño existente con anillos y acentos
  return (
    <div className="group relative overflow-hidden rounded-2xl p-5 ring-2 ring-neutral-300/90 transition hover:ring-violet-500/60 dark:ring-white/20">
      <div className={cn("absolute inset-0 opacity-10 blur-2xl bg-gradient-to-r", gradient)} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={cn("rounded-xl p-3 text-white shadow-sm bg-gradient-to-br", gradient)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
};

// ---------- Props ----------
interface MemberDashboardProps {
  userName: string | null;
  liveData: UserDashboardData | null;
  setLiveData: React.Dispatch<React.SetStateAction<UserDashboardData | null>>;
  onRefresh: () => void;
  projects: Project[]; // 👈 Recibe la lista de proyectos
  isLoadingProjects: boolean;
}
// ---------- Componente principal ----------
export function MemberDashboard({
  userName,
  liveData,
  setLiveData,
  projects, // 👈 Recibe los proyectos
    isLoadingProjects,
  onRefresh,
}: MemberDashboardProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);

  if (!liveData) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="text-center">
          <Loader2 className={cn("mx-auto mb-3 h-8 w-8 animate-spin", isLight ? "text-black" : "text-primary")} />
          <h1 className={cn("text-xl font-semibold", isLight ? "text-black" : "")}>Cargando dashboard...</h1>
          <p className={cn("text-sm", isLight ? "text-black/60" : "text-muted-foreground")}>Un momento, por favor.</p>
        </div>
      </div>
    );
  }

  const handleSubtaskToggle = (
  taskId: string,
  subtaskId: string,
  newCompleted: boolean
) => {
  if (updatingSubtaskId) return;
  setUpdatingSubtaskId(subtaskId);

  const originalData = liveData;

  // --- 1. Lógica Optimista Mejorada ---
  let didTaskStatusChange = false; // Bandera para controlar el refresh

  const newData = {
    ...liveData,
    assignedTasks: liveData.assignedTasks.map((task) => {
      if (task.id !== taskId) return task;

      const originalStatus = task.status;

      // Genera el nuevo array de subtareas
      const newSubtasks = task.subtasks.map((sub) =>
        sub.id === subtaskId ? { ...sub, completed: newCompleted } : sub
      );

      // --- Replicamos la lógica del servidor ---
      const totalSubtasks = newSubtasks.length;
      const completedSubtasks = newSubtasks.filter(s => s.completed).length;

      let determinedStatus: 'todo' | 'in-progress' | 'done';
      
      if (totalSubtasks === 0 || completedSubtasks === 0) {
        determinedStatus = 'todo';
      } else if (completedSubtasks === totalSubtasks) {
        determinedStatus = 'done';
      } else {
        determinedStatus = 'in-progress';
      }
      // --- Fin de la réplica ---

      let newStatus = originalStatus;
      if (originalStatus !== determinedStatus) {
        newStatus = determinedStatus;
        didTaskStatusChange = true; // ¡Marcamos la bandera!
      }

      return { ...task, subtasks: newSubtasks, status: newStatus };
    }),
  };

  // 2. Actualizar UI al instante
  setLiveData(newData);

  // 3. Llamar a Firebase
  const taskTeamId = originalData.assignedTasks.find(t => t.id === taskId)?.teamId;

  if (!taskTeamId) {
    console.error("Error optimista: No se encontró teamId en la tarea.");
    setLiveData(originalData);
    setUpdatingSubtaskId(null);
    return;
  }

  updateSubtaskCompletion(
    subtaskId,
    taskId,
    newCompleted,
    liveData.user.uid,
    taskTeamId
  )
    .then(() => {
      if (didTaskStatusChange) {
        onRefresh();
      }
    })
    .catch((err) => {
      console.error("Error al actualizar la subtarea, revirtiendo:", err);
      setLiveData(originalData);
    })
    .finally(() => {
      setUpdatingSubtaskId(null);
    });
};

const handleArchiveTask = (taskId: string) => {
    if (archivingTaskId) return; // Prevenir clics múltiples

    setArchivingTaskId(taskId);
    const toastId = toast.loading("Archivando tarea...");

    const originalData = liveData;

    // 1. Actualización Optimista (Filtra la tarea de la lista)
    const newData = {
      ...liveData!, // Sabemos que liveData no es null aquí
      assignedTasks: liveData!.assignedTasks.filter((task) => task.id !== taskId),
    };
    setLiveData(newData);

    // 2. Llamar a Firebase
    const taskToArchive = originalData?.assignedTasks.find(t => t.id === taskId);
    if (!taskToArchive || !taskToArchive.teamId) {
        console.error("Error optimista al archivar: No se encontró la tarea o teamId.");
        toast.error("Error al archivar.", { id: toastId });
        setLiveData(originalData); // Revertir
        setArchivingTaskId(null);
        return;
    }

    archiveTask(taskId, liveData!.user.uid, taskToArchive.teamId)
      .then(() => {
        toast.success("Tarea archivada.", { id: toastId });
        // No necesitamos onRefresh() porque la tarea ya desapareció de la UI
      })
      .catch((err) => {
        console.error("Error al archivar la tarea, revirtiendo:", err);
        toast.error("No se pudo archivar la tarea.", { id: toastId });
        setLiveData(originalData); // Revertir
      })
      .finally(() => {
        setArchivingTaskId(null); // Detener estado de carga
      });
  };


  const { user, teams, assignedTasks, activityLogs } = liveData;

  const { total, todo, inProgress, done } = useMemo(() => {
    let t = 0, td = 0, ip = 0, dn = 0;
    // Usa liveData
    for (const task of liveData.assignedTasks) {
      t++;
      if (task.status === "todo") td++;
      else if (task.status === "in-progress") ip++;
      else if (task.status === "done") dn++;
    }
    return { total: t, todo: td, inProgress: ip, done: dn };
  }, [liveData.assignedTasks]);

  const tasksSorted = useMemo(() => {
    return [...assignedTasks].sort((a, b) => {
      const ad = toDateSafe(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = toDateSafe(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }, [liveData.assignedTasks]);

  return (
    <div className={cn("w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12", isLight && "bg-white text-black")}>
      <header className="mb-8">
        <h1 className={cn("text-3xl font-extrabold", isLight ? "text-black" : "")}>
          Hola {user.displayName || userName || "usuario"} 👋
        </h1>
        <p className={cn("text-sm", isLight ? "text-black/60" : "text-muted-foreground")}>Este es tu resumen general.</p>
      </header>

      {/* Estadísticas */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tareas totales" value={total} Icon={ListChecks} isLight={isLight} />
        <StatCard
          title="Pendientes"
          value={todo}
          Icon={Clock}
          gradient="from-amber-500 via-orange-500 to-rose-500"
          isLight={isLight}
        />
        <StatCard
          title="En progreso"
          value={inProgress}
          Icon={ActivityIcon}
          gradient="from-sky-500 via-indigo-500 to-violet-500"
          isLight={isLight}
        />
        <StatCard
          title="Completadas"
          value={done}
          Icon={CheckCircle2}
          gradient="from-emerald-500 via-teal-500 to-cyan-500"
          isLight={isLight}
        />
      </section>

      <main className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Tareas */}
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className={cn("text-xl font-semibold", isLight ? "text-black" : "")}>Mis tareas asignadas</h2>
            <span className={cn("text-xs", isLight ? "text-black/60" : "text-muted-foreground")}>{total}</span>
          </div>

          {tasksSorted.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {tasksSorted.map((task) => (
                <DashboardTaskCard
                  key={task.id}
                  task={task}
                  isLight={isLight}
                  projects={projects}
                  onSubtaskToggle={handleSubtaskToggle}
                  updatingSubtaskId={updatingSubtaskId}
                  onArchiveTask={handleArchiveTask}
                  archivingTaskId={archivingTaskId}
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-2xl p-8 text-center",
                isLight ? "border-2 border-black" : "ring-2 ring-neutral-300/90 dark:ring-white/20"
              )}
            >
              <CheckCircle2 className={cn("mx-auto mb-3 h-10 w-10", isLight ? "text-black" : "text-emerald-500")} />
              <h3 className={cn("text-lg font-semibold", isLight ? "text-black" : "")}>¡Sin tareas asignadas!</h3>
              <p className={cn("text-sm", isLight ? "text-black/60" : "text-muted-foreground")}>Disfruta tu día.</p>
            </div>
          )}
        </section>

        {/* Lateral */}
        <aside className="space-y-6">
          <div
            className={cn(
              "rounded-2xl p-4",
              isLight ? "border-2 border-black" : "ring-2 ring-neutral-300/90 dark:ring-white/20"
            )}
          >
            <h3 className={cn("mb-3 flex items-center gap-2 text-base font-extrabold", isLight ? "text-black" : "")}>
              <Users className={cn("h-5 w-5", isLight ? "text-black" : "text-primary")} /> Mi equipo
            </h3>
            {teams.length > 0 ? (
              <ul
                className={cn(
                  "divide-y",
                  isLight ? "divide-black" : "divide-neutral-200/60 dark:divide-white/10"
                )}
              >
                {teams.map((team) => (
                  <li key={team.id} className={cn("py-2 text-sm", isLight ? "text-black" : "text-card-foreground")}>
                    {team.teamName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn("text-sm", isLight ? "text-black/60" : "text-muted-foreground")}>
                Aún no eres miembro de ningún equipo.
              </p>
            )}
          </div>

          <div
            className={cn(
              "rounded-2xl p-4",
              isLight ? "border-2 border-black" : "ring-2 ring-neutral-300/90 dark:ring-white/20"
            )}
          >
            <h3 className={cn("mb-3 flex items-center gap-2 text-base font-extrabold", isLight ? "text-black" : "")}>
              <History className={cn("h-5 w-5", isLight ? "text-black" : "text-primary")} /> Actividad reciente
            </h3>
            {activityLogs.length > 0 ? (
              <ul className={cn("divide-y", isLight ? "divide-black" : "divide-neutral-200/60 dark:divide-white/10")}>
                {activityLogs.slice(0, 6).map((log) => (
                  <li key={log.id} className="py-2">
                    <p className={cn("text-sm capitalize", isLight ? "text-black" : "")}>
                      {String(log.action || "").replace(/_/g, " ")}
                    </p>
                    <p className={cn("mt-1 text-xs", isLight ? "text-black/60" : "text-muted-foreground")}>
                      {formatDate(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn("text-sm", isLight ? "text-black/60" : "text-muted-foreground")}>
                No hay actividad reciente para mostrar.
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}