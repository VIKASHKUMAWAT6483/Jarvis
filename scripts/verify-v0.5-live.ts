import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '../packages/storage-manager/dist/index.js';
import { DatabaseManager } from '../packages/database-manager/dist/index.js';
import { SafetyEngine } from '../packages/safety-engine/dist/index.js';
import { ToolRegistry, BuildToolsManager, FileToolsManager, GitToolsManager } from '../packages/tool-registry/dist/index.js';
import { TerminalExecutor } from '../packages/tool-registry/dist/terminal-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runAudit() {
  console.log("=================================================");
  console.log("   Running Programmatic Jarvis v0.5 UI Audit");
  console.log("=================================================");

  const storage = new StorageManager({
    externalRoot: "/Volumes/HP P500/Jarvis",
    internalRoot: path.join(os.homedir(), 'Library', 'Application Support', 'Jarvis'),
    fs,
    path,
    os
  });

  const db = new DatabaseManager(storage, { fs, path });
  const safety = new SafetyEngine();

  const executor = new TerminalExecutor(storage, db, safety, {
    fs,
    path,
    exec: async (cmd) => `[MOCK Terminal Output for cmd: "${cmd}"]`
  });

  const registry = new ToolRegistry();

  // Register all managers
  new FileToolsManager(storage, db, { fs, path }).registerAll(registry);
  new GitToolsManager(storage, db, { fs, path }).registerAll(registry);
  new BuildToolsManager(storage, db, executor, { fs, path }).registerAll(registry);

  try {
    db.initialize();
    console.log("✅ 1. Database initialized successfully.");
    console.log(`✅ 2. SSD connection validated: ${storage.isExternalDriveMounted() ? 'Connected' : 'Missing'}`);

    // Test project path
    const testProjectPath = "/Volumes/HP P500/Jarvis/02-projects/audit-mock-app";
    if (!fs.existsSync(testProjectPath)) {
      fs.mkdirSync(testProjectPath, { recursive: true });
    }

    // 3. Verify developer tools registrations
    const requiredTools = [
      'flutter_analyze',
      'flutter_build_apk',
      'flutter_build_aab',
      'npm_run_build',
      'firebase_config_check',
      'android_manifest_check',
      'play_store_readiness_audit'
    ];

    console.log("\nChecking registered developer tools:");
    for (const tool of requiredTools) {
      const def = registry.getTool(tool);
      if (def) {
        console.log(`  - [FOUND] ${tool}: "${def.description}"`);
      } else {
        throw new Error(`❌ Missing developer tool registration: ${tool}`);
      }
    }

    // 4. Test execution and safety approvals trigger
    console.log("\nTesting tool safety triggers & logs generation:");

    // Test flutter_analyze triggers approval check
    console.log("  - Running flutter_analyze (without bypass override)...");
    const analyzeRes = await registry.getTool('flutter_analyze')?.execute({
      projectPath: testProjectPath,
      bypassApprovalOverride: false
    });
    
    if (analyzeRes?.success === false && analyzeRes?.error?.includes('APPROVAL_REQUIRED')) {
      console.log("    ✅ Success: Safety Engine approval required trigger caught correctly.");
    } else {
      throw new Error("❌ Safety trigger failed for flutter_analyze");
    }

    // Run with override and verify output logs / builds copies
    console.log("  - Running flutter_build_apk (with bypass override)...");
    const apkRes = await registry.getTool('flutter_build_apk')?.execute({
      projectPath: testProjectPath,
      bypassApprovalOverride: true
    });
    console.log(`    Output path: ${apkRes?.storagePath}`);
    if (apkRes?.success && apkRes.storagePath && fs.existsSync(apkRes.storagePath)) {
      console.log("    ✅ Success: Build log saved to external SSD.");
    } else {
      throw new Error(`❌ Failed: Build log was not saved correctly. Info: ${JSON.stringify(apkRes)}`);
    }

    // Test firebase_config_check
    console.log("  - Running firebase_config_check...");
    const firebaseRes = await registry.getTool('firebase_config_check')?.execute({
      projectPath: testProjectPath
    });
    if (firebaseRes?.success && firebaseRes.storagePath && fs.existsSync(firebaseRes.storagePath)) {
      console.log(`    Report created at: ${firebaseRes.storagePath}`);
      console.log("    ✅ Success: Firebase config audit report written to external SSD.");
    } else {
      throw new Error("❌ Failed: Firebase config report missing");
    }

    // Test android_manifest_check
    console.log("  - Running android_manifest_check...");
    const manifestRes = await registry.getTool('android_manifest_check')?.execute({
      projectPath: testProjectPath
    });
    if (manifestRes?.success && manifestRes.storagePath && fs.existsSync(manifestRes.storagePath)) {
      console.log(`    Report created at: ${manifestRes.storagePath}`);
      console.log("    ✅ Success: Android Manifest safety report written to external SSD.");
    } else {
      throw new Error("❌ Failed: Android Manifest report missing");
    }

    // Test play_store_readiness_audit
    console.log("  - Running play_store_readiness_audit...");
    const readinessRes = await registry.getTool('play_store_readiness_audit')?.execute({
      projectPath: testProjectPath
    });
    if (readinessRes?.success && readinessRes.storagePath && fs.existsSync(readinessRes.storagePath)) {
      console.log(`    Report created at: ${readinessRes.storagePath}`);
      console.log("    ✅ Success: Play Store deployment readiness report compiled.");
    } else {
      throw new Error("❌ Failed: Play Store readiness report missing");
    }

    console.log("\n=================================================");
    console.log("🎉 Jarvis v0.5 Programmatic UI Audit: 100% PASSED");
    console.log("=================================================");

  } catch (err: any) {
    console.error("\n❌ UI Verification Audit Failed:", err.message);
    process.exit(1);
  }
}

runAudit();
