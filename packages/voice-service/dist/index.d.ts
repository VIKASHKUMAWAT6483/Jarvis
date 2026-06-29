import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
export interface VoiceServiceSettings {
    voiceEnabled: boolean;
    audioCacheEnabled: boolean;
    language: 'hinglish' | 'hindi' | 'english';
}
export declare class VoiceService {
    private storage;
    private database;
    private fs;
    private path;
    private settings;
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
     * Resolves the target cache path for a voice synthesis file
     * dynamically located on the external SSD.
     */
    getAudioCachePath(phraseId: string): string;
    /**
     * Simulates/Executes Voice-to-Text Speech Recognition and optionally saves audio log
     */
    recordAndTranscribe(simulatedText?: string): Promise<string>;
    /**
     * Synthesizes audio using native browser TTS or simulated TTS and optionally caches output
     */
    playVoiceMessage(text: string): Promise<boolean>;
}
