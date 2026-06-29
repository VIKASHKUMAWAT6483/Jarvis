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
                existsSync: (p) => {
                    if (p.includes('HP P500') || p.includes('mock-external'))
                        return false;
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
});
