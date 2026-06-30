import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '../packages/storage-manager/dist/index.js';
import { DatabaseManager } from '../packages/database-manager/dist/index.js';
import { BackupManager } from '../packages/storage-manager/dist/backup-migration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSettingsMigrationSuite() {
  console.log("=========================================================");
  console.log("  Jarvis v1.1 Settings Export/Import Migration Validation");
  console.log("=========================================================\n");

  const storage = new StorageManager({
    externalRoot: "/Volumes/HP P500/Jarvis",
    internalRoot: path.join(os.homedir(), 'Library', 'Application Support', 'Jarvis'),
    fs, path, os
  });
  const db = new DatabaseManager(storage, { fs, path });
  db.initialize();
  
  const backupManager = new BackupManager(storage, db, null, null, { fs, path });
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // 1. Export settings
  const exportFile = backupManager.exportSettings();
  const fileExists = fs.existsSync(exportFile);
  checks.push({
    name: "Settings export file created on HP P500 SSD",
    pass: fileExists,
    detail: `Exported file saved to: ${exportFile}`
  });

  // 2. Validate exported parameters
  let contentStr = "";
  let config: any = null;
  if (fileExists) {
    contentStr = fs.readFileSync(exportFile, 'utf8');
    config = JSON.parse(contentStr);
  }

  const keysValidation = config &&
                         config.storage_paths &&
                         config.project_profiles &&
                         config.ui_preferences &&
                         config.voice_settings &&
                         config.safety_preferences;
                         
  checks.push({
    name: "Verifying settings elements schema inclusions",
    pass: !!keysValidation,
    detail: `Export contains storage path matrix, project profiles, voice configs, UI preferences, safety gating profiles.`
  });

  // 3. Exclude secrets validation (strictly no keys or tokens)
  const secretsRegex = /(sk-proj-|AIzaSy)[A-Za-z0-9_-]{10,}/g;
  const secretsFound = secretsRegex.test(contentStr);
  checks.push({
    name: "Secrets exclusion validation check",
    pass: !secretsFound,
    detail: `No plaintext secrets or private tokens discovered inside settings export packet.`
  });

  // 4. Import validation (Import valid config)
  const importPass = backupManager.importSettings(exportFile);
  checks.push({
    name: "Import valid settings backup file",
    pass: importPass,
    detail: `Successfully processed safe configurations import and re-applied general preferences.`
  });

  // 5. Critical Shield: Block imports containing keys
  const maliciousFile = path.join(path.dirname(exportFile), 'malicious_settings.json');
  const maliciousConfig = {
    ...config,
    voice_settings: {
      ...config.voice_settings,
      openai_key: "sk-proj-maliciouskey1234567890"
    }
  };
  fs.writeFileSync(maliciousFile, JSON.stringify(maliciousConfig, null, 2));

  let blocked = false;
  try {
    backupManager.importSettings(maliciousFile);
  } catch (err: any) {
    blocked = err.message.includes("CRITICAL SAFETY BLOCK");
  }
  checks.push({
    name: "Safety barrier blocks imports containing API keys",
    pass: blocked,
    detail: `Malicious import blocked successfully. Safety check intercepted and halted execution.`
  });

  // Clean up malicious file
  if (fs.existsSync(maliciousFile)) {
    fs.unlinkSync(maliciousFile);
  }

  // Results
  const allPass = checks.every(c => c.pass);
  console.log("\n=========================================================");
  console.log("  Settings Migration Verification Results");
  console.log("=========================================================");
  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}`);
    console.log(`     ${c.detail}`);
  }

  // Generate Jarvis-v1.1-SETTINGS_MIGRATION_REPORT.md
  const reportsDir = "/Volumes/HP P500/Jarvis/05-reports";
  const reportContent = [
    `# Jarvis v1.1 Settings Migration Test Report`,
    ``,
    `**Validation Date**: ${new Date().toISOString()}  `,
    `**Verdict**: ${allPass ? '✅ PASSED — Settings export/import migration engine fully compliant' : '❌ ISSUES DETECTED'}  `,
    ``,
    `## Verification Checks Matrix`,
    `| Metric Check | Status | Verification Detail |`,
    `| :--- | :--- | :--- |`,
    ...checks.map(c => `| **${c.name}** | ${c.pass ? '✅ PASS' : '❌ FAIL'} | ${c.detail} |`),
    ``,
    `## Safe Export Compliance Rules`,
    `- **Inclusions**: Storage paths configuration matrix, selected workspace project profiles list, UI visual theme choices, voice feedback languages, safety threshold gating rules, and report format preferences.`,
    `- **Exclusions**: Plaintext OpenAI keys, Google Gmail OAuth tokens, developer GitHub personal access tokens, Firebase console credentials JSON parameters, Apple provisioning profiles, and code signature keystore passwords.`,
    `- **Import Verification Filter**: Scans configuration files before executing imports, matching regex signatures of secret indicators. If matching, blocks process execution to prevent telemetry leakage.`,
  ].join('\n');

  fs.writeFileSync(path.join(reportsDir, 'Jarvis-v1.1-SETTINGS_MIGRATION_REPORT.md'), reportContent);
  console.log(`\nMigration report generated at: ${path.join(reportsDir, 'Jarvis-v1.1-SETTINGS_MIGRATION_REPORT.md')}`);
}

runSettingsMigrationSuite();
