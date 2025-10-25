// components/dashboards/admin-dashboard-wrapper.tsx (NUEVO ARCHIVO)
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard"; // El componente visual
import { AdminDashboardData } from "@/types/dashboard-types";
import { TaskWithDetails, Subtask } from "@/types"; // Importar tipos necesarios
import { updateSubtaskCompletion, archiveTask } from "@/services/kanbanService"; // Importar servicios
import { toast } from "sonner"; // O tu librería de toast
import { useProjects } from '@/hooks/useProjects'; // 👈 Importa el hook

interface AdminDashboardWrapperProps {
  userName: string | null;
  initialAdminData: AdminDashboardData | null;
  currentUserId: string; // ID del admin actual
}

export function AdminDashboardWrapper({
  userName,
  initialAdminData,
  currentUserId, // Recibe el ID del admin
}: AdminDashboardWrapperProps) {
  const router = useRouter();
  const [liveData, setLiveData] = useState(initialAdminData);
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);

  const { allProjects, isLoading: isLoadingProjects, error: projectsError } = useProjects(liveData?.team.id);

  // Sincronizar si los datos iniciales cambian
  useEffect(() => {
    setLiveData(initialAdminData);
  }, [initialAdminData]);

  const handleRefresh = () => {
    router.refresh(); // Refresca los datos del servidor (Server Component)
  };

  // --- Handlers (Copiados y adaptados de MemberDashboard) ---
  const handleSubtaskToggle = (taskId: string, subtaskId: string, newCompleted: boolean) => {
    if (updatingSubtaskId || !liveData) return;
    setUpdatingSubtaskId(subtaskId);
    const originalData = liveData;
    let didTaskStatusChange = false;

    // Actualización optimista de adminAssignedTasks
    const newAdminTasks = liveData.adminAssignedTasks.map((task) => {
        if (task.id !== taskId) return task;
        const originalStatus = task.status;
        const newSubtasks = task.subtasks.map((sub) =>
            sub.id === subtaskId ? { ...sub, completed: newCompleted } : sub
        );
        const totalSubtasks = newSubtasks.length;
        const completedSubtasks = newSubtasks.filter(s => s.completed).length;
        let determinedStatus: 'todo' | 'in-progress' | 'done';
        if (totalSubtasks === 0 || completedSubtasks === 0) determinedStatus = 'todo';
        else if (completedSubtasks === totalSubtasks) determinedStatus = 'done';
        else determinedStatus = 'in-progress';
        let newStatus = originalStatus;
        if (originalStatus !== determinedStatus) {
            newStatus = determinedStatus;
            didTaskStatusChange = true;
        }
        return { ...task, subtasks: newSubtasks, status: newStatus };
    });

    // Actualiza el estado completo
    setLiveData(prevData => prevData ? { ...prevData, adminAssignedTasks: newAdminTasks } : null);

    // Llamada a Firebase
    const taskTeamId = originalData.team.id; // Asumimos que teamId está en team.id
    updateSubtaskCompletion(subtaskId, taskId, newCompleted, currentUserId, taskTeamId)
        .then(() => { if (didTaskStatusChange) handleRefresh(); }) // Refrescar si el estado cambió
        .catch((err) => {
            console.error("Error al actualizar subtask (admin):", err);
            toast.error("Error al actualizar subtarea.");
            setLiveData(originalData); // Revertir
        })
        .finally(() => setUpdatingSubtaskId(null));
  };

  const handleArchiveTask = (taskId: string) => {
      if (archivingTaskId || !liveData) return;
      setArchivingTaskId(taskId);
      const toastId = toast.loading("Archivando tarea...");
      const originalData = liveData;

      // Optimista: Filtra la tarea de adminAssignedTasks
      const newAdminTasks = liveData.adminAssignedTasks.filter((task) => task.id !== taskId);
      setLiveData(prevData => prevData ? { ...prevData, adminAssignedTasks: newAdminTasks } : null);

      // Llamada a Firebase
      const taskTeamId = originalData.team.id;
      archiveTask(taskId, currentUserId, taskTeamId)
          .then(() => toast.success("Tarea archivada.", { id: toastId }))
          .catch((err) => {
              console.error("Error al archivar tarea (admin):", err);
              toast.error("Error al archivar tarea.", { id: toastId });
              setLiveData(originalData); // Revertir
          })
          .finally(() => setArchivingTaskId(null));
  };

  // Renderiza el componente visual pasándole todo
  return (
    <AdminDashboard
      userName={userName}
      adminData={liveData} // Pasa el estado vivo
      // Pasa los handlers y estados necesarios para DashboardTaskCard
      onSubtaskToggle={handleSubtaskToggle}
      projectsName={allProjects} // 👈 Pasando la lista completa
      isLoadingProjects={isLoadingProjects}
      updatingSubtaskId={updatingSubtaskId}
      onArchiveTask={handleArchiveTask}
      archivingTaskId={archivingTaskId}
    />
  );
}