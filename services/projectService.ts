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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, ProjectUrl } from '@/types'; // Asegúrate de que este tipo coincida con tu nueva estructura

export interface CreateProjectData {
  teamId: string;
  name: string;
  description?: string;
  urls?: ProjectUrl[]; // 👈 CAMBIO: Añadido el campo de URLs
}

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
      // 👇 CAMBIO: Asegurarnos de que 'urls' sea un array aunque no exista en FB
      urls: data.urls || [],
    } as Project;
  });

  // Para cada proyecto, obtenemos el conteo de tareas
  const projectPromises = projects.map(async (project) => {
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('projectId', '==', project.id));
    const tasksSnapshot = await getDocs(tasksQuery);

    return {
      ...project,
      taskCount: tasksSnapshot.size,
    };
  });

  return Promise.all(projectPromises);
}

export async function createProject(projectData: CreateProjectData) { // 👈 CAMBIO: Usando la nueva interfaz
  if (!projectData.teamId || !projectData.name) {
    throw new Error("El ID del equipo y el nombre del proyecto son requeridos.");
  }

  const projectsRef = collection(db, 'projects');
  return await addDoc(projectsRef, {
    ...projectData,
    description: projectData.description || "", // Guardar string vacío si es undefined
    status: 'active',
    // 👇 CAMBIO: Usar las URLs del input, o un array vacío si no se proporcionan
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

  // También obtenemos el conteo de tareas para que el objeto esté completo
  const tasksRef = collection(db, 'tasks');
  const tasksQuery = query(tasksRef, where('projectId', '==', projectId));
  const tasksSnapshot = await getDocs(tasksQuery);

  return {
    id: projectSnap.id,
    ...data,
    urls: data.urls || [], // Asegurar que urls sea un array
    taskCount: tasksSnapshot.size, // Añadir el conteo de tareas
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

  // updateDoc ignora los campos 'undefined',
  // así que podemos pasar el objeto de datos directamente.
  return await updateDoc(projectRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
}