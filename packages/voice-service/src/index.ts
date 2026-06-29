import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';

export interface VoiceServiceSettings {
  voiceEnabled: boolean;
  audioCacheEnabled: boolean;
  language: 'hinglish' | 'hindi' | 'english';
}

export class VoiceService {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;
  
  private settings: VoiceServiceSettings = {
    voiceEnabled: false, // default off as per setting toggles
    audioCacheEnabled: false, // default off
    language: 'hinglish'
  };

  constructor(
    storage: StorageManager,
    database: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storage;
    this.database = database;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  /**
   * Sets active settings configuration
   */
  public setSettings(settings: Partial<VoiceServiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Retrieves active settings configuration
   */
  public getSettings(): VoiceServiceSettings {
    return { ...this.settings };
  }

  /**
   * Resolves the target cache path for a voice synthesis file
   * dynamically located on the external SSD.
   */
  public getAudioCachePath(phraseId: string): string {
    const root = this.storage.getPath('audio_cache');
    return this.path ? this.path.join(root, `${phraseId}.wav`) : `${root}/${phraseId}.wav`;
  }

  /**
   * Simulates/Executes Voice-to-Text Speech Recognition and optionally saves audio log
   */
  public async recordAndTranscribe(simulatedText?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const transcript = simulatedText || (
      this.settings.language === 'hindi' ? "Jarvis, storage status check karo" :
      this.settings.language === 'hinglish' ? "Jarvis, current project ka git status batao" :
      "Jarvis, flutter analyze prepare karo"
    );

    // Save audio cache raw input file if enabled and SSD is mounted
    if (this.settings.audioCacheEnabled && this.storage.isExternalDriveMounted()) {
      try {
        const cachePath = this.getAudioCachePath(`input_${timestamp}`);
        const cacheDir = this.path ? this.path.dirname(cachePath) : '';
        
        if (this.fs) {
          if (cacheDir && !this.fs.existsSync(cacheDir)) {
            this.fs.mkdirSync(cacheDir, { recursive: true });
          }
          this.fs.writeFileSync(cachePath, `MOCK_RAW_AUDIO_INPUT: "${transcript}"`);
        }
      } catch {
        // Silently catch write errors if unmounted or failing
      }
    }

    // Log audio event to SQLite database
    this.database.logStorageEvent('VOICE_INPUT', `Recorded and transcribed input: "${transcript}"`);

    return transcript;
  }

  /**
   * Synthesizes audio using native browser TTS or simulated TTS and optionally caches output
   */
  public async playVoiceMessage(text: string): Promise<boolean> {
    console.log(`TTS synthesis request (${this.settings.language}): "${text}"`);

    // 1. Speak voice response via Web Speech Synthesis if active and supported
    if (this.settings.voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.settings.language === 'hindi') {
          utterance.lang = 'hi-IN';
        } else if (this.settings.language === 'english') {
          utterance.lang = 'en-US';
        } else {
          utterance.lang = 'hi-IN'; // Hinglish mixed language fallback
        }
        
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis interface error:', e);
      }
    }

    // 2. Cache response speech output to SSD if enabled
    if (this.settings.audioCacheEnabled && this.storage.isExternalDriveMounted()) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const cachePath = this.getAudioCachePath(`response_${timestamp}`);
        const cacheDir = this.path ? this.path.dirname(cachePath) : '';
        
        if (this.fs) {
          if (cacheDir && !this.fs.existsSync(cacheDir)) {
            this.fs.mkdirSync(cacheDir, { recursive: true });
          }
          this.fs.writeFileSync(cachePath, `MOCK_RAW_AUDIO_RESPONSE: "${text}"`);
        }
      } catch {
        // Silently skip write errors
      }
    }

    return true;
  }
}
