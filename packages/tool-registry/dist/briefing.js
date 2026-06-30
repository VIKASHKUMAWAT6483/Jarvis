export class DailyBriefingGenerator {
    generateBriefingContent(params) {
        const todayStr = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return [
            `# 🛡️ Jarvis Daily Briefing — ${todayStr}`,
            ``,
            `## 🖥️ System & Project Telemetry Status`,
            `- **External SSD status**: ${params.ssdStatus ? '✅ Connected (HP P500 SSD)' : '❌ Disconnected'}`,
            `- **Current project**: ${params.projectName || 'None'}`,
            `- **Project health score**: ${params.healthScore}/100 [${params.healthStatus}]`,
            `- **Git status summary**: ${params.gitStatusSummary}`,
            `- **Pending safety approvals**: ${params.pendingApprovalsCount} pending authorization request(s)`,
            `- **Last failed command**: ${params.lastFailedCommand || 'None (All clean)'}`,
            ``,
            `## 📅 Today's Calendar & Reminders`,
            ...params.todayEvents.map(e => ` - ${e}`),
            params.todayEvents.length === 0 ? ` - No calendar events or reminders scheduled for today.` : ``,
            ``,
            `## ⚠️ Safety Warnings & Security Gate Alerts`,
            ...params.safetyWarnings.map(w => ` - 🚫 ${w}`),
            params.safetyWarnings.length === 0 ? ` - All security barriers normal. Safety gate standing by.` : ``,
            ``,
            `## 🎯 Actionable Focus & Priorities`,
            `* **Suggested focus task**: **${params.focusTask}**`,
            `* **Top 3 Suggested Tasks**:`,
            ...params.top3Tasks.map((t, idx) => `   ${idx + 1}. ${t}`),
            params.top3Tasks.length === 0 ? `   - No priority tasks designated for today.` : ``,
            ``,
            `---`,
            `*Briefing generated successfully on request. Standing by for instructions.*`
        ].join('\n');
    }
}
