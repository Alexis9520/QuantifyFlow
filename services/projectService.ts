import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc, // Importar doc
  getDoc, // Importar getDoc
  updateDoc, // Importar updateDoc
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, ProjectUrl, TaskCountBreakdown } from '@/types'; // Asegúrate de que este tipo coincida con tu nueva estructura

export interface CreateProjectData {
  teamId: string;
  name: string;
  description?: string;
  urls?: ProjectUrl[]; 
}

async function getTaskBreakdown(projectId: string): Promise<TaskCountBreakdown> {
  const tasksRef = collection(db, 'tasks');
  
  // Query base (solo tareas no archivadas)
  const baseQuery = query(
    tasksRef,
    where('projectId', '==', projectId),
    where('isArchived', '==', false)
  );

  // Queries para cada estado
  const allSnap = getCountFromServer(baseQuery);
  const todoSnap = getCountFromServer(query(baseQuery, where('status', '==', 'todo')));
  const inProgressSnap = getCountFromServer(query(baseQuery, where('status', '==', 'in-progress')));
  const doneSnap = getCountFromServer(query(baseQuery, where('status', '==', 'done')));

  // Esperamos todas las consultas en paralelo
  const [allCount, todoCount, inProgressCount, doneCount] = await Promise.all([
    allSnap,
    todoSnap,
    inProgressSnap,
    doneSnap,
  ]);

  return {
    all: allCount.data().count,
    todo: todoCount.data().count,
    inProgress: inProgressCount.data().count,
    done: doneCount.data().count,
  };
}

/**
 * Obtiene todos los proyectos ACTIVOS de un equipo.
 * Ahora incluye el desglose de tareas (todo, inProgress, done).
 */
export async function getProjectsByTeamWithTaskCount(teamId: string): Promise<Project[]> {
  if (!teamId) return [];

  const projectsRef = collection(db, 'projects');
  const projectsQuery = query(
    projectsRef,
    where('teamId', '==', teamId),
    where('status', '==', 'active')
  );

  const projectsSnapshot = await getDocs(projectsQuery);
  const projects = projectsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      urls: data.urls || [],
    } as Project;
  });

  // Para cada proyecto, obtenemos el desglose de tareas
  const projectPromises = projects.map(async (project) => {
    const taskCounts = await getTaskBreakdown(project.id); // 👈 Usamos el helper
    return {
      ...project,
      taskCounts: taskCounts, // 👈 Asignamos el desglose
    };
  });

  return Promise.all(projectPromises);
}

export async function getArchivedProjectsByTeamWithTaskCount(teamId: string): Promise<Project[]> {
  if (!teamId) return [];

  const projectsRef = collection(db, 'projects');
  const projectsQuery = query(
    projectsRef,
    where('teamId', '==', teamId),
    where('status', '==', 'archived')
  );

  const projectsSnapshot = await getDocs(projectsQuery);
  const projects = projectsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      urls: data.urls || [],
    } as Project;
  });

  // Para cada proyecto, obtenemos el desglose de tareas
  const projectPromises = projects.map(async (project) => {
    const taskCounts = await getTaskBreakdown(project.id); // 👈 Usamos el helper
    return {
      ...project,
      taskCounts: taskCounts, // 👈 Asignamos el desglose
    };
  });

  return Promise.all(projectPromises);
}


export async function createProject(projectData: CreateProjectData) { 
  if (!projectData.teamId || !projectData.name) {
    throw new Error("El ID del equipo y el nombre del proyecto son requeridos.");
  }

  const projectsRef = collection(db, 'projects');
  return await addDoc(projectsRef, {
    ...projectData,
    description: projectData.description || "", 
    status: 'active',
    urls: projectData.urls || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  if (!projectId) return null;

  const projectRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    console.error("No se encontró el proyecto con ID:", projectId);
    return null;
  }

  const data = projectSnap.data();
  const taskCounts = await getTaskBreakdown(projectId); // 👈 Usamos el helper

  return {
    id: projectSnap.id,
    ...data,
    urls: data.urls || [],
    taskCounts: taskCounts, // 👈 Asignamos el desglose
  } as Project;
}
export interface UpdateProjectData {
  name?: string;
  description?: string;
  urls?: ProjectUrl[];
}


export async function updateProject(
  projectId: string,
  dataToUpdate: UpdateProjectData
) {
  if (!projectId) {
    throw new Error("El ID del proyecto es requerido para actualizar.");
  }

  const projectRef = doc(db, 'projects', projectId);

  return await updateDoc(projectRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveProject(projectId: string) {
  if (!projectId) {
    throw new Error("El ID del proyecto es requerido para archivar.");
  }

  const projectRef = doc(db, 'projects', projectId);

  return await updateDoc(projectRef, {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}
export async function unarchivedProject(projectId: string) {
  if (!projectId) {
    throw new Error("El ID del proyecto es requerido para archivar.");
  }

  const projectRef = doc(db, 'projects', projectId);

  return await updateDoc(projectRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}