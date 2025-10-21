"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import { useAuth } from "@/context/AuthContext";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";

import ProjectHeader from "@/components/projects/kanban/ProjectHeader";
import KanbanColumn from "@/components/projects/kanban/KanbanColumn";
import TaskModal from "@/components/projects/kanban/TaskModal";
import type { TaskWithDetails } from "@/types";

// Mensaje de carga minimalista (sin barra ni tarjetas)
// Light: blanco/negro con borde-2; Dark: panel sutil
const LoadingNotice = ({ isLight }: { isLight: boolean }) => (
  <div
    className={
      isLight
        ? "rounded-2xl border-2 border-black p-4"
        : "rounded-2xl bg-card/60 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur"
    }
    role="status"
    aria-live="polite"
  >
    <p className={isLight ? "text-lg font-extrabold text-black" : "text-lg font-semibold"}>
      Cargando tareas…
    </p>
    <div className="mt-3 flex items-end gap-2">
      <span
        className={isLight ? "h-2.5 w-2.5 animate-bounce rounded-full bg-black" : "h-2.5 w-2.5 animate-bounce rounded-full bg-white/80"}
        style={{ animationDelay: "0ms" }}
      />
      <span
        className={isLight ? "h-2.5 w-2.5 animate-bounce rounded-full bg-black" : "h-2.5 w-2.5 animate-bounce rounded-full bg-white/80"}
        style={{ animationDelay: "140ms" }}
      />
      <span
        className={isLight ? "h-2.5 w-2.5 animate-bounce rounded-full bg-black" : "h-2.5 w-2.5 animate-bounce rounded-full bg-white/80"}
        style={{ animationDelay: "280ms" }}
      />
    </div>
  </div>
);

interface ProjectPageProps {
  params: { projectId: string };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = params;
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const { currentTeam, userRole, isLoading: isTeamLoading } = useCurrentTeam(user?.uid);
  const teamId = currentTeam?.teamId ?? "";

  const {
    columns,
    isLoading: isBoardLoading,
    error,
    handleDragEnd,
    teamMembers,
    availableTags,
    searchQuery,
    setSearchQuery,
    assignedUserFilter,
    setAssignedUserFilter,
    tagFilter,
    setTagFilter,
    refreshTasks,
  } = useKanbanBoard(projectId, teamId);

  // Estado modal (crear/editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

  const openCreateModal = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleSaveChanges = () => {
    refreshTasks();
    closeModal();
  };

  const isLoading = isBoardLoading || isTeamLoading;

  // Cargando: solo mensaje con animación (sin barra ni skeleton)
  if (isLoading) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
        <LoadingNotice isLight={isLight} />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <p className={isLight ? "text-center text-sm font-semibold text-black" : "text-center text-sm font-medium text-destructive"}>
          Error: No se pudo encontrar el equipo o no perteneces a uno.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <p className={isLight ? "text-center text-sm font-semibold text-black" : "text-center text-sm font-medium text-destructive"}>
          Error: {error}
        </p>
      </div>
    );
  }

  return (
    // Contenedor fluido
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      {/* Header de proyecto sticky sutil (queda bajo el header global) */}
      <div className="-mx-4 sticky top-0 z-30 bg-background/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 2xl:-mx-12 2xl:px-12">
        <ProjectHeader
          projectName={currentTeam?.teamName || "Proyecto"}
          teamMembers={teamMembers}
          availableTags={availableTags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedUsers={assignedUserFilter}
          onUserFilterChange={setAssignedUserFilter}
          selectedTags={tagFilter}
          onTagFilterChange={setTagFilter}
          onNewTaskClick={openCreateModal}
        />
      </div>

      {/* Tablero Kanban horizontal */}
      <DragDropContext onDragEnd={handleDragEnd as (result: DropResult) => void}>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-6">
          {Object.values(columns).map((column) => (
            <div key={column.id} className="min-w-[320px] flex-shrink-0 sm:min-w-[360px] lg:min-w-[380px]">
              <KanbanColumn column={column} onTaskClick={openEditModal} onRefreshBoard={refreshTasks} />
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Modal de tarea */}
      {isModalOpen && user && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveChanges}
          taskToEdit={selectedTask}
          projectId={projectId}
          teamId={teamId}
          userId={user.uid}
          userRole={userRole}
          teamMembers={teamMembers}
          availableTags={availableTags}
        />
      )}
    </div>
  );
}