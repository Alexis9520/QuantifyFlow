import { User, Team, TaskWithDetails, ActivityLog, TimeLog, Project, Task } from './index';

export interface UserDashboardData {
  user: User;
  teams: Team[];
  assignedTasks: TaskWithDetails[];
  activityLogs: ActivityLog[];
  timeLogs: TimeLog[];
}
// Interface to combine TeamMember data with full User details
export interface TeamMemberWithDetails extends User {
  role: 'admin' | 'member';
  joinedAt?: Date;
}

// The main data structure for the Admin Dashboard
export interface AdminDashboardData {
  team: Team;
  members: TeamMemberWithDetails[];
  projects: Project[];
  tasks: Task[];
  recentActivity: ActivityLog[];
  adminAssignedTasks: TaskWithDetails[];
}