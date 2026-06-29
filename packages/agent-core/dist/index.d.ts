import { AgentMessage } from '@jarvis/shared-types';
import { StorageManager } from '@jarvis/storage-manager';
import { SafetyEngine, RiskLevel } from '@jarvis/safety-engine';
import { ToolRegistry } from '@jarvis/tool-registry';
export { TerminalExecutor } from '@jarvis/tool-registry';
export type { CommandExecutionResult } from '@jarvis/tool-registry';
export interface AgentResponse {
    reply: string;
    toolCalled?: string;
    toolResult?: any;
    error?: string;
    approvalRequired?: boolean;
    criticalConfirmRequired?: boolean;
    pendingCommand?: string;
    riskLevel?: RiskLevel;
    explanation?: string;
}
export declare class AgentCore {
    private storage;
    private safety;
    private tools;
    private conversationHistory;
    constructor(storage: StorageManager, safety: SafetyEngine, tools: ToolRegistry);
    /**
     * Intent classification semantic parser maps text keywords to registries tools
     */
    private detectIntentAndTool;
    /**
     * Processes a new user request in the text assistant cycle, checks safety, and delegates tool calls
     */
    handleUserPrompt(prompt: string, options?: {
        activeProjectPath?: string;
        bypassApprovalOverride?: boolean;
    }): Promise<AgentResponse>;
    getHistory(): AgentMessage[];
}
