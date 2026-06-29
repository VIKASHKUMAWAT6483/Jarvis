import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager, SecretsManager, BackupManager } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('StorageManager Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-sandbox');

  // Setup sandbox directory before running tests
  const setupSandbox = () => {
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }
    fs.mkdirSync(sandboxDir, { recursive: true });
  };

  // Cleanup sandbox
  const cleanupSandbox = () => {
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    }
  };

  test('1. Path Resolution - External SSD Mounted Case', () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });

    assert.equal(manager.isExternalDriveMounted(), true, 'External drive should be detected as mounted');
    assert.equal(manager.getPath('internal_config'), mockInternal);
    assert.equal(manager.getPath('logs'), path.join(mockExternal, '03-logs'));
    assert.equal(manager.getPath('projects'), path.join(mockExternal, '02-projects'));

    cleanupSandbox();
  });

  test('2. Path Resolution - External SSD Missing (Default Mode)', () => {
    setupSandbox();
    const mockExternal = '/Volumes/NonExistentDrive/Jarvis';
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockInternal, { recursive: true });

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });

    assert.equal(manager.isExternalDriveMounted(), false, 'External drive should be missing');
    assert.equal(manager.getPath('internal_config'), mockInternal, 'Internal config should still resolve');

    // Heavy writes should throw error when SSD is not mounted
    assert.throws(() => {
      manager.getPath('logs');
    }, /STORAGE ERROR: External SSD is not mounted/);

    cleanupSandbox();
  });

  test('3. Block Heavy Internal Writes', () => {
    setupSandbox();
    const mockExternal = '/Volumes/NonExistentDrive/Jarvis';
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockInternal, { recursive: true });

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs,
      path,
      os
    });

    // Check heavy write blocking status
    assert.equal(manager.preventHeavyInternalWrite('internal_config'), false, 'Internal config write should never be blocked');
    assert.equal(manager.preventHeavyInternalWrite('logs'), true, 'Logs should be blocked when drive is missing');
    assert.equal(manager.preventHeavyInternalWrite('projects'), true, 'Projects should be blocked when drive is missing');
    assert.equal(manager.preventHeavyInternalWrite('secrets'), true, 'Secrets should always be blocked from disk');

    // Switch temporary mode on
    manager.setTemporaryInternalMode(true);
    assert.equal(manager.preventHeavyInternalWrite('logs'), false, 'Logs should not be blocked in temporary internal mode');
    assert.equal(manager.preventHeavyInternalWrite('projects'), false, 'Projects should not be blocked in temporary internal mode');

    cleanupSandbox();
  });

  test('4. Folder Creation and Fallback Logic', () => {
    setupSandbox();
    const mockExternal = '/Volumes/NonExistentDrive/Jarvis';
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: true, // allows fallback folders
      fs,
      path,
      os
    });

    // Run creation check under temporary fallback mode
    manager.ensureJarvisFolders();

    assert.equal(fs.existsSync(mockInternal), true, 'Internal root folder should exist');
    assert.equal(fs.existsSync(path.join(mockInternal, 'temp_fallback', '03-logs')), true, 'Fallback logs folder should be created');

    cleanupSandbox();
  });

  test('5. Path Resolution - Fallback Mode Resolve Paths', () => {
    setupSandbox();
    const mockExternal = '/Volumes/NonExistentDrive/Jarvis';
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockInternal, { recursive: true });

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: true, // allow fallback resolve
      fs,
      path,
      os
    });

    // Resolve heavy directories - should return path inside the fallback folder without throwing
    const logsPath = manager.getPath('logs');
    assert.equal(logsPath, path.join(mockInternal, 'temp_fallback', '03-logs'));

    cleanupSandbox();
  });

  test('6. Secrets Encryption & Storage', () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      fs,
      path,
      os
    });

    const secrets = new SecretsManager(manager, { fs, path });

    // Set a secret
    secrets.setSecret('OPENAI_API_KEY', 'sk-proj-testkey12345');

    // Retrieve secret
    const val = secrets.getSecret('OPENAI_API_KEY');
    assert.equal(val, 'sk-proj-testkey12345');

    // Check that the saved file is encrypted (should not contain plaintext 'sk-proj-testkey12345')
    const encFilePath = path.join(mockInternal, 'secrets.enc');
    assert.ok(fs.existsSync(encFilePath));
    const content = fs.readFileSync(encFilePath, 'utf8');
    assert.ok(!content.includes('sk-proj-testkey12345'), 'Saved file must be encrypted');

    // Delete secret
    secrets.deleteSecret('OPENAI_API_KEY');
    assert.equal(secrets.getSecret('OPENAI_API_KEY'), null);

    cleanupSandbox();
  });

  test('7. Automated Backups & System Migration', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const manager = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      fs,
      path,
      os
    });
    manager.ensureJarvisFolders();

    // Mock managers dependencies
    const mockDbManager = {
      getDatabaseFilePath: () => path.join(mockExternal, 'runtime', 'data', 'jarvis.sqlite'),
      initialize: () => {},
      getProjectProfiles: () => [{ id: 'p1', project_name: 'test' }],
      getCommands: () => [{ id: 'c1', user_input: 'pwd' }],
      logStorageEvent: () => {}
    };

    // Create database file stub
    const dbPath = mockDbManager.getDatabaseFilePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, 'SQLITE_RAW_MOCK_DATA', 'utf8');

    const backup = new BackupManager(manager, mockDbManager, null, null, { fs, path });

    // Run secure backup
    const backupDir = await backup.executeBackup();
    assert.ok(fs.existsSync(backupDir));

    // Verify backup folder elements (database, configurations, policies, tools list)
    assert.ok(fs.existsSync(path.join(backupDir, 'jarvis.sqlite')));
    assert.ok(fs.existsSync(path.join(backupDir, 'project_profiles.json')));
    assert.ok(fs.existsSync(path.join(backupDir, 'settings-export.json')));
    assert.ok(fs.existsSync(path.join(backupDir, 'tool-registry-config.json')));
    assert.ok(fs.existsSync(path.join(backupDir, 'storage-policy-snapshot.json')));
    assert.ok(fs.existsSync(path.join(backupDir, 'logs-index.json')));

    // Run restore
    const restoreResult = await backup.restoreFromBackup(backupDir);
    assert.equal(restoreResult, true);

    cleanupSandbox();
  });
});
