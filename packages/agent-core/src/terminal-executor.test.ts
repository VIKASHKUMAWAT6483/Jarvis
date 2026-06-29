import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { SafetyEngine } from '@jarvis/safety-engine';
import { TerminalExecutor } from '@jarvis/tool-registry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TerminalExecutor Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-executor-sandbox');

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

  test('1. Low Risk Command Execution (Direct)', async () => {
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

    // Inject custom executor to mock shell run
    const executor = new TerminalExecutor(storage, db, safety, {
      fs,
      path,
      exec: async (cmd) => `Mock success output for: ${cmd}`
    });

    const projPath = path.join(mockExternal, '02-projects', 'app');
    fs.mkdirSync(projPath, { recursive: true });

    // Execute low risk
    const res = await executor.executeCommand('git status', projPath);
    assert.equal(res.success, true);
    assert.match(res.output, /Mock success output for: git status/);
    assert.ok(res.logPath); // Log path exists on external SSD
    assert.equal(fs.existsSync(res.logPath!), true);

    cleanupSandbox();
  });

  test('2. Medium / High Risk Gate Blocks', async () => {
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
      exec: async () => 'Success'
    });

    const projPath = path.join(mockExternal, '02-projects', 'app');
    fs.mkdirSync(projPath, { recursive: true });

    // Medium risk command requires approval -> blocked by default without bypass
    const npmRes = await executor.executeCommand('npm install', projPath);
    assert.equal(npmRes.success, false);
    assert.match(npmRes.error || '', /APPROVAL_REQUIRED/);

    // High risk command requires approval -> blocked by default without bypass
    const commitRes = await executor.executeCommand('git commit -m "feat"', projPath);
    assert.equal(commitRes.success, false);
    assert.match(commitRes.error || '', /APPROVAL_REQUIRED/);

    // Bypassing approval override works
    const commitBypassRes = await executor.executeCommand('git commit -m "feat"', projPath, {
      bypassApprovalOverride: true
    });
    assert.equal(commitBypassRes.success, true);

    cleanupSandbox();
  });

  test('3. Critical Command Typed Confirmation Block', async () => {
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
      exec: async () => 'Deleted file'
    });

    const projPath = path.join(mockExternal, '02-projects', 'app');
    fs.mkdirSync(projPath, { recursive: true });

    // Critical command delete requires typed confirmation -> fails without bypass
    const rmRes = await executor.executeCommand('rm old_log.txt', projPath);
    assert.equal(rmRes.success, false);
    assert.match(rmRes.error || '', /TYPED_CONFIRMATION_REQUIRED/);

    // Runs successfully with bypass confirmation override
    const rmConfirmRes = await executor.executeCommand('rm old_log.txt', projPath, {
      bypassApprovalOverride: true
    });
    assert.equal(rmConfirmRes.success, true);

    cleanupSandbox();
  });

  test('4. Blocked Commands Gate and Output Redactions', async () => {
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
      exec: async () => 'Output containing key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q'
    });

    const projPath = path.join(mockExternal, '02-projects', 'app');
    fs.mkdirSync(projPath, { recursive: true });

    // 1. Blocked commands fail even with bypass override
    const blockRes = await executor.executeCommand('rm -rf /', projPath, {
      bypassApprovalOverride: true
    });
    assert.equal(blockRes.success, false);
    assert.match(blockRes.error || '', /EXECUTION BLOCKED/);

    // 2. Exposing API keys throws safety block
    const catEnvRes = await executor.executeCommand('cat .env', projPath);
    assert.equal(catEnvRes.success, false);
    assert.match(catEnvRes.error || '', /EXECUTION BLOCKED/);

    // 3. Command execution outputs redact secrets successfully
    const redactRes = await executor.executeCommand('git status', projPath);
    assert.equal(redactRes.success, true);
    assert.match(redactRes.output, /\[REDACTED_GEMINI_API_KEY\]/);

    cleanupSandbox();
  });
});
