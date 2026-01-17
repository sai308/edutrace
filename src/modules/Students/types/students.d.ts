import type { Mark, Task } from '@Marks/types/marks';
import type { Meet } from '@Analytics/types/analytics';
import type { Group } from '@Groups/types/groups';

export interface Member {
    id: string; // UUID
    name: string;
    groupName: string;
    role: 'student' | 'teacher' | 'assistant';
    email?: string;
    aliases?: string[];
    hidden?: boolean;
    createdAt?: string;
}

export interface StudentFormData {
    name: string;
    email?: string;
    groupName: string;
}

export interface StudentDashboardStats {
    id: string;
    name: string;
    email?: string;
    groupName: string;
    aliases: string[];
    totalDuration: number;
    sessionCount: number;
    groups: Set<string>;
    meetIds: Set<string>;
    attendedDuration: number;
    possibleDuration: number;
    totalSessions: number;
    attendancePercentages: number[];
    marks: Mark[];
    totalTasks: number;
    completedTasks: number;
    averageMark: number;
    completionPercent: number;
    totalAttendancePercent: number;
    averageAttendancePercent: number;
}

export interface ProcessedStudentDashboardStats extends Omit<StudentDashboardStats, 'groups' | 'meetIds'> {
    groups: string[];
    meetIds: string[];
}

export interface StudentDashboardResult {
    students: ProcessedStudentDashboardStats[];
    groupsMap: Record<string, Group>;
    teachers: Set<string>;
    meets: Meet[];
    tasks: Task[];
}
