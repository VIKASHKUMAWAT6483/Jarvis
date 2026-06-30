export interface BriefingParams {
    ssdStatus: boolean;
    projectName: string;
    healthScore: number;
    healthStatus: 'Excellent' | 'Good' | 'Needs Work' | 'Risky';
    gitStatusSummary: string;
    pendingApprovalsCount: number;
    lastFailedCommand: string;
    todayEvents: string[];
    top3Tasks: string[];
    safetyWarnings: string[];
    focusTask: string;
}
export declare class DailyBriefingGenerator {
    generateBriefingContent(params: BriefingParams): string;
}
