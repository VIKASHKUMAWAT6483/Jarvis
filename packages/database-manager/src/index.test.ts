import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DatabaseManager Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-db-sandbox');

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

  test('1. Database Initialization - Mounted Case', () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    // 1. Initialize StorageManager
    const storage = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });

    storage.ensureJarvisFolders();

    // 2. Initialize DatabaseManager
    const db = new DatabaseManager(storage, { fs, path });
    db.initialize();

    assert.equal(db.isReady(), true, 'Database should be online and ready');

    // 3. Verify internal config pointer exists
    const pointerPath = path.join(mockInternal, 'db_config.json');
    assert.equal(fs.existsSync(pointerPath), true, 'Internal config pointer db_config.json must exist');
    const pointerData = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
    assert.equal(pointerData.database_path, db.getDatabaseFilePath());

    // 4. Verify external database file exists
    assert.equal(fs.existsSync(db.getDatabaseFilePath()), true, 'Database file must exist on external SSD');

    cleanupSandbox();
  });

  test('2. Database Initialization - Missing External SSD Case', () => {
    setupSandbox();
    const mockExternal = '/Volumes/NonExistentDrive/Jarvis';
    const mockInternal = path.join(sandboxDir, 'mock-internal');

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

    assert.throws(() => {
      db.initialize();
    }, /CRITICAL DATABASE FAULT: External SSD is not mounted/);

    assert.equal(db.isReady(), false, 'Database should remain offline');

    cleanupSandbox();
  });

  test('3. Logging Audits and Events', () => {
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

    // Log Command
    const cmdId = db.logCommand({
      user_input: 'clean builds',
      detected_intent: 'CLEAN_PROJECT',
      tool_name: 'terminal',
      risk_level: 'medium',
      status: 'pending',
      summary: 'Clean build files'
    });
    assert.match(cmdId, /^cmd_/);

    // Log Approval
    const apprId = db.logApproval({
      command_id: cmdId,
      risk_level: 'medium',
      approval_status: 'approved'
    });
    assert.match(apprId, /^appr_/);

    // Log Storage Event
    const seId = db.logStorageEvent('FILE_WRITE', 'Logs written to HP P500');
    assert.match(seId, /^se_/);

    // Log Project Profile
    const projId = db.logProjectProfile('Main app', '/Volumes/HP P500/Jarvis', 'desktop');
    assert.match(projId, /^proj_/);

    // Read and verify records
    const commands = db.getCommands();
    assert.equal(commands.length, 1);
    assert.equal(commands[0].id, cmdId);
    assert.equal(commands[0].user_input, 'clean builds');

    const approvals = db.getApprovals();
    assert.equal(approvals.length, 1);
    assert.equal(approvals[0].command_id, cmdId);

    const storageEvents = db.getStorageEvents();
    // 2 events: DATABASE_INIT logged in initialize() + manually logged event
    assert.equal(storageEvents.length, 2);
    assert.equal(storageEvents[1].id, seId);

    const projects = db.getProjectProfiles();
    assert.equal(projects.length, 1);
    assert.equal(projects[0].project_name, 'Main app');

    cleanupSandbox();
  });

  test('4. Database Backup', () => {
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

    // Create a dummy record
    db.logCommand({
      user_input: 'git pull',
      detected_intent: 'SYNC_REPOSITORIES',
      tool_name: 'git',
      risk_level: 'low',
      status: 'success',
      summary: 'Sync repo changes'
    });

    // Run backup
    const backupPath = db.backupDatabase();
    assert.equal(fs.existsSync(backupPath), true, 'Backup SQLite file must be created on disk');
    
    // Read the backup and check if records exist
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    assert.equal(backupData.commands.length, 1, 'Backup must retain database records');

    cleanupSandbox();
  });
});
