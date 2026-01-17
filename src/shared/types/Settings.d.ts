export interface ExamSettings {
    // Add specific properties if known, e.g. passMark?: number;
    [key: string]: any;
}

export interface SettingsMap {
    durationLimit: number;
    defaultTeacher: string | null;
    ignoredUsers: string[];
    teachers: string[];
    examSettings: ExamSettings;
}

type SettingKey = keyof SettingsMap;