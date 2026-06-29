import { StorageManager } from '@jarvis/storage-manager';
export interface CommandRecord {
    id: string;
    timestamp: number;
    user_input: string;
    detected_intent: string;
    tool_name: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical' | 'blocked';
    status: 'success' | 'failed' | 'blocked' | 'pending';
    summary: string;
}
export interface ApprovalRecord {
    id: string;
    command_id: string;
    risk_level: 'low' | 'medium' | 'high' | 'critical' | 'blocked';
    approval_status: 'approved' | 'rejected' | 'pending';
    approved_at: number;
}
export interface StorageEventRecord {
    id: string;
    timestamp: number;
    event_type: string;
    message: string;
}
export interface ProjectProfileRecord {
    id: string;
    project_name: string;
    project_path: string;
    project_type: string;
    created_at: number;
    updated_at: number;
}
export interface DatabaseSchema {
    commands: CommandRecord[];
    approvals: ApprovalRecord[];
    storage_events: StorageEventRecord[];
    project_profiles: ProjectProfileRecord[];
}
export declare class DatabaseManager {
    private storage;
    private isConnected;
    private fs;
    private path;
    constructor(storageManager: StorageManager, options?: {
        fs?: any;
        path?: any;
    });
    /**
     * Initializes the audit database.
     * If external SSD is missing, fails and pauses logging.
     */
    initialize(): void;
    /**
     * Returns path to the database file on the external SSD
     */
    getDatabaseFilePath(): string;
    /**
     * Returns if the database is active and connected
     */
    isReady(): boolean;
    /**
     * Safely reads the schema data from the database file
     */
    private readDatabase;
    /**
     * Writes the schema data back to the database file
     */
    private writeDatabase;
    /**
     * Inserts a record into the commands table
     */
    logCommand(record: Omit<CommandRecord, 'id' | 'timestamp'>): string;
    /**
     * Inserts a record into the approvals table
     */
    logApproval(record: Omit<ApprovalRecord, 'id' | 'approved_at'>): string;
    /**
     * Inserts a record into the storage_events table
     */
    logStorageEvent(eventType: string, message: string): string;
    /**
     * Inserts a record into the project_profiles table
     */
    logProjectProfile(name: string, projectPath: string, type: string): string;
    /**
     * Retrieves all command audit logs
     */
    getCommands(): CommandRecord[];
    /**
     * Retrieves all approvals
     */
    getApprovals(): ApprovalRecord[];
    /**
     * Retrieves all storage events
     */
    getStorageEvents(): StorageEventRecord[];
    /**
     * Retrieves all project profiles
     */
    getProjectProfiles(): ProjectProfileRecord[];
    /**
     * Backs up the SQLite database to the dedicated backups directory
     */
    backupDatabase(): string;
}
