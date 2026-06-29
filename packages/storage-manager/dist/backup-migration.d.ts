import { StorageManager } from './index.js';
export interface BackupMetadata {
    timestamp: number;
    version: string;
    storagePolicy: {
        externalRoot: string;
        internalRoot: string;
        temporaryInternalModeAllowed: boolean;
    };
}
export declare class BackupManager {
    private storage;
    private dbManager;
    private projectManager;
    private voiceService;
    private fs;
    private path;
    constructor(storage: StorageManager, dbManager: any, projectManager: any, voiceService: any, options?: {
        fs?: any;
        path?: any;
    });
    /**
     * Resolves the main backups root directory path
     */
    getBackupsRootPath(): string;
    /**
     * Executes a complete secure system backup
     * Excludes all secret parameters, local env keys, or raw private communications.
     */
    executeBackup(): Promise<string>;
    /**
     * Restores system configurations and SQLite database from backup package
     */
    restoreFromBackup(backupFolder: string): Promise<boolean>;
}
