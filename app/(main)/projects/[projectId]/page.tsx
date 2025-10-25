"use client";


import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { DragDropContext, DropResult } from "react-beautiful-dnd";

import { useAuth } from "@/context/AuthContext";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";

import ProjectHeader from "@/components/projects/kanban/ProjectHeader";
import KanbanColumn from "@/components/projects/kanban/KanbanColumn";
import TaskModal from "@/components/projects/kanban/TaskModal";
import type { TaskWithDetails } from "@/types";
import KanbanColumnsWrapper from "@/components/projects/kanban/KanbanColumnsWrapper";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { archiveAllDoneTasks } from "@/services/kanbanService";

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
    handleSubtaskToggle,
    updatingSubtaskId,
  } = useKanbanBoard(projectId, teamId);
  const [isArchivingAll, setIsArchivingAll] = useState(false);
  // Estado modal (crear/editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [initialFilterSet, setInitialFilterSet] = useState(false);

  useEffect(() => {
    // Espera a que el rol y el usuario estén cargados
    if (userRole && user?.uid && !isTeamLoading && !initialFilterSet) {
      if (userRole === 'member') {
        // Si es member, aplica el filtro de "mis tareas" por defecto
        setAssignedUserFilter([user.uid]);
      }
      // Marcamos como aplicado (para admin o member)
      setInitialFilterSet(true);
    }
  }, [userRole, user?.uid, isTeamLoading, initialFilterSet, setAssignedUserFilter]);

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

  const handleArchiveAllDone = async () => {
    if (!user || userRole !== 'admin' || isArchivingAll) return;

    // Preguntar confirmación
    if (!window.confirm("¿Estás seguro de que deseas archivar todas las tareas completadas en este proyecto?")) {
      return;
    }

    setIsArchivingAll(true);
    const toastId = toast.loading("Archivando tareas completadas...");

    try {
      const result = await archiveAllDoneTasks(projectId, user.uid, teamId);

      if (result.archivedCount > 0) {
        toast.success(`${result.archivedCount} tarea(s) archivada(s). Refrescando tablero...`, { id: toastId });
        refreshTasks(); // Actualiza la UI del tablero
      } else {
        toast.success("No había tareas completadas para archivar.", { id: toastId });
      }
    } catch (err) {
      console.error("Error al archivar tareas completadas:", err);
      toast.error("Error al archivar las tareas.", { id: toastId });
    } finally {
      setIsArchivingAll(false);
    }
  };

  const isLoading = isBoardLoading || isTeamLoading || !user;

  // Errores y estados sin equipo
  if (!teamId && !isTeamLoading) {
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
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      {/* Header normal (NO sticky): se desplaza con el scroll */}
      <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 2xl:-mx-12 2xl:px-12">
        <ProjectHeader
          projectId={projectId || "Proyecto"}
          teamMembers={teamMembers}
          availableTags={availableTags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedUsers={assignedUserFilter}
          onUserFilterChange={setAssignedUserFilter}
          selectedTags={tagFilter}
          onTagFilterChange={setTagFilter}
          onNewTaskClick={openCreateModal}
          userRole={userRole}
          currentUserId={user?.uid}
          onArchiveAllDone={handleArchiveAllDone}
          isArchivingAll={isArchivingAll}
        />
      </div>

      {/* Tablero Kanban horizontal */}
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Spinner size={40} label="Cargando tareas…" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd as (result: DropResult) => void}>
          <KanbanColumnsWrapper className="mt-4 pb-6">
            {Object.values(columns).map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onTaskClick={openEditModal}
                onSubtaskToggle={handleSubtaskToggle}
                updatingSubtaskId={updatingSubtaskId}
                userRole={userRole}
                currentUserId={user!.uid}
              />
            ))}
          </KanbanColumnsWrapper>
        </DragDropContext>
      )}

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