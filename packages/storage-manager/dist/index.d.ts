export type StorageCategory = 'internal_config' | 'secrets' | 'source_code' | 'projects' | 'logs' | 'reports' | 'audio_cache' | 'builds' | 'database_backups' | 'temp_runtime' | 'app_database';
export interface StorageStatus {
    isExternalMounted: boolean;
    externalRoot: string;
    internalRoot: string;
    temporaryInternalModeAllowed: boolean;
    categories: Record<StorageCategory, string>;
}
export interface HealthCheckReport {
    externalRootMounted: boolean;
    externalRootWritable: boolean;
    internalConfigExists: boolean;
    internalConfigWritable: boolean;
    freeSpaceBytesExternal?: number;
    freeSpaceBytesInternal?: number;
}
export interface IFileSystem {
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): void;
    statSync(path: string): {
        isDirectory(): boolean;
    };
    accessSync(path: string, mode?: number): void;
    constants: {
        W_OK: number;
    };
}
export interface IPathResolver {
    resolve(...paths: string[]): string;
    join(...paths: string[]): string;
    dirname(p: string): string;
}
export interface IOsHelper {
    homedir(): string;
}
export declare class StorageManager {
    private externalRootOverride?;
    private internalRootOverride?;
    private temporaryInternalModeAllowed;
    private fs;
    private path;
    private os;
    constructor(options?: {
        externalRoot?: string;
        internalRoot?: string;
        allowTemporaryInternalMode?: boolean;
        fs?: IFileSystem;
        path?: IPathResolver;
        os?: IOsHelper;
    });
    private static createMockFs;
    private static createMockPath;
    /**
     * Returns the expanded path of the external root directory
     */
    getExternalRoot(): string;
    /**
     * Returns the expanded path of the internal config directory
     */
    getInternalConfigRoot(): string;
    /**
     * Checks whether the external SSD or external root directory is mounted
     */
    isExternalDriveMounted(): boolean;
    /**
     * Enables or disables temporary internal storage mode
     */
    setTemporaryInternalMode(allowed: boolean): void;
    /**
     * Returns if temporary internal storage mode is currently allowed
     */
    isTemporaryInternalModeAllowed(): boolean;
    /**
     * Determines if writing to this category on internal storage should be prevented
     */
    preventHeavyInternalWrite(category: StorageCategory): boolean;
    /**
     * Resolves the path for a given storage category
     */
    getPath(category: StorageCategory): string;
    /**
     * Validates if a path is writable
     */
    validateWritablePath(targetPath: string): boolean;
    /**
     * Performs directories initialization for Jarvis
     */
    ensureJarvisFolders(): void;
    /**
     * Performs storage health checks including accessibility and free space
     */
    storageHealthCheck(): HealthCheckReport;
    /**
     * Outputs status explanation for users
     */
    explainStorageStatus(): string;
}
export { SecretsManager } from './secrets.js';
export { BackupManager } from './backup-migration.js';
