"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { UserDashboardData } from "@/types/dashboard-types";
import type { TaskWithDetails, Subtask } from "@/types";
import { Timestamp } from "firebase/firestore";
import {
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

const TaskCard = ({ task, isLight }: { task: TaskWithDetails; isLight: boolean }) => {
  const due = formatDate(task.dueDate);
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const done = subtasks.filter((s) => s.completed).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  if (isLight) {
    // Modo claro: tarjeta con borde grueso en negro, sin colores
    return (
      <article className="relative rounded-2xl border-2 border-black p-2">
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
                <li key={sub.id} className="flex items-center text-sm text-black">
                  {sub.completed ? (
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
      <span className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accent)} />
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
              <li key={sub.id} className="flex items-center text-sm">
                {sub.completed ? (
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

// ---------- Props ----------
interface MemberDashboardProps {
  userName: string | null;
  memberData: UserDashboardData | null;
}

// ---------- Componente principal ----------
export function MemberDashboard({ userName, memberData }: MemberDashboardProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  if (!memberData) {
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

  const { user, teams, assignedTasks, activityLogs } = memberData;

  const { total, todo, inProgress, done } = useMemo(() => {
    let t = 0,
      td = 0,
      ip = 0,
      dn = 0;
    for (const task of assignedTasks) {
      t++;
      if (task.status === "todo") td++;
      else if (task.status === "in-progress") ip++;
      else if (task.status === "done") dn++;
    }
    return { total: t, todo: td, inProgress: ip, done: dn };
  }, [assignedTasks]);

  const tasksSorted = useMemo(() => {
    return [...assignedTasks].sort((a, b) => {
      const ad = toDateSafe(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = toDateSafe(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }, [assignedTasks]);

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
                <TaskCard key={task.id} task={task} isLight={isLight} />
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