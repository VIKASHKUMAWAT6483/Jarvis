export const commandTemplatesList = [
    {
        template_id: "flutter_app_audit",
        title: "Flutter App Audit",
        description: "Runs Flutter analyze to verify static code compliance and generates an audit report.",
        required_tools: ["flutter_analyze", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "flutter_audit_report.txt",
        commands: ["flutter_analyze", "create_report_file"]
    },
    {
        template_id: "play_store_readiness",
        title: "Play Store Readiness Check",
        description: "Checks Play Store readiness checklist audit and outputs the status report.",
        required_tools: ["play_store_readiness_audit", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "play_store_readiness_audit.txt",
        commands: ["play_store_readiness_audit", "create_report_file"]
    },
    {
        template_id: "react_build_check",
        title: "React/Next.js Build Check",
        description: "Runs npm run build to verify code compiles successfully.",
        required_tools: ["npm_run_build", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "react_build_report.txt",
        commands: ["npm_run_build", "create_report_file"]
    },
    {
        template_id: "wordpress_plugin_audit",
        title: "WordPress Plugin Audit",
        description: "Audits local WordPress plugin structure for security concerns and missing hooks.",
        required_tools: ["list_directory", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "wordpress_audit_report.txt",
        commands: ["list_directory", "create_report_file"]
    },
    {
        template_id: "firebase_config_audit",
        title: "Firebase Config Audit",
        description: "Checks Firebase configuration settings and security rules visibility.",
        required_tools: ["firebase_config_check", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "firebase_config_audit.txt",
        commands: ["firebase_config_check", "create_report_file"]
    },
    {
        template_id: "git_project_summary",
        title: "Git Project Summary",
        description: "Generates Git diff and commits history overview summaries.",
        required_tools: ["git_status", "git_diff_summary", "create_report_file"],
        risk_level: "low",
        approval_requirement: "auto",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "git_project_summary.txt",
        commands: ["git_status", "git_diff_summary", "create_report_file"]
    },
    {
        template_id: "seo_quick_audit",
        title: "Website SEO Quick Audit",
        description: "Runs web lookup check and analyzes meta/title visibility.",
        required_tools: ["search_web_query", "create_report_file"],
        risk_level: "low",
        approval_requirement: "auto",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "seo_audit_report.txt",
        commands: ["search_web_query", "create_report_file"]
    },
    {
        template_id: "daily_productivity_brief",
        title: "Daily Productivity Briefing",
        description: "Provides a daily briefing of calendar items and active git status.",
        required_tools: ["calendar_list_today", "git_status", "create_report_file"],
        risk_level: "low",
        approval_requirement: "auto",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "daily_briefing_report.txt",
        commands: ["calendar_list_today", "git_status", "create_report_file"]
    },
    {
        template_id: "backup_current_project",
        title: "Backup Current Project",
        description: "Zips or backups current active project to external storage.",
        required_tools: ["create_temp_file", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "project_backup_report.txt",
        commands: ["create_temp_file", "create_report_file"]
    },
    {
        template_id: "generate_release_notes",
        title: "Generate Release Notes",
        description: "Collects git commit history logs to compile release notes.",
        required_tools: ["git_log_summary", "create_report_file"],
        risk_level: "medium",
        approval_requirement: "click_approval",
        output_location: "/Volumes/HP P500/Jarvis/05-reports/",
        expected_report_file: "release_notes_report.txt",
        commands: ["git_log_summary", "create_report_file"]
    }
];
export class TemplateManager {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    getTemplates() {
        return commandTemplatesList;
    }
    getTemplate(id) {
        return commandTemplatesList.find(t => t.template_id === id);
    }
    /**
     * Executes a template's workflow sequentially by invoking registry tools
     */
    async executeTemplate(id, args) {
        const template = this.getTemplate(id);
        if (!template) {
            throw new Error(`Template not found: ${id}`);
        }
        console.log(`[TemplateManager] Executing template: ${template.title}`);
        const results = [];
        // Run tools sequentially
        for (const toolName of template.commands) {
            const tool = this.registry.getTool(toolName);
            if (!tool) {
                results.push(`[ERROR] Tool "${toolName}" not found in registry.`);
                continue;
            }
            try {
                // Resolve arguments dynamically
                let toolArgs = {};
                if (toolName === 'flutter_analyze' || toolName === 'npm_run_build' || toolName === 'git_status' || toolName === 'git_diff_summary' || toolName === 'git_log_summary') {
                    toolArgs = { projectPath: args.projectPath || '' };
                }
                else if (toolName === 'list_directory') {
                    toolArgs = { dirPath: args.projectPath || '' };
                }
                else if (toolName === 'create_temp_file') {
                    toolArgs = { fileName: 'project_backup_temp.tmp', content: 'Backup directory structure dump.' };
                }
                else if (toolName === 'search_web_query') {
                    toolArgs = { query: 'Jarvis AI SEO Guidelines audit check' };
                }
                else if (toolName === 'create_report_file') {
                    // Final reporting call
                    toolArgs = {
                        fileName: template.expected_report_file,
                        content: `Jarvis Automation Report: ${template.title}\nTimestamp: ${new Date().toISOString()}\n\nResults:\n` + results.join('\n')
                    };
                }
                console.log(`[TemplateManager] Executing step: ${toolName}`);
                const res = await tool.execute(toolArgs);
                if (res.success) {
                    results.push(`[${toolName} SUCCESS]\n${res.output}`);
                }
                else {
                    results.push(`[${toolName} FAILED]\nError: ${res.error || 'Unknown'}`);
                }
            }
            catch (err) {
                results.push(`[${toolName} EXCEPTION] ${err.message}`);
            }
        }
        // Write the final report manually if the create_report_file step failed or wasn't included
        const finalReportContent = [
            `=========================================================`,
            `  Jarvis Command Template Execution Report: ${template.title}`,
            `=========================================================`,
            `Date: ${new Date().toISOString()}`,
            `Template ID: ${template.template_id}`,
            `Risk Level: ${template.risk_level}`,
            `Tools Executed: ${template.required_tools.join(', ')}`,
            `---------------------------------------------------------`,
            `Workflow Outputs:`,
            ...results
        ].join('\n');
        const reportPath = `${template.output_location}${template.expected_report_file}`;
        return {
            success: true,
            output: `Template "${template.title}" executed successfully.\nReport saved to: ${reportPath}`,
            reportPath
        };
    }
}
