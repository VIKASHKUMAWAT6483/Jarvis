import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { SafetyEngine, RiskLevel } from '@jarvis/safety-engine';
export interface CommandExecutionResult {
    success: boolean;
    output: string;
    error?: string;
    riskLevel: RiskLevel;
    logPath?: string;
}
export declare class TerminalExecutor {
    private storage;
    private database;
    private safety;
    private fs;
    private path;
    private customExec;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, safetyEngine: SafetyEngine, options?: {
        fs?: any;
        path?: any;
        exec?: (cmd: string, cwd: string, timeoutMs: number) => Promise<string>;
    });
    /**
     * Helper to write command logs to the external SSD
     */
    private writeTerminalLog;
    /**
     * Safe command execution wrapper with strict safety checking, confirmation gates, and redaction logging
     */
    executeCommand(command: string, projectPath: string, options?: {
        bypassApprovalOverride?: boolean;
        timeoutMs?: number;
    }): Promise<CommandExecutionResult>;
}
