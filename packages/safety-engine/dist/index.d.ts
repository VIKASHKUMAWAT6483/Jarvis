export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'blocked';
export interface SafetyReport {
    isBlocked: boolean;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    requiresTypedConfirmation: boolean;
    explanation: string;
}
export declare class SafetyEngine {
    private blockedPatterns;
    private criticalPatterns;
    private highPatterns;
    private mediumPatterns;
    private lowPatterns;
    private secretRegexes;
    /**
     * Helper checking if the command is blocked
     */
    isBlocked(command: string): boolean;
    /**
     * Classifies the command into a RiskLevel
     */
    classifyCommand(command: string): RiskLevel;
    /**
     * Checks if the risk level requires user approval to execute
     */
    requiresApproval(risk: RiskLevel): boolean;
    /**
     * Checks if the risk level requires explicit typed confirmation (e.g. critical items)
     */
    requiresTypedConfirmation(risk: RiskLevel): boolean;
    /**
     * Explains the risk classification in detail
     */
    explainRisk(command: string): string;
    /**
     * Redacts sensitive secret hashes or credentials from output logs
     */
    sanitizeOutput(output: string): string;
    /**
     * Scans a string for plain-text secrets like API keys or private keys
     */
    scanForSecrets(input: string): boolean;
    /**
     * Returns a complete safety profile report for a command
     */
    analyzeCommand(command: string): SafetyReport;
}
