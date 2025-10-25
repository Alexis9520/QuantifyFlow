import { useState, useEffect, useCallback, useMemo } from 'react';
import { getProjectsByTeamWithTaskCount } from '@/services/projectService';
import { Project } from '@/types';

/**
 * Hook para obtener y filtrar los proyectos de un equipo.
 * @param teamId - El ID del equipo actual.
 */
export function useProjects(teamId?: string) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProjects = useCallback(async () => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const projectsData = await getProjectsByTeamWithTaskCount(teamId);
      setAllProjects(projectsData);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("No se pudieron cargar los proyectos.");
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return allProjects;
    // 👇 CAMBIO: Se utiliza 'name' en lugar de 'nombre' para el filtrado.
    return allProjects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProjects, searchTerm]);

  return { 
    allProjects,
    projects: filteredProjects, 
    isLoading, 
    error, 
    setSearchTerm,
    refreshProjects: fetchProjects 
  };
}
