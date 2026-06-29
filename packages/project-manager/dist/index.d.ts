import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager, ProjectProfileRecord } from '@jarvis/database-manager';
export declare class ProjectManager {
    private storage;
    private database;
    private activeProjectId;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    /**
     * Scans a project path to determine its development ecosystem types
     */
    detectProjectType(projectPath: string): string[];
    /**
     * Determines if a project path lies on the internal SSD instead of the recommended external SSD
     */
    isPathInternal(projectPath: string): boolean;
    /**
     * Registers a project folder path in Jarvis
     */
    addProject(projectPath: string, name?: string): string;
    /**
     * Sets a project as the current active project
     */
    selectProject(projectId: string): void;
    /**
     * Returns the current active project profile details
     */
    getActiveProject(): ProjectProfileRecord | null;
    /**
     * Triggers developer quick actions for the active project
     */
    executeQuickAction(action: 'cursor' | 'vscode' | 'finder' | 'git_status'): Promise<string>;
}
