export interface DiagnosticError {
    category: string;
    whatHappened: string;
    whyLikely: string;
    safeNextStep: string;
    hinglishSummary: string;
    logPath?: string;
    canRetry: boolean;
}
export declare class ErrorDiagnostics {
    diagnose(category: string, rawErrorMsg: string): DiagnosticError;
}
