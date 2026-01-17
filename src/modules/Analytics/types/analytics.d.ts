export interface Participant {
    name: string;
    duration: number;
    email?: string;
    joinTime?: string;
}

export interface Meet {
    id: string; // Internal ID (UUID or similar if needed, or meetId if unique)
    meetId: string; // The "Google Meet" ID (e.g. abc-defg-hij)
    date: string; // ISO Date YYYY-MM-DD
    startTime?: string;
    endTime?: string;
    participants: Participant[];
    filename?: string;
    uploadedAt?: string;
    groupName?: string;
}

export interface GlobalStat {
    meetId: string;
    totalSessions: number;
    totalDuration: number;
    totalParticipantAppearances: number;
    lastActive: string;
    uniqueParticipantsCount: number;
    activeParticipantsCount: number;
    avgDuration: number;
    attendancePercentage: number;
    totalPossibleAppearances: number;
    [key: string]: any;
}

export interface DetailedSession {
    date: string;
    participants: Record<string, number>;
    maxDuration: number;
    startTime: string | null;
    endTime: string | null;
    attendees?: number;
}

export interface DetailedMatrixRow {
    name: string;
    totalDuration: number;
    totalPossible: number;
    totalPercentage: number;
    [date: string]: any; // date-specific data
}

export interface DetailedStats {
    dates: string[];
    matrix: DetailedMatrixRow[];
    sessions: Record<string, DetailedSession>;
    reportIds: Record<string, string>;
}

export interface SingleReportStats {
    dates: string[];
    matrix: DetailedMatrixRow[];
    sessions: Record<string, DetailedSession>;
    metadata: {
        filename: string;
        uploadedAt: string;
        startTime: string;
        endTime: string;
        meetId: string;
        date: string;
    };
}
