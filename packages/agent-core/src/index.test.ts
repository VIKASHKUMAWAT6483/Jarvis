import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { SafetyEngine } from '@jarvis/safety-engine';
import { ToolRegistry, FileToolsManager, GitToolsManager, BuildToolsManager, MultiProjectToolsManager, GithubToolsManager, AppReleaseToolsManager, TerminalExecutor } from '@jarvis/tool-registry';
import { ProjectManager } from '@jarvis/project-manager';
import { AgentCore } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AgentCore Text Assistant Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-agent-sandbox');

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

  test('1. Git Intent Parsing and Execution', async () => {
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

    const tools = new ToolRegistry();
    const gt = new GitToolsManager(storage, db, { fs, path });
    gt.registerAll(tools);

    const agent = new AgentCore(storage, safety, tools);
    const projPath = path.join(mockExternal, '02-projects', 'my-app');
    fs.mkdirSync(projPath, { recursive: true });

    // Ask git status
    const res = await agent.handleUserPrompt('Jarvis, git status batao', {
      activeProjectPath: projPath
    });

    assert.equal(res.toolCalled, 'git_status');
    assert.match(res.reply, /Executed tool "git_status" successfully/);
    assert.match(res.reply, /On branch main/);

    cleanupSandbox();
  });

  test('2. Safety Gate Approval Redirection (Medium Risk)', async () => {
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
      exec: async (cmd) => `Success: ${cmd}`
    });

    const tools = new ToolRegistry();
    const bt = new BuildToolsManager(storage, db, executor, { fs, path });
    bt.registerAll(tools);

    const agent = new AgentCore(storage, safety, tools);
    const projPath = path.join(mockExternal, '02-projects', 'my-app');
    fs.mkdirSync(projPath, { recursive: true });

    // Ask flutter apk build (which requires approval)
    const res = await agent.handleUserPrompt('Jarvis, build apk please', {
      activeProjectPath: projPath
    });

    assert.equal(res.toolCalled, 'flutter_build_apk');
    assert.equal(res.approvalRequired, true);
    assert.equal(res.criticalConfirmRequired, false);
    assert.equal(res.pendingCommand, 'flutter build apk');

    // Re-run with bypass approval override
    const resBypass = await agent.handleUserPrompt('Jarvis, build apk please', {
      activeProjectPath: projPath,
      bypassApprovalOverride: true
    });

    assert.equal(resBypass.toolCalled, 'flutter_build_apk');
    assert.match(resBypass.reply, /Post-build copy completed/);

    cleanupSandbox();
  });

  test('3. SSD Missing Write Block Warns User', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const storage = new StorageManager({
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

    const db = new DatabaseManager(storage, { fs, path });
    const safety = new SafetyEngine();
    const tools = new ToolRegistry();
    
    const ft = new FileToolsManager(storage, db, { fs, path });
    ft.registerAll(tools);

    const agent = new AgentCore(storage, safety, tools);
    const projPath = path.join(mockExternal, '02-projects', 'my-app');

    // Trigger report creation tool (which writes files)
    const res = await agent.handleUserPrompt('Jarvis, create report file please', {
      activeProjectPath: projPath
    });

    assert.match(res.reply, /External SSD is not connected\. Heavy data writes are paused/);
    assert.equal(res.error, 'STORAGE_FAULT: External SSD not connected.');

    cleanupSandbox();
  });

  test('4. Input Plain-Text Secrets Blocked', async () => {
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
    const db = new DatabaseManager(storage, { fs, path });
    const safety = new SafetyEngine();
    const tools = new ToolRegistry();

    const agent = new AgentCore(storage, safety, tools);

    // Prompt contains secret key
    const res = await agent.handleUserPrompt('Jarvis, store this key: AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q');
    assert.match(res.reply, /Access denied/);
    assert.match(res.error || '', /Potential plain-text secret leak/);

    cleanupSandbox();
  });

  test('5. Multi-Project Monitoring Intent Routing', async () => {
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
    const pm = new ProjectManager(storage, db, { fs, path });
    const tools = new ToolRegistry();
    const mpt = new MultiProjectToolsManager(storage, db, pm, { fs, path });
    mpt.registerAll(tools);

    const agent = new AgentCore(storage, safety, tools);

    // Mock project path
    const projPath = path.join(mockExternal, 'proj-watchlist-item');
    fs.mkdirSync(projPath, { recursive: true });

    // Add project first
    await mpt.projectWatchlistAdd(projPath, 'WatchlistProj');

    // Trigger on Hindi voice transcription intent check
    const prompt = 'Jarvis, mere saare projects ka status batao.';
    const res = await agent.handleUserPrompt(prompt, {
      activeProjectPath: projPath
    });

    assert.equal(res.toolCalled, 'project_monitor_status');
    assert.match(res.reply, /Executed tool "project_monitor_status" successfully/);
    assert.match(res.reply, /WatchlistProj/);

    cleanupSandbox();
  });

  test('6. GitHub PR Draft Creation Intent Routing', async () => {
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
    const tools = new ToolRegistry();
    const gh = new GithubToolsManager(storage, db, { fs, path });
    gh.registerAll(tools);

    const agent = new AgentCore(storage, safety, tools);

    // Ask to draft a PR (high risk)
    const prompt = 'Jarvis, current changes ke liye PR draft banao';
    const res = await agent.handleUserPrompt(prompt, {
      activeProjectPath: path.join(mockExternal, 'proj-1')
    });

    assert.equal(res.toolCalled, 'github_create_pr_draft');
    assert.equal(res.approvalRequired, true);
    assert.equal(res.riskLevel, 'high');

    cleanupSandbox();
  });

  test('7. App Store Release Assistant Intent Routing', async () => {
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
    const tools = new ToolRegistry();
    const art = new AppReleaseToolsManager(storage, db, { fs, path });
    art.registerAll(tools);

    const agent = new AgentCore(storage, safety, tools);

    // Ask to generate release report (medium risk, executed directly)
    const prompt = 'Jarvis, release report generate karo';
    const res = await agent.handleUserPrompt(prompt, {
      activeProjectPath: path.join(mockExternal, 'proj-1')
    });

    assert.equal(res.toolCalled, 'app_release_readiness_report');
    assert.match(res.reply, /App Release Readiness Report successfully compiled/);
    assert.equal(res.approvalRequired, undefined);

    cleanupSandbox();
  });
});
