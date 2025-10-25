import { Timestamp } from "firebase/firestore"

export type TeamMemberRol = 'admin' | 'member';

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  preferences: {
    theme: "light" | "dark"
    colorPalette: "default" | "blue" | "green" | "purple"
  }
  createdAt: Date
}

export interface Team {
  id: string
  teamName: string
  description?: string
  ownerUid: string
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  rol: "admin" | "member"
  joinedAt: Date
}

export interface TeamMemberWithDetails extends User { // Extiende User para incluir displayName, photoURL, etc.
  rol: TeamMemberRol;
  teamMemberDocId: string; // El ID del documento en teamMembers, necesario para updates
}

export interface Project {
  id: string
  teamId: string
  name: string
  description?: string
  status: "active" | "archived"
  taskCount?: number
  createdAt: Date
  updatedAt: Date
  urls: ProjectUrl[]
}

export interface ProjectUrl {
  id: string
  label: string 
  link: string
}


export interface Tag {
  id: string
  teamId: string
  tagName: string
  color: string
  createdAt: Date
}

export interface ActivityLog {
  id: string;
  teamId: string; // Sigue siendo obligatorio
  userId: string; // Sigue siendo obligatorio
  taskId?: string; // 👈 Hazlo opcional
  projectId?: string; // 👈 Añade este campo opcional
  action: string;
  details?: Record<string, any>;
  createdAt: Date;
}

export interface TimeLog {
  id: string
  taskId: string
  teamId: string
  userId: string
  startTime: Date
  endTime?: Date
  duration?: number
  createdAt: Date
}
export interface Task {
  id: string
  projectId: string
  teamId: string
  title: string
  description?: string
  status: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  assignedToIds?: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  dueDate?: Date | Timestamp;
  //new archivation fields
  isArchived: boolean;
  archivedAt?: Timestamp;
  archivedBy?: string;
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  createdAt: Date
}
export interface TaskWithDetails extends Task {
  assignedTo?: User[];
  subtasks: Subtask[];
  tags: Tag[];
  archivedByUser?: User;
}