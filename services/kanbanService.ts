import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  writeBatch,
  getDoc,
  deleteDoc,
  orderBy,
  deleteField,
} from 'firebase/firestore';
import type { Task, Subtask, Tag, User, ActivityLog, TaskWithDetails } from '@/types';

// Helper para crear logs de actividad
const createActivityLog = async (logData: Omit<ActivityLog, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'activityLog'), {
      ...logData,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error creating activity log:", error);
  }
};

// Obtiene todas las tareas y sus detalles para un proyecto específico
export const getProjectTasks = async (projectId: string, teamId: string): Promise<TaskWithDetails[]> => {
  const tasksQuery = query(
    collection(db, 'tasks'), 
    where('projectId', '==', projectId),
    where('isArchived', '==', false) // 👈 AÑADE ESTA LÍNEA
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  // Optimización: Recolectar todos los IDs para hacer menos consultas
  const userIds = new Set<string>();
  tasks.forEach(task => {
    // 👈 CAMBIO: Iterar sobre el array de IDs
    task.assignedToIds?.forEach(id => userIds.add(id)); 
  });

  let users: Record<string, User> = {};
  if (userIds.size > 0) {
    // 👇 CAMBIO (y CORRECCIÓN): Usar '__name__' para consultar por Document ID.
    // 'uid' es un campo, pero los IDs de asignación suelen ser los IDs del documento.
    const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(doc => {
      // 👈 CAMBIO: Asegurar que el uid esté en el objeto (usando el doc.id)
      users[doc.id] = { uid: doc.id, ...doc.data() } as User; 
    });
  }

  // Obtener subtareas, etiquetas para cada tarea
  const tasksWithDetails = await Promise.all(
    tasks.map(async (task) => {
      // ... (la lógica de subtareas y tags no cambia) ...
      const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
      const subtasksSnapshot = await getDocs(subtasksQuery);
      const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));

      const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));
      const taskTagsSnapshot = await getDocs(taskTagsQuery);
      const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);
      
      let tags: Tag[] = [];
      if (tagIds.length > 0) {
        const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
        const tagsSnapshot = await getDocs(tagsQuery);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      }
      
      return {
        ...task,
        // 👇 CAMBIO: Mapear el array de IDs a un array de objetos User
        assignedTo: task.assignedToIds
          ? task.assignedToIds.map(id => users[id]).filter(Boolean) // .filter(Boolean) elimina nulos si un usuario no se encontró
          : [], // Devolver un array vacío si no hay asignados
        subtasks,
        tags,
      };
    })
  );

  return tasksWithDetails;
};

// Actualiza el estado de una tarea (usado para Drag-and-Drop)
export const updateTaskStatus = async (
  taskId: string,
  newStatus: 'todo' | 'in-progress' | 'done',
  userId: string,
  teamId: string,
) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { status: newStatus, updatedAt: Timestamp.now() });

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Cambio el estado de una tarea',
    details: { newStatus },
  });
};

// Actualiza una subtarea y verifica si la tarea principal debe completarse
export const updateSubtaskCompletion = async (
  subtaskId: string,
  taskId: string,
  completed: boolean,
  userId: string,
  teamId: string,
) => {
  const subtaskRef = doc(db, 'subtasks', subtaskId);
  const taskRef = doc(db, 'tasks', taskId);

  // 1. Actualizar la subtarea
  await updateDoc(subtaskRef, { completed });

  // 2. Crear el log de la subtarea
  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: completed ? 'Subtarea hecha' : 'Subtarea reabierta',
    details: { subtaskId }
  });

  // --- 3. Lógica de recalculo de estado ---
  const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', taskId));
  const subtasksSnapshot = await getDocs(subtasksQuery);
  
  const allSubtasks = subtasksSnapshot.docs.map(d => d.data() as Subtask);
  const totalSubtasks = allSubtasks.length;
  const completedSubtasks = allSubtasks.filter(st => st.completed).length;

  let newStatus: 'todo' | 'in-progress' | 'done';

  if (totalSubtasks === 0 || completedSubtasks === 0) {
    // Si no hay subtareas, o ninguna está completa
    newStatus = 'todo';
  } else if (completedSubtasks === totalSubtasks) {
    // Si todas están completas
    newStatus = 'done';
  } else {
    // Si algunas (pero no todas) están completas
    newStatus = 'in-progress';
  }

  // 4. Actualizar la tarea principal SÓLO SI el estado cambió
  const taskSnap = await getDoc(taskRef);
  if (taskSnap.exists()) {
    const currentStatus = taskSnap.data().status;
    
    if (currentStatus !== newStatus) {
      // Usamos tu función existente para que también genere el log de "status_change"
      await updateTaskStatus(taskId, newStatus, userId, teamId);
    }
  }
};


export const getTeamMembersForFilter = async (teamId: string): Promise<User[]> => {
  const membersQuery = query(collection(db, "teamMembers"), where("teamId", "==", teamId));
  const membersSnap = await getDocs(membersQuery);
  const userIds = membersSnap.docs.map(doc => doc.data().userId);

  if (userIds.length === 0) return [];

  const usersQuery = query(collection(db, "users"), where("uid", "in", userIds));
  const usersSnap = await getDocs(usersQuery);

  return usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
}


type CreateTaskData = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  subtaskTitles?: string[];
  tagIds?: string[];
};

export const createTask = async (taskData: CreateTaskData): Promise<string> => {
  const batch = writeBatch(db);
  const taskRef = doc(collection(db, 'tasks'));

  batch.set(taskRef, {
    ...taskData,
    status: 'todo',
    isArchived: false, // 👈 AÑADE ESTA LÍNEA
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  taskData.subtaskTitles?.forEach(title => {
    if (title.trim() === '') return;
    const subtaskRef = doc(collection(db, 'subtasks'));
    batch.set(subtaskRef, { taskId: taskRef.id, title, completed: false, createdAt: Timestamp.now() });
  });

  taskData.tagIds?.forEach(tagId => {
    const taskTagRef = doc(collection(db, 'taskTags'));
    batch.set(taskTagRef, { taskId: taskRef.id, tagId });
  });

  await batch.commit();

  await createActivityLog({
    taskId: taskRef.id,
    teamId: taskData.teamId,
    userId: taskData.createdBy,
    action: 'Tarea creada',
    details: { title: taskData.title },
  });

  return taskRef.id;
};


export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt'>>,
  userId: string,
  teamId: string
) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { ...updates, updatedAt: Timestamp.now() });

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Tarea actualizada',
    details: { updatedFields: Object.keys(updates) },
  });
};

export const deleteTask = async (taskId: string, userId: string, teamId: string) => {
  const batch = writeBatch(db);

  const taskRef = doc(db, 'tasks', taskId);
  batch.delete(taskRef);

  const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', taskId));
  const subtasksSnapshot = await getDocs(subtasksQuery);
  subtasksSnapshot.forEach(doc => batch.delete(doc.ref));

  const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', taskId));
  const taskTagsSnapshot = await getDocs(taskTagsQuery);
  taskTagsSnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Tarea eliminada',
  });
};


export const addSubtask = async (taskId: string, title: string, userId: string, teamId: string): Promise<string> => {
  const newSubtaskRef = await addDoc(collection(db, 'subtasks'), {
    taskId,
    title,
    completed: false,
    createdAt: Timestamp.now(),
  });

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Subtarea añadida',
    details: { title },
  });

  return newSubtaskRef.id;
};

export const removeSubtask = async (subtaskId: string, taskId: string, userId: string, teamId: string) => {
  await deleteDoc(doc(db, 'subtasks', subtaskId));

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Subtarea eliminada',
    details: { subtaskId },
  });
};

export const setTaskTags = async (taskId: string, newTagIds: string[], userId: string, teamId: string) => {
  const batch = writeBatch(db);

  const oldTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', taskId));
  const oldTagsSnapshot = await getDocs(oldTagsQuery);
  oldTagsSnapshot.forEach(doc => batch.delete(doc.ref));

  newTagIds.forEach(tagId => {
    const newTaskTagRef = doc(collection(db, 'taskTags'));
    batch.set(newTaskTagRef, { taskId, tagId });
  });

  await batch.commit();

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Tags de tarea actualizados',
    details: { newTagIds },
  });
};
export const updateSubtaskTitle = async (
  subtaskId: string,
  newTitle: string,
  userId: string,
  teamId: string,
  taskId: string
) => {
  if (!newTitle.trim()) {
    throw new Error("Subtask title cannot be empty.");
  }
  const subtaskRef = doc(db, 'subtasks', subtaskId);
  await updateDoc(subtaskRef, { title: newTitle });

  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Subtarea actualizada',
    details: { subtaskId, newTitle },
  });
};
export const updateSubtaskStatus = async (
  taskId: string,
  subtaskId: string,
  completed: boolean
) => {
  try {
    const batch = writeBatch(db);

    // Referencia al documento de la tarea padre (esto sigue siendo correcto)
    const taskRef = doc(db, "tasks", taskId);

    // --- CORRECCIÓN AQUÍ ---
    // Apunta a la colección raíz 'subtasks' usando el ID de la subtarea
    const subtaskRef = doc(db, "subtasks", subtaskId);

    // 1. Actualiza el campo 'completed' de la subtarea
    batch.update(subtaskRef, { completed });

    // 2. Actualiza el campo 'updatedAt' de la tarea padre para reflejar el cambio
    batch.update(taskRef, { updatedAt: new Date() });

    // Ejecuta ambas operaciones de forma atómica
    await batch.commit();
    console.log(`Subtarea ${subtaskId} actualizada a: ${completed}`);
  } catch (error) {
    console.error("Error al actualizar la subtarea:", error);
    // Relanza el error para que el componente pueda manejarlo
    throw new Error("No se pudo actualizar el estado de la subtarea.");
  }
};

export const enrichTaskWithDetails = async (task: Task, usersCache: Record<string, User>): Promise<TaskWithDetails> => {
  // 1. Obtener subtareas
  const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
  
  // 2. Obtener IDs de etiquetas
  const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));

  // ... (el resto de la lógica de Promise.all, subtareas y tags no cambia) ...
  const [subtasksSnapshot, taskTagsSnapshot] = await Promise.all([
    getDocs(subtasksQuery),
    getDocs(taskTagsQuery)
  ]);

  const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));
  const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);

  let tags: Tag[] = [];
  if (tagIds.length > 0) {
    const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
    const tagsSnapshot = await getDocs(tagsQuery);
    tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
  }
  
  // 4. Construir y devolver el objeto completo
  return {
    ...task,
    // 👇 CAMBIO: Mapear el array de IDs a un array de objetos User desde el caché
    assignedTo: task.assignedToIds
      ? task.assignedToIds.map(id => usersCache[id]).filter(Boolean)
      : [],
    subtasks,
    tags,
  };
};
export const getCurrentUserTasks = async (userId: string): Promise<TaskWithDetails[]> => {
  const tasksQuery = query(
    collection(db, 'tasks'), 
    where('assignedToIds', 'array-contains', userId),
    where('isArchived', '==', false) // 👈 AÑADE ESTA LÍNEA
  ); 
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

  if (tasks.length === 0) {
    return [];
  }

  // 2. Obtener los datos de TODOS los usuarios asignados a estas tareas (no solo el actual)
  // 👇 CAMBIO: Lógica de recolección de todos los IDs
  const userIds = new Set<string>();
  tasks.forEach(task => {
    task.assignedToIds?.forEach(id => userIds.add(id));
  });

  let usersCache: Record<string, User> = {};
  if (userIds.size > 0) {
    // 👇 CAMBIO: Obtener todos los usuarios necesarios (usando __name__ para IDs de documento)
    const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(doc => {
      usersCache[doc.id] = { uid: doc.id, ...doc.data() } as User;
    });
  }

  // 3. Para cada tarea, obtener sus subtareas y etiquetas
  const tasksWithDetails = await Promise.all(
    tasks.map(async (task) => {
      // ... (la lógica de subtareas y tags no cambia) ...
      const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
      const subtasksSnapshot = await getDocs(subtasksQuery);
      const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));

      const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));
      const taskTagsSnapshot = await getDocs(taskTagsQuery);
      const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);

      let tags: Tag[] = [];
      if (tagIds.length > 0) {
        const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
        const tagsSnapshot = await getDocs(tagsQuery);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      }
      
      // 4. Combinar toda la información en un solo objeto.
      return {
        ...task,
        // 👇 CAMBIO: Mapear el array de IDs a un array de Users
        assignedTo: task.assignedToIds
          ? task.assignedToIds.map(id => usersCache[id]).filter(Boolean)
          : [],
        subtasks,
        tags,
      };
    })
  );

  return tasksWithDetails;
};

export const archiveTask = async (
  taskId: string, 
  userId: string, 
  teamId: string
) => {
  const taskRef = doc(db, 'tasks', taskId);
  
  await updateDoc(taskRef, {
    isArchived: true,
    archivedAt: Timestamp.now(),
    archivedBy: userId
  });

  // Log de actividad opcional pero recomendado
  await createActivityLog({
    taskId,
    teamId,
    userId,
    action: 'Tarea archivada',
  });
};

export const getArchivedTasks = async (projectId: string, teamId: string): Promise<TaskWithDetails[]> => {
  console.log(`[getArchivedTasks] Buscando tareas archivadas para proyecto: ${projectId}`);
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId),
    where('isArchived', '==', true), // 👈 Solo las archivadas
    orderBy('archivedAt', 'desc')    // 👈 Ordenar por fecha de archivo
  );

  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks: Task[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
  console.log(`[getArchivedTasks] ${tasks.length} tareas archivadas encontradas.`);

  if (tasks.length === 0) {
    return [];
  }

  // --- Lógica de Enriquecimiento (similar a getProjectTasks) ---

  // 1. Recolectar IDs de usuarios (asignados Y quien archivó)
  const userIds = new Set<string>();
  tasks.forEach(task => {
    task.assignedToIds?.forEach(id => userIds.add(id));
    if (task.archivedBy) { // Añadir el ID de quien archivó
      userIds.add(task.archivedBy);
    }
  });
  console.log(`[getArchivedTasks] IDs de usuarios a buscar: ${Array.from(userIds)}`);

  // 2. Obtener datos de usuarios
  let usersCache: Record<string, User> = {};
  if (userIds.size > 0) {
    const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(doc => {
      usersCache[doc.id] = { uid: doc.id, ...doc.data() } as User;
    });
     console.log(`[getArchivedTasks] ${Object.keys(usersCache).length} usuarios encontrados.`);
  }

  // 3. Enriquecer cada tarea con subtareas, etiquetas y usuarios
  const tasksWithDetails = await Promise.all(
    tasks.map(async (task) => {
      // Obtener subtareas
      const subtasksQuery = query(collection(db, 'subtasks'), where('taskId', '==', task.id));
      const subtasksSnapshot = await getDocs(subtasksQuery);
      const subtasks = subtasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subtask));

      // Obtener etiquetas
      const taskTagsQuery = query(collection(db, 'taskTags'), where('taskId', '==', task.id));
      const taskTagsSnapshot = await getDocs(taskTagsQuery);
      const tagIds = taskTagsSnapshot.docs.map(doc => doc.data().tagId);

      let tags: Tag[] = [];
      if (tagIds.length > 0) {
        const tagsQuery = query(collection(db, 'tags'), where('__name__', 'in', tagIds));
        const tagsSnapshot = await getDocs(tagsQuery);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
      }

      // Devolver objeto enriquecido
      return {
        ...task,
        assignedTo: task.assignedToIds // Usuarios asignados
          ? task.assignedToIds.map(id => usersCache[id]).filter(Boolean)
          : [],
        archivedByUser: task.archivedBy ? usersCache[task.archivedBy] : undefined, // 👈 Usuario que archivó
        subtasks,
        tags,
      } as TaskWithDetails; // Asegúrate que TaskWithDetails incluya archivedByUser opcional
    })
  );
  console.log(`[getArchivedTasks] Enriquecimiento completo.`);
  return tasksWithDetails;
};

export const archiveAllDoneTasks = async (
  projectId: string,
  userId: string, // Quién está realizando la acción
  teamId: string  // Para el log de actividad
): Promise<{ archivedCount: number }> => {
  
  // 1. Encontrar las tareas a archivar
  const tasksToArchiveQuery = query(
    collection(db, 'tasks'),
    where('projectId', '==', projectId),
    where('status', '==', 'done'),
    where('isArchived', '==', false) // Solo las que NO están ya archivadas
  );

  const querySnapshot = await getDocs(tasksToArchiveQuery);
  const tasksToArchive = querySnapshot.docs;

  if (tasksToArchive.length === 0) {
    console.log("[archiveAllDoneTasks] No hay tareas completadas para archivar.");
    return { archivedCount: 0 }; // Nada que hacer
  }

  // 2. Preparar el batch de actualización
  // Firestore limita los batches a 500 operaciones. Si esperas tener más,
  // necesitarías dividir esto en múltiples batches. Por ahora, asumimos < 500.
  if (tasksToArchive.length >= 500) {
     console.warn("[archiveAllDoneTasks] Se encontraron más de 499 tareas para archivar. Solo se procesarán las primeras 499.");
     // Considera implementar lógica de paginación o múltiples batches si esto es común.
  }
  
  const batch = writeBatch(db);
  let count = 0;

  for (const taskDoc of tasksToArchive) {
     if (count >= 499) break; // Límite de seguridad del batch
     const taskRef = doc(db, 'tasks', taskDoc.id);
     batch.update(taskRef, {
        isArchived: true,
        archivedAt: Timestamp.now(),
        archivedBy: userId
     });
     count++;
  }

  // 3. Ejecutar el batch
  await batch.commit();

  // 4. (Opcional pero recomendado) Crear un log de actividad general
  // Podrías crear un log por cada tarea, pero para una acción masiva,
  // uno general puede ser suficiente
  
  await createActivityLog({
     projectId, // Log a nivel de proyecto
     teamId,
     userId,
     action: 'Archivado masivo de tareas completadas',
     details: { count },
  });
  

  console.log(`[archiveAllDoneTasks] ${count} tareas completadas fueron archivadas.`);
  return { archivedCount: count };
};

export const unarchiveTask = async (
  taskId: string, 
  userId: string, 
  teamId: string
  // projectId?: string // Podrías necesitar projectId para el log
) => {
  const taskRef = doc(db, 'tasks', taskId);

  // Simplemente quitamos los campos de archivo
  await updateDoc(taskRef, {
    isArchived: false,
    archivedAt: deleteField(), // Importa deleteField de 'firebase/firestore'
    archivedBy: deleteField() 
  });

  // Log de actividad
  await createActivityLog({
    taskId, 
    teamId,
    userId,
    action: 'Tarea desarchivada',
    // projectId // Opcional
  });
};