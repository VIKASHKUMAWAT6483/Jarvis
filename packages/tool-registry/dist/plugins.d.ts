import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { ToolRegistry, ToolResult } from './index.js';
export interface PluginDefinition {
    plugin_id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    required_permissions: ('terminal' | 'storage' | 'secrets' | 'network')[];
    tools: string[];
    risk_level: 'low' | 'medium' | 'high';
    storage_access: 'none' | 'read' | 'write';
    enabled: boolean;
}
export interface PluginLog {
    timestamp: number;
    plugin_id: string;
    event: string;
    level: 'info' | 'warn' | 'error';
}
export declare class PluginManager {
    private storage;
    private database;
    private registry;
    private fs;
    private path;
    private plugins;
    private logs;
    constructor(storageManager: StorageManager, databaseManager: DatabaseManager, registry: ToolRegistry, options?: {
        fs?: any;
        path?: any;
    });
    private initializeDefaultPlugins;
    registerPlugin(plugin: PluginDefinition): void;
    private registerAllPluginTools;
    getPlugins(): PluginDefinition[];
    getPlugin(pluginId: string): PluginDefinition | undefined;
    setEnabled(pluginId: string, enabled: boolean): void;
    log(pluginId: string, event: string, level?: 'info' | 'warn' | 'error'): void;
    getLogs(pluginId?: string): PluginLog[];
    runHealthCheck(pluginId: string): {
        healthy: boolean;
        status: 'Healthy' | 'Degraded' | 'Risky';
        issues: string[];
    };
    executePluginTool(pluginId: string, toolName: string, executeFn: () => Promise<ToolResult>): Promise<ToolResult>;
    private seoMetaAudit;
    private seoLinkCheck;
    private wpHeaderCheck;
    private wpHooksAudit;
}
