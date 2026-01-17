export interface Task {
    id: string;
    name: string;
    groupName: string;
    groupId?: string | number;
    maxPoints: number;
    description?: string;
    date?: string;
}

export interface Mark {
    id?: string | number;
    taskId: string;
    studentId: string;
    score?: number;
    value: string | number;
    maxPoints?: number;
    synced?: boolean;
    syncedAt?: string | null;
    createdAt: string;
    updatedAt?: string;
    groupName: string;
}

export interface SaveMarkResult {
    id: string | number;
    isNew: boolean;
    updated: boolean;
    skipped?: boolean;
}

export interface BulkSaveStats {
    added: number;
    updated: number;
    skipped: number;
}

export interface FlatMark {
    id: string | number;
    studentName: string;
    groupName: string;
    taskName: string;
    taskDate: string;
    maxPoints?: number;
    score?: number;
    synced?: boolean;
    createdAt: string;
}

export interface MarksProcessingStats {
    newMarksCount: number;
    skippedMarksCount: number;
    updatedMarksCount: number;
}

export interface ParsedMark {
    taskIndex: number;
    score?: number;
    synced?: boolean;
}

export interface ParsedStudentData {
    student: Member; // Using Member instead of any
    marks: ParsedMark[];
}

export interface ParsedTask {
    name: string;
    date?: string;
    maxPoints?: number;
    description?: string;
}

export interface MarksParsedData {
    groupName: string;
    tasks: ParsedTask[];
    studentsData: ParsedStudentData[];
}

export interface ReconciliationResult {
    students: Member[]; // Member[]
    tasks: Task[];
    marks: Mark[];
}
