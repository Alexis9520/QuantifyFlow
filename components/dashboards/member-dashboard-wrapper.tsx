// components/dashboards/member-dashboard-wrapper.tsx
"use client";

import React, { useState, useEffect } from "react"; // <-- Importar hooks de estado
import { useRouter } from "next/navigation";
import { MemberDashboard } from "./member-dashboard";
import type { UserDashboardData } from "@/types/dashboard-types";
import { useProjects } from '@/hooks/useProjects';

interface MemberDashboardWrapperProps {
  userName: string | null;
  // Recibimos los datos iniciales del servidor
  memberData: UserDashboardData | null;
}

export function MemberDashboardWrapper({
  userName,
  memberData,
}: MemberDashboardWrapperProps) {
  const router = useRouter();

  // --- CAMBIO: Guardamos los datos en un estado local ---
  // memberData (prop) = datos iniciales del servidor
  // liveData (estado) = datos que el usuario ve y modifica
  const [liveData, setLiveData] = useState(memberData);
  const { allProjects, isLoading: isLoadingProjects, error: projectsError } = useProjects(liveData?.teams[0]?.id);
  // Sincroniza el estado si los props del servidor cambian
  useEffect(() => {
    setLiveData(memberData);
  }, [memberData]);
  
  // Esta función se usará para la sincronización de fondo
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <MemberDashboard
      userName={userName}
      // Pasamos el estado (liveData) en lugar del prop (memberData)
      liveData={liveData} 
      // Pasamos la función para MODIFICAR el estado
      setLiveData={setLiveData}
      // Pasamos la función de refresco del router
      onRefresh={handleRefresh}
      projects={allProjects} // 👈 Pasando la lista completa
      isLoadingProjects={isLoadingProjects}
    />
  );
}