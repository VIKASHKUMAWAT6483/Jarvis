import { ToolRegistry } from './index.js';
export interface CommandTemplate {
    template_id: string;
    title: string;
    description: string;
    required_tools: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    approval_requirement: 'auto' | 'click_approval' | 'typed_confirmation';
    output_location: string;
    expected_report_file: string;
    commands: string[];
}
export declare const commandTemplatesList: CommandTemplate[];
export declare class TemplateManager {
    private registry;
    constructor(registry: ToolRegistry);
    getTemplates(): CommandTemplate[];
    getTemplate(id: string): CommandTemplate | undefined;
    /**
     * Executes a template's workflow sequentially by invoking registry tools
     */
    executeTemplate(id: string, args: Record<string, any>): Promise<{
        success: boolean;
        output: string;
        reportPath?: string;
    }>;
}
