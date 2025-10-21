"use client";

import React from "react";
import { useTheme } from "next-themes";
import { AdminDashboardData, TeamMemberWithDetails } from "@/types/dashboard-types";
import { Project, ActivityLog } from "@/types";
import { Timestamp } from "firebase/firestore";
import {
  Users,
  FolderKanban,
  ClipboardList,
  Timer,
  Activity as ActivityIcon,
  CheckCircle2,
  Circle,
  PlayCircle,
  Mail,
  Shield,
  Calendar,
} from "lucide-react";

// Utils fecha (robusta)
const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof (value as any)?.toDate === "function") {
    try {
      const d = (value as Timestamp).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {}
  }
  if (typeof value === "object" && value !== null && "seconds" in (value as any)) {
    const s = Number((value as any).seconds);
    const n = Number((value as any).nanoseconds ?? 0);
    if (!Number.isNaN(s) && !Number.isNaN(n)) {
      const d = new Date(s * 1000 + Math.floor(n / 1e6));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatDate = (dateValue: unknown, locale = "es-ES"): string | null => {
  const d = toDateSafe(dateValue);
  if (!d) return null;
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };
  return d.toLocaleDateString(locale, options);
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Subcomponentes
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
    // Minimalista B/N con lineado grueso
    return (
      <div className="rounded-2xl border-2 border-black p-2">
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

  // Dark: diseño existente
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/60 p-5 shadow-[0_8px_30px_-15px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl transition-transform hover:scale-[1.01]">
      <div className={cx("absolute inset-0 opacity-20 blur-2xl bg-gradient-to-r", gradient)} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={cx("rounded-xl p-3 text-white shadow-sm bg-gradient-to-br", gradient)}>
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

const StatusBadge = ({ status, isLight }: { status?: string; isLight: boolean }) => {
  if (isLight) {
    return (
      <span className="rounded-full border-2 border-black px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-black">
        {status ?? "Estado"}
      </span>
    );
  }
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Activo", className: "bg-emerald-400/15 text-emerald-400" },
    paused: { label: "Pausado", className: "bg-amber-400/15 text-amber-400" },
    archived: { label: "Archivado", className: "bg-zinc-400/15 text-zinc-400" },
    default: { label: "Desconocido", className: "bg-muted text-foreground/70" },
  };
  const { label, className } = map[status || ""] || map.default;
  return <span className={cx("rounded-full px-2.5 py-1 text-xs font-medium", className)}>{label}</span>;
};

const ProjectCard = ({
  project,
  tasks,
  isLight,
}: {
  project: Project;
  tasks: Array<{ status?: string; projectId?: string | number }>;
  isLight: boolean;
}) => {
  const projectId = String((project as any).id ?? (project as any).projectId ?? "");
  const projectTasks = Array.isArray(tasks) ? tasks.filter((t) => String(t.projectId ?? "") === projectId) : [];

  const totals = {
    all: projectTasks.length || (project as any).taskCount || 0,
    todo: projectTasks.filter((t) => t.status === "todo").length,
    progress: projectTasks.filter((t) => t.status === "in-progress").length,
    done: projectTasks.filter((t) => t.status === "done" || t.status === "completed").length,
  };

  const percent = totals.all ? Math.round((totals.done / totals.all) * 100) : 0;

  if (isLight) {
    return (
      <div className="rounded-2xl border-2 border-black p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-extrabold text-black tracking-tight">{project.name}</h4>
          <StatusBadge status={(project as any).status} isLight />
        </div>
        <p className="mt-2 text-sm text-black/70">{project.description || "Sin descripción."}</p>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-black/70">
            <span>Progreso</span>
            <span className="font-semibold text-black">{percent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border-2 border-black">
            <div className="h-full bg-black transition-[width] duration-700" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-black">
            <span className="inline-flex items-center gap-1">
              <Circle className="h-3.5 w-3.5" /> {totals.todo}
            </span>
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3.5 w-3.5" /> {totals.progress}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {totals.done}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.01]">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-transform group-hover:scale-110" />
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-semibold tracking-tight">{project.name}</h4>
          <StatusBadge status={(project as any).status} isLight={false} />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "Sin descripción."}</p>
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Circle className="h-3 w-3 text-zinc-400" /> {totals.todo}
            </span>
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3 w-3 text-indigo-400" /> {totals.progress}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {totals.done}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Avatar = ({ name, src, isLight }: { name?: string | null; src?: string | null; isLight: boolean }) => {
  const initials =
    (name || "")
      .trim()
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  if (isLight) {
    return (
      <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-black text-black">
        {src ? <img alt={name || "avatar"} src={src} className="h-full w-full object-cover" /> : <span className="text-xs font-semibold">{initials}</span>}
      </div>
    );
  }
  return (
    <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground">
      {src ? <img alt={name || "avatar"} src={src} className="h-full w-full object-cover" /> : <span className="text-xs font-semibold">{initials}</span>}
    </div>
  );
};

const MemberListItem = ({ member, isLight }: { member: TeamMemberWithDetails; isLight: boolean }) => {
  if (isLight) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border-2 border-black px-3 py-2">
        <div className="flex items-center gap-3">
          <Avatar name={member.displayName} src={(member as any).photoURL} isLight />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-black">{member.displayName}</p>
            <p className="flex items-center gap-1 truncate text-xs text-black/70">
              <Mail className="h-3.5 w-3.5" />
              {member.email}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-black">
          <Shield className="h-3.5 w-3.5" />
          {(member as any).role || "miembro"}
        </span>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5">
      <div className="flex items-center gap-3">
        <Avatar name={member.displayName} src={(member as any).photoURL} isLight={false} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{member.displayName}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {member.email}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <Shield className="h-3.5 w-3.5" />
        {(member as any).role || "miembro"}
      </span>
    </li>
  );
};

const ActivityItem = ({ log, isLight }: { log: ActivityLog; isLight: boolean }) => {
  const iconMap: Record<string, IconType> = {
    created_task: ClipboardList,
    updated_task: ActivityIcon,
    moved_task: Timer,
    completed_task: CheckCircle2,
    default: ActivityIcon,
  };
  const label = (log as any).action?.replace(/_/g, " ") ?? "actividad";
  const Icon = iconMap[(log as any).action] || iconMap.default;
  const when = formatDate((log as any).createdAt) ?? "—";

  if (isLight) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border-2 border-black px-3 py-2 text-sm">
        <div className="inline-flex items-center gap-2 text-black">
          <Icon className="h-4 w-4" />
          <span className="capitalize font-semibold">{label}</span>
        </div>
        <span className="whitespace-nowrap text-xs text-black/70">{when}</span>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-white/5">
      <div className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="capitalize">{label}</span>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{when}</span>
    </li>
  );
};

// Props
interface AdminDashboardProps {
  userName: string | null;
  adminData: AdminDashboardData | null;
}

export function AdminDashboard({ userName, adminData }: AdminDashboardProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Skeleton
  if (!adminData) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 2xl:px-12">
        <div className={cx("mb-6 h-6 w-64 animate-pulse rounded-lg", isLight ? "bg-black/10" : "bg-muted/70")} />
        <div className={cx("mb-4 h-4 w-96 animate-pulse rounded-lg", isLight ? "bg-black/10" : "bg-muted/60")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cx("h-28 animate-pulse rounded-2xl", isLight ? "border-2 border-black" : "bg-muted/30")} />
          ))}
        </div>
      </div>
    );
  }

  const { team, members, projects, tasks, recentActivity } = adminData;
  const tasksToDo = tasks.filter((t: any) => t.status === "todo").length;
  const tasksInProgress = tasks.filter((t: any) => t.status === "in-progress").length;
  const tasksDone = tasks.filter((t: any) => t.status === "done" || t.status === "completed").length;
  const activeProjects = projects.filter((p: any) => p.status === "active").length;

  return (
    <div className={cx("w-full", isLight && "bg-white text-black")}>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 2xl:px-12">
        <header className="mb-8">
          <h1 className={cx("text-2xl font-extrabold tracking-tight", isLight ? "text-black" : "")}>
            Equipo: <span className={cx(isLight ? "text-black underline decoration-4" : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent")}>
              {team.teamName}
            </span>
          </h1>
          <p className={cx("text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
            Hola {userName ?? "usuario"}, este es el resumen general.
          </p>
        </header>

        {/* Estadísticas */}
        <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Miembros totales" value={members.length} Icon={Users} isLight={isLight} />
          <StatCard title="Proyectos activos" value={activeProjects} Icon={FolderKanban} isLight={isLight} />
          <StatCard title="Tareas pendientes" value={tasksToDo} Icon={ClipboardList} isLight={isLight} />
          <StatCard title="En progreso" value={tasksInProgress} Icon={Timer} isLight={isLight} />
        </section>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Proyectos */}
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className={cx("text-xl font-extrabold tracking-tight", isLight ? "text-black" : "")}>
                Proyectos del equipo
              </h2>
              <div className={cx("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>
                Tareas completadas: <span className={cx("font-semibold", isLight ? "text-black" : "text-foreground")}>{tasksDone}</span>
              </div>
            </div>

            {projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={(project as any).id} project={project} tasks={tasks as any} isLight={isLight} />
                ))}
              </div>
            ) : (
              <div
                className={cx(
                  "p-8 text-center",
                  isLight ? "rounded-2xl border-2 border-black" : "rounded-2xl bg-white/5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]"
                )}
              >
                <p className={cx("text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
                  Aún no se han creado proyectos para este equipo.
                </p>
              </div>
            )}
          </section>

          {/* Lateral */}
          <aside className="space-y-8">
            <div
              className={cx(
                "p-4",
                isLight
                  ? "rounded-2xl border-2 border-black"
                  : "rounded-2xl bg-card/60 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className={cx("text-sm font-extrabold uppercase tracking-wide", isLight ? "text-black" : "text-muted-foreground")}>
                  Miembros
                </h3>
                <span className={cx("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>{members.length}</span>
              </div>
              <ul className="max-h-[360px] space-y-2 overflow-auto pr-1">
                {members.length > 0 ? (
                  members.map((m) => <MemberListItem key={(m as any).uid} member={m} isLight={isLight} />)
                ) : (
                  <li className={cx("p-2 text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>No hay miembros en este equipo.</li>
                )}
              </ul>
            </div>

            <div
              className={cx(
                "p-4",
                isLight
                  ? "rounded-2xl border-2 border-black"
                  : "rounded-2xl bg-card/60 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className={cx("text-sm font-extrabold uppercase tracking-wide", isLight ? "text-black" : "text-muted-foreground")}>
                  Actividad reciente
                </h3>
                <span className={cx("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>{recentActivity.length}</span>
              </div>
              {recentActivity.length > 0 ? (
                <ul className="max-h-[360px] space-y-2 overflow-auto pr-1">
                  {recentActivity.map((log) => (
                    <ActivityItem key={(log as any).id} log={log} isLight={isLight} />
                  ))}
                </ul>
              ) : (
                <div className={cx("p-2 text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
                  No hay actividad reciente para mostrar.
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}