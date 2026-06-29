import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { SafetyEngine } from '@jarvis/safety-engine';
import { ToolRegistry, FileToolsManager, GitToolsManager, BuildToolsManager, TerminalExecutor } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ToolRegistry FileTools Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-tools-sandbox');

  const setupSandbox = () => {
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }
    fs.mkdirSync(sandboxDir, { recursive: true });
  };

  const cleanupSandbox = () => {
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }
  };

  test('1. Tool Registration and Inventory', () => {
    const storage = new StorageManager({
      externalRoot: 'mock',
      internalRoot: 'mock',
      allowTemporaryInternalMode: false
    });
    const db = new DatabaseManager(storage);
    const registry = new ToolRegistry();
    const ft = new FileToolsManager(storage, db);
    const gt = new GitToolsManager(storage, db);

    ft.registerAll(registry);
    gt.registerAll(registry);

    const toolNames = registry.listTools().map(t => t.name);
    assert.ok(toolNames.includes('list_directory'));
    assert.ok(toolNames.includes('search_file'));
    assert.ok(toolNames.includes('read_file'));
    assert.ok(toolNames.includes('open_folder'));
    assert.ok(toolNames.includes('open_file'));
    assert.ok(toolNames.includes('create_report_file'));
    assert.ok(toolNames.includes('create_temp_file'));
    assert.ok(toolNames.includes('git_status'));
    assert.ok(toolNames.includes('git_branch'));
    assert.ok(toolNames.includes('git_diff_summary'));
    assert.ok(toolNames.includes('git_last_commit'));
    assert.ok(toolNames.includes('git_log_summary'));
  });

  test('2. list_directory & search_file Execution', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    // Create directories inside mock projects root
    const projDir = path.join(mockExternal, 'my-project');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, 'index.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(projDir, 'README.md'), '# Hello');

    const storage = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });
    storage.ensureJarvisFolders();

    const db = new DatabaseManager(storage, { fs, path });
    db.initialize();

    const ft = new FileToolsManager(storage, db, { fs, path });

    // List directory
    const listRes = await ft.listDirectory(projDir);
    assert.equal(listRes.success, true);
    assert.match(listRes.output, /index\.js/);
    assert.match(listRes.output, /README\.md/);

    // Search file
    const searchRes = await ft.searchFile(projDir, '\\.js$');
    assert.equal(searchRes.success, true);
    assert.match(searchRes.output, /index\.js/);

    cleanupSandbox();
  });

  test('3. read_file Security Filters', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const storage = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });
    storage.ensureJarvisFolders();

    const db = new DatabaseManager(storage, { fs, path });
    db.initialize();

    const ft = new FileToolsManager(storage, db, { fs, path });

    // Create normal and sensitive files
    const readmeFile = path.join(mockExternal, 'README.md');
    fs.writeFileSync(readmeFile, '# Info docs');

    const envFile = path.join(mockExternal, '.env');
    fs.writeFileSync(envFile, 'API_KEY=supersecretkey');

    const pemFile = path.join(mockExternal, 'private.key');
    fs.writeFileSync(pemFile, '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----');

    // 1. Read normal file -> succeeds
    const readmeRes = await ft.readFile(readmeFile);
    assert.equal(readmeRes.success, true);
    assert.equal(readmeRes.output, '# Info docs');

    // 2. Read sensitive .env file without confirmation override -> fails
    const envBlockedRes = await ft.readFile(envFile);
    assert.equal(envBlockedRes.success, false);
    assert.match(envBlockedRes.error || '', /SECURITY BLOCK/);

    // 3. Read sensitive key file without confirmation override -> fails
    const pemBlockedRes = await ft.readFile(pemFile);
    assert.equal(pemBlockedRes.success, false);
    assert.match(pemBlockedRes.error || '', /SECURITY BLOCK/);

    // 4. Read sensitive .env file WITH confirmation override -> succeeds
    const envAllowedRes = await ft.readFile(envFile, true);
    assert.equal(envAllowedRes.success, true);
    assert.match(envAllowedRes.output, /API_KEY=supersecretkey/);

    cleanupSandbox();
  });

  test('4. SSD-Aware Writer Blocks (create_report_file & create_temp_file)', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    // Case A: External SSD connected
    const storageConnected = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });
    storageConnected.ensureJarvisFolders();

    const dbConnected = new DatabaseManager(storageConnected, { fs, path });
    dbConnected.initialize();

    const ftConnected = new FileToolsManager(storageConnected, dbConnected, { fs, path });

    const reportRes = await ftConnected.createReportFile('test_report.txt', 'Summary report details');
    assert.equal(reportRes.success, true);
    assert.equal(fs.existsSync(path.join(mockExternal, '05-reports', 'test_report.txt')), true);

    const tempRes = await ftConnected.createTempFile('temp_file.tmp', 'cache chunk');
    assert.equal(tempRes.success, true);
    assert.equal(fs.existsSync(path.join(mockExternal, 'runtime', 'temp', 'temp_file.tmp')), true);

    // Case B: External SSD disconnected -> create file operations blocked
    const storageDisconnected = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs: {
        ...fs,
        // Override existsSync to simulate unmounted drive volumes
        existsSync: (p: string) => {
          if (p.includes('HP P500')) return false;
          return fs.existsSync(p);
        }
      },
      path,
      os
    });

    const dbDisconnected = new DatabaseManager(storageDisconnected, { fs, path });
    // Database initialize fails since external is unmounted, but we mock the disconnected state check
    const ftDisconnected = new FileToolsManager(storageDisconnected, dbDisconnected, { fs, path });

    const reportBlocked = await ftDisconnected.createReportFile('failed_report.txt', 'Blocked content');
    assert.equal(reportBlocked.success, false);
    assert.match(reportBlocked.error || '', /External SSD is not mounted/);

    const tempBlocked = await ftDisconnected.createTempFile('failed_temp.tmp', 'Blocked temp content');
    assert.equal(tempBlocked.success, false);
    assert.match(tempBlocked.error || '', /External SSD is not mounted/);

    cleanupSandbox();
  });

  test('5. Git Read-Only Tools', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const storage = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });
    storage.ensureJarvisFolders();

    const db = new DatabaseManager(storage, { fs, path });
    db.initialize();

    const gt = new GitToolsManager(storage, db, { fs, path });

    const projPath = path.join(mockExternal, '02-projects', 'my-proj');
    fs.mkdirSync(projPath, { recursive: true });

    // 1. Check Git Status
    const statusRes = await gt.gitStatus(projPath);
    assert.equal(statusRes.success, true);
    assert.match(statusRes.output, /On branch main/);
    assert.ok(statusRes.storagePath);
    assert.equal(fs.existsSync(statusRes.storagePath!), true);

    // 2. Check Git Branch
    const branchRes = await gt.gitBranch(projPath);
    assert.equal(branchRes.success, true);
    assert.match(branchRes.output, /feature\/storage-manager/);

    // 3. Check Git Diff Summary
    const diffRes = await gt.gitDiffSummary(projPath);
    assert.equal(diffRes.success, true);
    assert.match(diffRes.output, /2 files changed/);

    // 4. Verify commands are logged to SQLite audit db
    const commands = db.getCommands();
    assert.ok(commands.length >= 3);
    assert.equal(commands[0].tool_name, 'git_status');
    assert.equal(commands[1].tool_name, 'git_branch');
    assert.equal(commands[2].tool_name, 'git_diff_summary');

    cleanupSandbox();
  });

  test('6. Developer Build Tools', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const storage = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });
    storage.ensureJarvisFolders();

    const db = new DatabaseManager(storage, { fs, path });
    db.initialize();

    const safety = new SafetyEngine();
    const executor = new TerminalExecutor(storage, db, safety, {
      fs,
      path,
      exec: async (cmd) => `Compiler finished running: ${cmd}`
    });

    const bt = new BuildToolsManager(storage, db, executor, { fs, path });
    
    const registry = new ToolRegistry();
    bt.registerAll(registry);

    const projPath = path.join(mockExternal, '02-projects', 'my-app');
    fs.mkdirSync(projPath, { recursive: true });

    assert.ok(registry.getTool('flutter_analyze'));
    assert.ok(registry.getTool('flutter_build_apk'));
    assert.ok(registry.getTool('flutter_build_aab'));
    assert.ok(registry.getTool('npm_run_build'));

    const apkRes = await bt.runBuildTool('flutter_build_apk', 'flutter build apk', projPath, true);
    assert.equal(apkRes.success, true);
    assert.match(apkRes.output, /Post-build copy completed/);
    assert.ok(apkRes.storagePath);
    assert.equal(fs.existsSync(apkRes.storagePath!), true);

    const buildsDir = path.join(mockExternal, '04-builds');
    const files = fs.readdirSync(buildsDir);
    assert.ok(files.some(f => f.startsWith('app-release-') && f.endsWith('.apk')));

    // Verify new v0.5 developer tools exist
    assert.ok(registry.getTool('firebase_config_check'));
    assert.ok(registry.getTool('android_manifest_check'));
    assert.ok(registry.getTool('play_store_readiness_audit'));

    // Test firebase_config_check
    const firebaseRes = await bt.firebaseConfigCheck(projPath);
    assert.equal(firebaseRes.success, true);
    assert.match(firebaseRes.output, /Firebase Configuration Safety Audit/);
    assert.equal(fs.existsSync(firebaseRes.storagePath!), true);

    // Test android_manifest_check
    const manifestRes = await bt.androidManifestCheck(projPath);
    assert.equal(manifestRes.success, true);
    assert.match(manifestRes.output, /Android Manifest Configuration Safety Audit/);
    assert.equal(fs.existsSync(manifestRes.storagePath!), true);

    // Test play_store_readiness_audit
    const readinessRes = await bt.playStoreReadinessAudit(projPath);
    assert.equal(readinessRes.success, true);
    assert.match(readinessRes.output, /READY FOR PLAY STORE PRODUCTION DEPLOYMENT/);
    assert.equal(fs.existsSync(readinessRes.storagePath!), true);

    const storageDisconnected = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs: {
        ...fs,
        existsSync: (p: string) => {
          if (p.includes('HP P500') || p.includes('mock-external')) return false;
          return fs.existsSync(p);
        }
      },
      path,
      os
    });

    const btDisconnected = new BuildToolsManager(storageDisconnected, db, executor, { fs, path });
    const blockedRes = await btDisconnected.runBuildTool('flutter_build_apk', 'flutter build apk', projPath, true);
    assert.equal(blockedRes.success, false);
    assert.match(blockedRes.error || '', /Building is blocked/);

    const blockedFirebase = await btDisconnected.firebaseConfigCheck(projPath);
    assert.equal(blockedFirebase.success, false);
    assert.match(blockedFirebase.error || '', /External SSD is not mounted/);

    const blockedManifest = await btDisconnected.androidManifestCheck(projPath);
    assert.equal(blockedManifest.success, false);
    assert.match(blockedManifest.error || '', /External SSD is not mounted/);

    const blockedReadiness = await btDisconnected.playStoreReadinessAudit(projPath);
    assert.equal(blockedReadiness.success, false);
    assert.match(blockedReadiness.error || '', /External SSD is not mounted/);

    cleanupSandbox();
  });
});
