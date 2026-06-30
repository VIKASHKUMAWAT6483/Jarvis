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

export class ReportGenerator {
  /**
   * Helper to mask email addresses
   */
  public maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] : name[0] + '*';
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].length > 2 ? domainParts[0][0] + '*'.repeat(domainParts[0].length - 2) + domainParts[0][domainParts[0].length - 1] : domainParts[0][0] + '*';
    return `${maskedName}@${maskedDomain}.${domainParts.slice(1).join('.')}`;
  }

  /**
   * Helper to mask phone numbers
   */
  public maskPhone(phone: string): string {
    const clean = phone.replace(/[\s-()]/g, '');
    if (clean.length < 5) return phone;
    // Mask all but first 5 chars
    return clean.substring(0, 5) + 'X'.repeat(Math.max(5, clean.length - 5));
  }

  /**
   * Formats report data into the requested report format
   */
  public formatReport(meta: ReportMetadata, format: ReportFormat): string {
    // Apply default mask filters
    const maskedFindings = meta.findings.map(f => this.applyMaskFilters(f));
    const maskedNextActions = meta.next_actions.map(a => this.applyMaskFilters(a));

    switch (format) {
      case 'json':
        return JSON.stringify({ ...meta, findings: maskedFindings, next_actions: maskedNextActions }, null, 2);
      
      case 'csv':
        return [
          `Report Type,Project Name,Timestamp,Tools Used,Status`,
          `"${meta.report_type}","${meta.project_name}","${meta.timestamp}","${meta.tools_used.join('; ')}","${meta.status}"`,
          ``,
          `Findings`,
          ...maskedFindings.map(f => `"${f.replace(/"/g, '""')}"`),
          ``,
          `Next Actions`,
          ...maskedNextActions.map(a => `"${a.replace(/"/g, '""')}"`)
        ].join('\n');

      case 'html':
      case 'pdf_ready_html':
        const isPdf = format === 'pdf_ready_html';
        return [
          `<!DOCTYPE html>`,
          `<html>`,
          `<head>`,
          `  <title>Jarvis Audit Report: ${meta.report_type}</title>`,
          `  <style>`,
          `    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }`,
          `    h1 { color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }`,
          `    .meta-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 0.9rem; }`,
          `    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 0.8rem; }`,
          `    .status-passed { background: #d1fae5; color: #065f46; }`,
          `    .status-warning { background: #fef3c7; color: #92400e; }`,
          `    .status-failed { background: #fee2e2; color: #991b1b; }`,
          `    .status-info { background: #dbeafe; color: #1e40af; }`,
          `    ul { padding-left: 20px; }`,
          isPdf ? `    @media print { body { margin: 0; padding: 20px; } .meta-box { border: 1px solid #ccc; } }` : ``,
          `  </style>`,
          `</head>`,
          `<body>`,
          `  <h1>🛡️ Jarvis Report: ${meta.report_type}</h1>`,
          `  <div class="meta-box">`,
          `    <strong>Project:</strong> ${meta.project_name}<br/>`,
          `    <strong>Date:</strong> ${meta.timestamp}<br/>`,
          `    <strong>Tools:</strong> ${meta.tools_used.join(', ')}<br/>`,
          `    <strong>Status:</strong> <span class="status-badge status-${meta.status}">${meta.status}</span>`,
          `  </div>`,
          `  <h2>Findings &amp; Telemetry Diagnostics</h2>`,
          `  <ul>`,
          ...maskedFindings.map(f => `    <li>${f}</li>`),
          `  </ul>`,
          `  <h2>Next Mitigation Actions</h2>`,
          `  <ul>`,
          ...maskedNextActions.map(a => `    <li>${a}</li>`),
          `  </ul>`,
          `</body>`,
          `</html>`
        ].join('\n');

      case 'markdown':
      default:
        return [
          `# Jarvis Audit Report: ${meta.report_type}`,
          ``,
          `* **Project**: ${meta.project_name}`,
          `* **Timestamp**: ${meta.timestamp}`,
          `* **Tools Used**: ${meta.tools_used.map(t => `\`${t}\``).join(', ')}`,
          `* **Status**: \`${meta.status.toUpperCase()}\``,
          ``,
          `## Findings & Telemetry Diagnostics`,
          ...maskedFindings.map(f => `- ${f}`),
          ``,
          `## Next Mitigation Actions`,
          ...maskedNextActions.map(a => `- ${a}`)
        ].join('\n');
    }
  }

  /**
   * Applies sensitive filters to redact emails, phone numbers, and secrets
   */
  private applyMaskFilters(text: string): string {
    let result = text;
    
    // Mask emails (e.g. client@example.com)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    result = result.replace(emailRegex, (match) => this.maskEmail(match));

    // Mask phone numbers (e.g. +91 98765 43210 or 9876543210)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    result = result.replace(phoneRegex, (match) => this.maskPhone(match));

    // Redact typical secret keys patterns
    result = result.replace(/sk-proj-[A-Za-z0-9_-]{10,}/g, "[REDACTED OPENAI KEY]");
    result = result.replace(/AIzaSy[A-Za-z0-9_-]{10,}/g, "[REDACTED FIREBASE KEY]");
    result = result.replace(/client_secret\s*[:=]\s*\S+/g, "client_secret = [REDACTED]");

    return result;
  }
}
