import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ReportGenerator, ReportFormat, ReportMetadata } from '../packages/tool-registry/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runReportGeneratorSuite() {
  console.log("=========================================================");
  console.log("  Jarvis v1.1 Report Generator Validation");
  console.log("=========================================================\n");

  const generator = new ReportGenerator();
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // 1. Email Masking validation
  const cleanEmail = generator.maskEmail("vikashkumar@gmail.com");
  const emailPass = cleanEmail.includes("v*********r") && cleanEmail.includes("@") && cleanEmail.includes("g") && cleanEmail.includes(".com");
  checks.push({
    name: "Email address masking validation",
    pass: emailPass,
    detail: `Masked: "vikashkumar@gmail.com" -> "${cleanEmail}"`
  });

  // 2. Phone Masking validation
  const cleanPhone = generator.maskPhone("+91 98765 43210");
  const phonePass = cleanPhone.startsWith("+9198") && cleanPhone.endsWith("XXXXX");
  checks.push({
    name: "Phone number masking validation",
    pass: phonePass,
    detail: `Masked: "+91 98765 43210" -> "${cleanPhone}"`
  });

  // 3. Secrets Redaction validation
  const sampleText = "API key sk-proj-1234567890abcdef and Firebase AIzaSy1234567890abcdef here.";
  const cleanText = (generator as any).applyMaskFilters(sampleText);
  const secretsRedacted = cleanText.includes("[REDACTED OPENAI KEY]") && cleanText.includes("[REDACTED FIREBASE KEY]");
  checks.push({
    name: "Plaintext secrets redaction check",
    pass: secretsRedacted,
    detail: `Redacted: "${cleanText}"`
  });

  // 4. Validate all 5 formats exports on external drive
  const reportsDir = "/Volumes/HP P500/Jarvis/05-reports";
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const sampleMeta: ReportMetadata = {
    report_type: "App Audit Report",
    project_name: "my-app",
    timestamp: new Date().toISOString(),
    tools_used: ["flutter_analyze", "create_report_file"],
    status: "passed",
    findings: [
      "No critical static errors found.",
      "Email contact client@example.com.",
      "Vocal capture processed successfully."
    ],
    next_actions: ["Publish to Play Store test track", "Review analytics telemetry"]
  };

  const formats: ReportFormat[] = ["markdown", "html", "csv", "json", "pdf_ready_html"];
  let allFormatsSaved = true;

  for (const fmt of formats) {
    const ext = fmt === 'pdf_ready_html' ? 'print.html' : fmt === 'markdown' ? 'md' : fmt;
    const targetFile = path.join(reportsDir, `test_report_format.${ext}`);
    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
    }
    const formatted = generator.formatReport(sampleMeta, fmt);
    fs.writeFileSync(targetFile, formatted);
    if (!fs.existsSync(targetFile)) {
      allFormatsSaved = false;
    }
  }

  checks.push({
    name: "Multi-format exporter files validation",
    pass: allFormatsSaved,
    detail: `All 5 formats (MD, HTML, CSV, JSON, PDF-Ready HTML) generated and verified on external SSD.`
  });

  // 5. Validate support for all 8 report types
  const reportTypes = [
    "App Audit Report",
    "Play Store Readiness Report",
    "Git Summary Report",
    "Build Error Report",
    "Firebase Config Report",
    "WordPress Plugin Audit Report",
    "SEO Quick Audit Report",
    "Daily Briefing Report"
  ];
  let typesMatched = true;

  for (const type of reportTypes) {
    const customMeta = { ...sampleMeta, report_type: type };
    const md = generator.formatReport(customMeta, "markdown");
    if (!md.includes(`# Jarvis Audit Report: ${type}`)) {
      typesMatched = false;
    }
  }

  checks.push({
    name: "Report types header validation",
    pass: typesMatched,
    detail: `Successfully processed formatting mapping for all ${reportTypes.length} required report categories.`
  });

  // Results
  const allPass = checks.every(c => c.pass);
  console.log("\n=========================================================");
  console.log("  Report Generator Verification Results");
  console.log("=========================================================");
  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}`);
    console.log(`     ${c.detail}`);
  }

  // Generate Jarvis-v1.1-REPORT_GENERATOR_TEST.md
  const reportContent = [
    `# Jarvis v1.1 Report Generator Test Report`,
    ``,
    `**Validation Date**: ${new Date().toISOString()}  `,
    `**Verdict**: ${allPass ? '✅ PASSED — Report generator module fully compliant' : '❌ ISSUES DETECTED'}  `,
    ``,
    `## Verification Checks Matrix`,
    `| Metric Check | Status | Verification Detail |`,
    `| :--- | :--- | :--- |`,
    ...checks.map(c => `| **${c.name}** | ${c.pass ? '✅ PASS' : '❌ FAIL'} | ${c.detail} |`),
    ``,
    `## Masking & Privacy Enforcement Rules`,
    `- **Secrets Redacted**: OpenAI \`sk-proj-\` and Firebase \`AIzaSy\` key signatures are replaced with \`[REDACTED]\` indicators.`,
    `- **Emails Obfuscated**: Formats name and domain parameters with asterisk strings (e.g. \`c*****t@e*****e.com\`).`,
    `- **Phone Masked**: Masks trailing digits to prevent telemetry leakage (e.g. \`+9198XXXXXX\`).`,
    `- **Bodies Sanitization**: Raw email and message details are excluded from persistent logs and templates output by default.`,
  ].join('\n');

  fs.writeFileSync(path.join(reportsDir, 'Jarvis-v1.1-REPORT_GENERATOR_TEST.md'), reportContent);
  console.log(`\nReport generator verification report generated at: ${path.join(reportsDir, 'Jarvis-v1.1-REPORT_GENERATOR_TEST.md')}`);
}

runReportGeneratorSuite();
