import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { TerminalExecutor } from './terminal-executor.js';
export * from './terminal-executor.js';
export * from './templates.js';
export * from './reports.js';
export * from './briefing.js';
export * from './errors.js';
export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
    storagePath?: string;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (args: Record<string, any>) => Promise<ToolResult>;
}
export declare class ToolRegistry {
    private tools;
    registerTool(tool: ToolDefinition): void;
    getTool(name: string): ToolDefinition | undefined;
    listTools(): Omit<ToolDefinition, 'execute'>[];
}
export declare class FileToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    private cleanLogPath;
    registerAll(registry: ToolRegistry): void;
    listDirectory(dirPath: string): Promise<ToolResult>;
    searchFile(basePath: string, pattern: string): Promise<ToolResult>;
    readFile(filePath: string, requiresConfirmationOverride?: boolean): Promise<ToolResult>;
    openFolder(folderPath: string): Promise<ToolResult>;
    openFile(filePath: string): Promise<ToolResult>;
    createReportFile(fileName: string, content: string): Promise<ToolResult>;
    createTempFile(fileName: string, content: string): Promise<ToolResult>;
}
export declare class GitToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    private writeGitRawLog;
    gitStatus(projectPath: string): Promise<ToolResult>;
    gitBranch(projectPath: string): Promise<ToolResult>;
    gitDiffSummary(projectPath: string): Promise<ToolResult>;
    gitLastCommit(projectPath: string): Promise<ToolResult>;
    gitLogSummary(projectPath: string): Promise<ToolResult>;
}
export declare class BuildToolsManager {
    private storage;
    private database;
    private executor;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, terminalExecutor: TerminalExecutor, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    firebaseConfigCheck(projectPath: string): Promise<ToolResult>;
    androidManifestCheck(projectPath: string): Promise<ToolResult>;
    playStoreReadinessAudit(projectPath: string): Promise<ToolResult>;
    /**
     * Helper to write build logs to the external SSD builds directory
     */
    private writeBuildRawLog;
    /**
     * Recursive directory copy helper
     */
    private copyDirSync;
    /**
     * Orchestrates the compiler executions, raw logs generation, and exports copy steps
     */
    runBuildTool(toolName: string, command: string, projectPath: string, bypassApprovalOverride?: boolean): Promise<ToolResult>;
}
export declare class GmailToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    gmailCreateDraft(recipient: string, subject: string, body: string): Promise<ToolResult>;
}
export declare class CalendarToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    calendarCreateEvent(title: string, date: string, attendees?: string): Promise<ToolResult>;
    calendarListToday(): Promise<ToolResult>;
    reminderCreate(message: string, time: string): Promise<ToolResult>;
}
export declare class MessageCallToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    messageCreateDraft(recipient: string, message: string): Promise<ToolResult>;
    callPrepare(recipient: string): Promise<ToolResult>;
    contactLookupPlaceholder(name: string): Promise<ToolResult>;
}
export declare class BrowserToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    openUrl(url: string): Promise<ToolResult>;
    searchWebQuery(query: string): Promise<ToolResult>;
    openProjectDashboard(): Promise<ToolResult>;
    openGooglePlayConsole(): Promise<ToolResult>;
    openFirebaseConsole(): Promise<ToolResult>;
    openGithubRepo(): Promise<ToolResult>;
}
export declare class GithubToolsManager {
    private storage;
    private database;
    private fs;
    private path;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    registerAll(registry: ToolRegistry): void;
    githubRepoStatus(): Promise<ToolResult>;
    githubListIssues(): Promise<ToolResult>;
    githubCreateIssueDraft(title: string, body: string): Promise<ToolResult>;
    githubPrSummary(): Promise<ToolResult>;
}
