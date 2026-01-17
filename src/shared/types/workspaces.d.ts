export interface Workspace {
    id: string;
    name: string;
    dbName: string;
    createdAt: string;
    updatedAt?: string;
    icon?: string;
}

export interface CreateWorkspaceOptions {
    icon?: string;
    exportSettings?: boolean;
    getSettings?: () => Promise<any>;
    saveSettings?: (settings: any) => Promise<void>;
}

export interface WorkspaceExportData {
    type: 'multi-workspace-backup';
    version: number;
    timestamp: string;
    workspaces: Array<{
        id: string;
        name: string;
        icon?: string;
        dbName: string;
        data: Record<string, any[]>;
    }>;
}