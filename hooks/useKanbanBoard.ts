"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { DropResult } from "react-beautiful-dnd";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Servicios (asegúrate de que estas funciones devuelvan los datos enriquecidos)
import {
  getProjectTasks,
  updateTaskStatus,
  getTeamMembersForFilter,
} from "@/services/kanbanService";

import type { TaskWithDetails, User, Tag } from "@/types";
import { useAuth } from "@/context/AuthContext";

type TaskStatus = "todo" | "in-progress" | "done";

type ColumnsMap = Record<
  TaskStatus,
  {
    id: TaskStatus;
    title: string;
    tasks: TaskWithDetails[];
  }
>;

const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const sortByDueDateThenTitle = (a: TaskWithDetails, b: TaskWithDetails) => {
  const ad = toDateSafe(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  const bd = toDateSafe(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  return a.title.localeCompare(b.title);
};

// Fecha robusta (Date | Timestamp | string | number | {seconds,nanoseconds})
function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    try {
      const d = value.toDate();
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
}

export const useKanbanBoard = (projectId: string, teamId: string) => {
  const { user } = useAuth();

  // Estado base
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedUserFilter, setAssignedUserFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  // Para evitar condiciones de carrera al refrescar rápidamente
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!projectId || !teamId) {
      // Si faltan IDs, limpiamos y salimos sin marcar error
      setTasks([]);
      setTeamMembers([]);
      setAvailableTags([]);
      setIsLoading(false);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [projectTasks, members, tagsSnapshot] = await Promise.all([
        getProjectTasks(projectId, teamId),
        getTeamMembersForFilter(teamId),
        getDocs(query(collection(db, "tags"), where("teamId", "==", teamId))),
      ]);

      if (currentFetchId !== fetchIdRef.current) return; // respuesta obsoleta

      const allTags: Tag[] = tagsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...(doc.data() as Omit<Tag, "id">),
          } as Tag)
      );

      for (const t of projectTasks) {
        if (!t.assignedTo && (t as any).assignedToId) {
          console.warn(
            `[useKanbanBoard] Tarea ${t.id} tiene assignedToId pero falta el objeto assignedTo.`
          );
        }
        if (!Array.isArray(t.tags)) {
          (t as any).tags = [];
        }
      }

      setTasks(projectTasks);
      setTeamMembers(members);
      setAvailableTags(allTags);
    } catch (err) {
      console.error("[useKanbanBoard] Error durante el fetch:", err);
      setError("Failed to fetch project data.");
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, teamId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasUserFilter = assignedUserFilter.length > 0;
    const hasTagFilter = tagFilter.length > 0;

    return tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const matchesSearch = q ? title.includes(q) : true;

      const userId = (task as any).assignedToId || task.assignedTo?.uid || "";
      const matchesUser = hasUserFilter ? assignedUserFilter.includes(userId) : true;

      const taskTags = Array.isArray(task.tags) ? task.tags : [];
      const matchesTags = hasTagFilter
        ? taskTags.some((t) => tagFilter.includes(t.id))
        : true;

      return matchesSearch && matchesUser && matchesTags;
    });
  }, [tasks, searchQuery, assignedUserFilter, tagFilter]);

  const columns = useMemo<ColumnsMap>(() => {
    const base: ColumnsMap = {
      todo: { id: "todo", title: COLUMN_TITLES.todo, tasks: [] },
      "in-progress": { id: "in-progress", title: COLUMN_TITLES["in-progress"], tasks: [] },
      done: { id: "done", title: COLUMN_TITLES.done, tasks: [] },
    };

    for (const t of filteredTasks) {
      if (base[t.status]) base[t.status].tasks.push(t);
    }

    // Ordena cada columna por fecha de vencimiento y luego título
    base.todo.tasks.sort(sortByDueDateThenTitle);
    base["in-progress"].tasks.sort(sortByDueDateThenTitle);
    base.done.tasks.sort(sortByDueDateThenTitle);

    return base;
  }, [filteredTasks]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination || !user) return;

      const from = source.droppableId as TaskStatus;
      const to = destination.droppableId as TaskStatus;

      if (from === to && destination.index === source.index) return;
      if (from === to) return; // mismo estado, nada que hacer

      // Optimistic UI
      setTasks((prev) =>
        prev.map((t) => (t.id === draggableId ? { ...t, status: to } : t))
      );

      updateTaskStatus(draggableId, to, user.uid, teamId).catch((err) => {
        console.error("[useKanbanBoard] Error al actualizar estado de la tarea:", err);
        setError("Failed to update task. Please try again.");
        // Revertir UI
        setTasks((prev) =>
          prev.map((t) => (t.id === draggableId ? { ...t, status: from } : t))
        );
      });
    },
    [teamId, user]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setAssignedUserFilter([]);
    setTagFilter([]);
  }, []);

  return {
    // tablero
    columns,
    isLoading,
    error,

    // acciones
    handleDragEnd,
    refreshTasks: fetchData,

    // filtros
    teamMembers,
    availableTags,
    searchQuery,
    setSearchQuery,
    assignedUserFilter,
    setAssignedUserFilter,
    tagFilter,
    setTagFilter,
    clearFilters,
  };
};