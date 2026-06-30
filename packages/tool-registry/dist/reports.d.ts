export type ReportFormat = 'markdown' | 'html' | 'csv' | 'json' | 'pdf_ready_html';
export interface ReportMetadata {
    report_type: string;
    project_name: string;
    timestamp: string;
    tools_used: string[];
    status: 'passed' | 'warning' | 'failed' | 'info';
    findings: string[];
    next_actions: string[];
}
export declare class ReportGenerator {
    /**
     * Helper to mask email addresses
     */
    maskEmail(email: string): string;
    /**
     * Helper to mask phone numbers
     */
    maskPhone(phone: string): string;
    /**
     * Formats report data into the requested report format
     */
    formatReport(meta: ReportMetadata, format: ReportFormat): string;
    /**
     * Applies sensitive filters to redact emails, phone numbers, and secrets
     */
    private applyMaskFilters;
}
