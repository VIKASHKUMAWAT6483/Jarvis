import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { ProjectManager } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ProjectManager Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-proj-sandbox');

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

  test('1. Project Type Detection', () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    // Setup mock projects inside mock external SSD
    const flutterProj = path.join(mockExternal, 'flutter-app');
    fs.mkdirSync(flutterProj, { recursive: true });
    fs.writeFileSync(path.join(flutterProj, 'pubspec.yaml'), 'name: my_app');

    const reactProj = path.join(mockExternal, 'react-app');
    fs.mkdirSync(reactProj, { recursive: true });
    fs.writeFileSync(path.join(reactProj, 'package.json'), '{"name": "react"}');

    const firebaseProj = path.join(mockExternal, 'firebase-app');
    fs.mkdirSync(firebaseProj, { recursive: true });
    fs.writeFileSync(path.join(firebaseProj, 'firebase.json'), '{}');

    const wpProj = path.join(mockExternal, 'wp-plugin');
    fs.mkdirSync(wpProj, { recursive: true });
    fs.writeFileSync(path.join(wpProj, 'plugin.php'), '<?php\n/*\nPlugin Name: My Plugin\n*/');

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

    const pm = new ProjectManager(storage, db, { fs, path });

    assert.deepEqual(pm.detectProjectType(flutterProj), ['Flutter']);
    assert.deepEqual(pm.detectProjectType(reactProj), ['React/Node']);
    assert.deepEqual(pm.detectProjectType(firebaseProj), ['Firebase']);
    assert.deepEqual(pm.detectProjectType(wpProj), ['WordPress Plugin']);

    cleanupSandbox();
  });

  test('2. SSD Location Warning Checker', () => {
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
    const pm = new ProjectManager(storage, db, { fs, path });

    // Path inside external SSD root -> isPathInternal should be false
    const externalPath = path.join(mockExternal, 'project-a');
    assert.equal(pm.isPathInternal(externalPath), false, 'Project path inside external SSD should be external');

    // Path inside internal config folder -> isPathInternal should be true
    const internalPath = path.join(mockInternal, 'project-b');
    assert.equal(pm.isPathInternal(internalPath), true, 'Project path inside internal SSD should be internal');

    cleanupSandbox();
  });

  test('3. Register and Select Current Project', () => {
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

    const pm = new ProjectManager(storage, db, { fs, path });

    const projPath = path.join(mockExternal, 'react-app');
    fs.mkdirSync(projPath, { recursive: true });
    fs.writeFileSync(path.join(projPath, 'package.json'), '{}');

    // Add project
    const projId = pm.addProject(projPath, 'React Monorepo');
    assert.match(projId, /^proj_/);

    // Verify it exists in database profiles
    const profiles = db.getProjectProfiles();
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].project_name, 'React Monorepo');

    // Select project
    pm.selectProject(projId);
    assert.equal(pm.getActiveProject()?.id, projId);

    cleanupSandbox();
  });

  test('4. Execute Developer Quick Actions', async () => {
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

    const pm = new ProjectManager(storage, db, { fs, path });

    const projPath = path.join(mockExternal, 'flutter-app');
    fs.mkdirSync(projPath, { recursive: true });
    fs.writeFileSync(path.join(projPath, 'pubspec.yaml'), 'name: app');

    const id = pm.addProject(projPath, 'Flutter Test App');
    pm.selectProject(id);

    // Test vscode open
    const vsLog = await pm.executeQuickAction('vscode');
    assert.match(vsLog, /VS Code opened successfully/);

    // Test git status
    const gitLog = await pm.executeQuickAction('git_status');
    assert.match(gitLog, /On branch main/);

    cleanupSandbox();
  });
});
