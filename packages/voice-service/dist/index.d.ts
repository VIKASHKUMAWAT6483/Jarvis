import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
export interface VoiceServiceSettings {
    voiceEnabled: boolean;
    audioCacheEnabled: boolean;
    language: 'hinglish' | 'hindi' | 'english';
    autoRetryVoiceOnce: boolean;
    voiceResponseSpeed: 'normal' | 'fast';
    preferredLanguage: 'hinglish' | 'hindi' | 'english';
    wakeWordEnabled: boolean;
    wakePhrase: string;
    wakeWordSensitivity: 'low' | 'medium' | 'high';
    autoDisableOnHighCpu: boolean;
}
export declare class VoiceService {
    private storage;
    private database;
    private fs;
    private path;
    private settings;
    private wakeWordStatus;
    constructor(storage: StorageManager, database: DatabaseManager, options?: {
        fs?: any;
        path?: any;
    });
    /**
     * Sets active settings configuration
     */
    setSettings(settings: Partial<VoiceServiceSettings>): void;
    /**
     * Retrieves active settings configuration
     */
    getSettings(): VoiceServiceSettings;
    /**
     * Retrieves wake word status
     */
    getWakeWordStatus(): 'off' | 'listening' | 'detected';
    /**
     * Sets wake word status
     */
    setWakeWordStatus(status: 'off' | 'listening' | 'detected'): void;
    /**
     * Monitor CPU usage. Auto-disables wake word if CPU > 85% and autoDisableOnHighCpu is true
     */
    monitorCpuUsage(cpuPercent: number): {
        warning: string | null;
        disabled: boolean;
    };
    /**
     * Resolves the target cache path for a voice synthesis file
     * dynamically located on the external SSD.
     */
    getAudioCachePath(phraseId: string): string;
    /**
     * Simulates/Executes Voice-to-Text Speech Recognition and optionally saves audio log
     */
    recordAndTranscribe(options?: string | {
        simulatedText?: string;
        forceFailureOnce?: boolean;
        forceFailureAlways?: boolean;
    }): Promise<string>;
    /**
     * Synthesizes audio using native browser TTS or simulated TTS and optionally caches output
     */
    playVoiceMessage(text: string): Promise<boolean>;
    /**
     * Processes a voice command transcript to determine if it is a confirmation voice action
     */
    processSpokenConfirmation(transcribedText: string, pendingCommand: string, pendingRiskLevel: 'low' | 'medium' | 'high' | 'critical' | 'blocked'): {
        handled: boolean;
        action: 'confirm' | 'cancel' | 'show_details' | 'open_screen' | 'ambiguous' | 'none';
        allowed: boolean;
        reply: string;
    };
}
