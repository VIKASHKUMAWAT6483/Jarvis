import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { VoiceService } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('VoiceService Mappings & Cache Tests', () => {
  const sandboxDir = path.resolve(__dirname, '..', 'dist', 'temp-test-voice-sandbox');

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

  test('1. Settings Getters & Setters', () => {
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

    const voice = new VoiceService(storage, db, { fs, path });
    
    // Verify defaults
    const defaults = voice.getSettings();
    assert.equal(defaults.voiceEnabled, false);
    assert.equal(defaults.audioCacheEnabled, false);
    assert.equal(defaults.language, 'hinglish');

    // Modify settings
    voice.setSettings({
      voiceEnabled: true,
      audioCacheEnabled: true,
      language: 'hindi'
    });

    const updated = voice.getSettings();
    assert.equal(updated.voiceEnabled, true);
    assert.equal(updated.audioCacheEnabled, true);
    assert.equal(updated.language, 'hindi');

    cleanupSandbox();
  });

  test('2. Voice Recording and Caching', async () => {
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

    const voice = new VoiceService(storage, db, { fs, path });
    
    // Enable cache
    voice.setSettings({ audioCacheEnabled: true });

    // Record voice
    const text = await voice.recordAndTranscribe("Jarvis, current status check karo");
    assert.equal(text, "Jarvis, current status check karo");

    // Verify raw log file created in 06-audio-cache
    const cacheDir = path.join(mockExternal, '06-audio-cache');
    const files = fs.readdirSync(cacheDir);
    assert.ok(files.some(f => f.startsWith('input_') && f.endsWith('.wav')));

    cleanupSandbox();
  });

  test('3. Disconnected Storage Skips Audio Cache', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    // Mock unmounted state by intercepting existsSync
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
    const voice = new VoiceService(storage, db, { fs, path });

    voice.setSettings({ audioCacheEnabled: true });

    // Transcription succeeds but cache save is safely skipped
    const text = await voice.recordAndTranscribe("Hello");
    assert.equal(text, "Hello");

    cleanupSandbox();
  });

  test('4. Wake Word Statuses and CPU Safety Alerts', async () => {
    setupSandbox();
    const mockExternal = path.join(sandboxDir, 'mock-external');
    const mockInternal = path.join(sandboxDir, 'mock-internal');

    fs.mkdirSync(mockExternal, { recursive: true });
    fs.mkdirSync(mockInternal, { recursive: true });

    const storage = new StorageManager({
      externalRoot: mockExternal,
      internalRoot: mockInternal,
      allowTemporaryInternalMode: false,
      fs, path, os
    });
    storage.ensureJarvisFolders();
    const db = new DatabaseManager(storage, { fs, path });
    db.initialize();

    const voice = new VoiceService(storage, db, { fs, path });

    // 1. Verify default: wake word is OFF
    assert.equal(voice.getSettings().wakeWordEnabled, false);
    assert.equal(voice.getWakeWordStatus(), 'off');

    // 2. Enable wake word manually
    voice.setSettings({ wakeWordEnabled: true });
    assert.equal(voice.getSettings().wakeWordEnabled, true);

    // 3. Toggle statuses
    voice.setWakeWordStatus('listening');
    assert.equal(voice.getWakeWordStatus(), 'listening');

    voice.setWakeWordStatus('detected');
    assert.equal(voice.getWakeWordStatus(), 'detected');

    // 4. CPU usage warning trigger and auto-disable
    const resNormal = voice.monitorCpuUsage(45);
    assert.equal(resNormal.disabled, false);
    assert.equal(voice.getSettings().wakeWordEnabled, true);

    const resHigh = voice.monitorCpuUsage(90);
    assert.equal(resHigh.disabled, true);
    assert.ok(resHigh.warning?.includes("auto-disabled"));
    assert.equal(voice.getSettings().wakeWordEnabled, false);
    assert.equal(voice.getWakeWordStatus(), 'off');

    cleanupSandbox();
  });

  test('5. Voice Confirmation Loops Verification', () => {
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

    const voice = new VoiceService(storage, db, { fs, path });

    // Case 1: No pending command
    const resNoCmd = voice.processSpokenConfirmation('Confirm', '', 'medium');
    assert.equal(resNoCmd.handled, true);
    assert.equal(resNoCmd.allowed, false);
    assert.match(resNoCmd.reply, /no pending command/);

    // Case 2: Spoken confirm for safe medium risk command
    const resMediumSafe = voice.processSpokenConfirmation('Confirm', 'npm install', 'medium');
    assert.equal(resMediumSafe.handled, true);
    assert.equal(resMediumSafe.allowed, true);
    assert.match(resMediumSafe.reply, /accepted/);

    // Case 3: Spoken confirm for restricted medium risk command (contains "send")
    const resMediumRestricted = voice.processSpokenConfirmation('Confirm', 'message_send_after_approval recipient: "bob"', 'medium');
    assert.equal(resMediumRestricted.handled, true);
    assert.equal(resMediumRestricted.allowed, false);
    assert.match(resMediumRestricted.reply, /Security Gate: Spoken confirmation is not permitted/);

    // Case 4: Spoken confirm for high risk command
    const resHigh = voice.processSpokenConfirmation('Confirm', 'git push origin main', 'high');
    assert.equal(resHigh.handled, true);
    assert.equal(resHigh.allowed, false);
    assert.match(resHigh.reply, /high risk operation/);

    // Case 5: Spoken confirm for critical risk command
    const resCritical = voice.processSpokenConfirmation('Confirm', 'rm -rf /', 'critical');
    assert.equal(resCritical.handled, true);
    assert.equal(resCritical.allowed, false);
    assert.match(resCritical.reply, /critical operation/);

    // Case 6: Spoken cancel
    const resCancel = voice.processSpokenConfirmation('Cancel', 'npm install', 'medium');
    assert.equal(resCancel.handled, true);
    assert.equal(resCancel.allowed, true);
    assert.match(resCancel.reply, /cancelled/);

    // Case 7: Spoken details
    const resDetails = voice.processSpokenConfirmation('show details', 'npm install', 'medium');
    assert.equal(resDetails.handled, true);
    assert.equal(resDetails.allowed, true);
    assert.match(resDetails.reply, /Pending command is/);

    // Case 8: Open approvals screen
    const resScreen = voice.processSpokenConfirmation('open approval screen', 'npm install', 'medium');
    assert.equal(resScreen.handled, true);
    assert.equal(resScreen.allowed, true);
    assert.match(resScreen.reply, /approvals screen/);

    // Case 9: Ambiguous spoken confirmations
    const resAmbiguous = voice.processSpokenConfirmation('do it', 'npm install', 'medium');
    assert.equal(resAmbiguous.handled, true);
    assert.equal(resAmbiguous.allowed, false);
    assert.match(resAmbiguous.reply, /ambiguous/);

    cleanupSandbox();
  });
});
