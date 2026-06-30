import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { ErrorDiagnostics } from '../packages/tool-registry/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runErrorDiagnosticsSuite() {
  console.log("=========================================================");
  console.log("  Jarvis v1.1 Error Handling & Diagnostics Validation");
  console.log("=========================================================\n");

  const diagnostics = new ErrorDiagnostics();
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // 1. SSD Disconnected Diagnostics
  const diagSSD = diagnostics.diagnose("ssd_disconnected", "Error: Storage HP P500 not mounted.");
  const ssdPass = diagSSD.hinglishSummary.includes("external SSD nahi mila") && diagSSD.canRetry === true;
  checks.push({
    name: "SSD Disconnected Error Diagnosis",
    pass: ssdPass,
    detail: `Hinglish: "${diagSSD.hinglishSummary}". Safe step: "${diagSSD.safeNextStep}"`
  });

  // 2. OpenAI API Key Missing (with secrets safety check)
  const rawSecretMsg = "Failed sk-proj-1234567890abcdef1234567890abcdef. Please check config.";
  const diagKey = diagnostics.diagnose("api_key_missing", rawSecretMsg);
  const secretExposed = diagKey.whatHappened.includes("sk-proj-") || (diagKey as any).whatHappened.includes("1234567890abcdef");
  checks.push({
    name: "Secrets Redaction Safety in Diagnostics",
    pass: !secretExposed,
    detail: `Clean message output contains no raw keys. Masked value: "${diagKey.whatHappened}"`
  });

  // 3. Build Failed Diagnostics
  const diagBuild = diagnostics.diagnose("build_failed", "TypeScript compile error: App.tsx: L10");
  const buildPass = diagBuild.safeNextStep.includes("Check local compile errors") && diagBuild.canRetry === true;
  checks.push({
    name: "Build Failure Error Diagnosis",
    pass: buildPass,
    detail: `Hinglish: "${diagBuild.hinglishSummary}". Next Step: "${diagBuild.safeNextStep}"`
  });

  // 4. Command Timeout Diagnostics
  const diagTimeout = diagnostics.diagnose("command_timeout", "Execution timed out after 30000ms.");
  const timeoutPass = diagTimeout.hinglishSummary.includes("zyada time") && diagTimeout.canRetry === true;
  checks.push({
    name: "Command Timeout Error Diagnosis",
    pass: timeoutPass,
    detail: `Hinglish: "${diagTimeout.hinglishSummary}". Next Step: "${diagTimeout.safeNextStep}"`
  });

  // 5. Permission Denied Diagnostics
  const diagPermission = diagnostics.diagnose("permission_denied", "fs write EACCES /usr/bin");
  const permissionPass = diagPermission.hinglishSummary.includes("Permission nahi") && diagPermission.canRetry === true;
  checks.push({
    name: "Permission Denied Error Diagnosis",
    pass: permissionPass,
    detail: `Hinglish: "${diagPermission.hinglishSummary}". Next Step: "${diagPermission.safeNextStep}"`
  });

  // Results
  const allPass = checks.every(c => c.pass);
  console.log("\n=========================================================");
  console.log("  Diagnostics Verification Results");
  console.log("=========================================================");
  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}`);
    console.log(`     ${c.detail}`);
  }

  // Generate Jarvis-v1.1-ERROR_HANDLING_REPORT.md
  const reportsDir = "/Volumes/HP P500/Jarvis/05-reports";
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportContent = [
    `# Jarvis v1.1 Error Handling & Diagnostics Test Report`,
    ``,
    `**Validation Date**: ${new Date().toISOString()}  `,
    `**Verdict**: ${allPass ? '✅ PASSED — Error Diagnostics engine fully compliant' : '❌ ISSUES DETECTED'}  `,
    ``,
    `## Verification Checks Matrix`,
    `| Metric Check | Status | Verification Detail |`,
    `| :--- | :--- | :--- |`,
    ...checks.map(c => `| **${c.name}** | ${c.pass ? '✅ PASS' : '❌ FAIL'} | ${c.detail} |`),
    ``,
    `## Implemented User-Friendly Hinglish Summary Rules`,
    `- **SSD Disconnected**: \`Jarvis ko external SSD nahi mila. Cable check karein aur wapas connect karein.\``,
    `- **API Key Missing**: \`OpenAI API key nahi mila. Settings me jaakar key add karein.\``,
    `- **Voice Failure**: \`Voice command transcription fail ho gaya. Internet aur key limits check karein.\``,
    `- **Gmail Token Expire**: \`Gmail access token expire ho gaya hai. Wapas authorization refresh karein.\``,
    `- **GitHub Token Expire**: \`GitHub token expire ho gaya. Naya token settings me upload karein.\``,
    `- **Project Folder Missing**: \`Selected project path nahi mila. Workspace list se wapas choose karein.\``,
    `- **Command Timeout**: \`Command run karne me zyada time lag raha hai. Script ko check karein.\``,
    `- **Build Failure**: \`App build fail ho gaya compile errors ki wajah se. Code fix karein.\``,
    `- **Permission Denied**: \`Permission nahi mili file change karne ki. User access levels check karein.\``,
    `- **Report Gen Failure**: \`Report file create nahi ho payi. SSD permissions confirm karein.\``,
  ].join('\n');

  fs.writeFileSync(path.join(reportsDir, 'Jarvis-v1.1-ERROR_HANDLING_REPORT.md'), reportContent);
  console.log(`\nDiagnostics report generated at: ${path.join(reportsDir, 'Jarvis-v1.1-ERROR_HANDLING_REPORT.md')}`);
}

runErrorDiagnosticsSuite();
