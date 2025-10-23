import { Timestamp } from "firebase/firestore"


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
  id: string
  taskId: string
  teamId: string
  userId: string
  action: string
  details?: Record<string, any>
  createdAt: Date
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
  assignedToId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  dueDate?: Date | Timestamp;
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  createdAt: Date
}
export interface TaskWithDetails extends Task {
  assignedTo?: User;
  subtasks: Subtask[];
  tags: Tag[];
}