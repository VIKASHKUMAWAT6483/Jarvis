import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';

export interface VoiceServiceSettings {
  voiceEnabled: boolean;
  audioCacheEnabled: boolean;
  language: 'hinglish' | 'hindi' | 'english';
  autoRetryVoiceOnce: boolean;
  voiceResponseSpeed: 'normal' | 'fast';
  preferredLanguage: 'hinglish' | 'hindi' | 'english';
  // Wake Word Settings
  wakeWordEnabled: boolean;
  wakePhrase: string;
  wakeWordSensitivity: 'low' | 'medium' | 'high';
  autoDisableOnHighCpu: boolean;
}

export class VoiceService {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;
  
  private settings: VoiceServiceSettings = {
    voiceEnabled: false, // default off as per setting toggles
    audioCacheEnabled: false, // default off
    language: 'hinglish',
    autoRetryVoiceOnce: true,
    voiceResponseSpeed: 'normal',
    preferredLanguage: 'hinglish',
    wakeWordEnabled: false, // default OFF as per requirement
    wakePhrase: 'Hey Jarvis',
    wakeWordSensitivity: 'medium',
    autoDisableOnHighCpu: true
  };

  private wakeWordStatus: 'off' | 'listening' | 'detected' = 'off';

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
    if (settings.preferredLanguage) {
      this.settings.language = settings.preferredLanguage;
    }
  }

  /**
   * Retrieves active settings configuration
   */
  public getSettings(): VoiceServiceSettings {
    return { ...this.settings };
  }

  /**
   * Retrieves wake word status
   */
  public getWakeWordStatus(): 'off' | 'listening' | 'detected' {
    return this.settings.wakeWordEnabled ? this.wakeWordStatus : 'off';
  }

  /**
   * Sets wake word status
   */
  public setWakeWordStatus(status: 'off' | 'listening' | 'detected'): void {
    if (this.settings.wakeWordEnabled) {
      this.wakeWordStatus = status;
    } else {
      this.wakeWordStatus = 'off';
    }
  }

  /**
   * Monitor CPU usage. Auto-disables wake word if CPU > 85% and autoDisableOnHighCpu is true
   */
  public monitorCpuUsage(cpuPercent: number): { warning: string | null; disabled: boolean } {
    if (this.settings.wakeWordEnabled && this.settings.autoDisableOnHighCpu && cpuPercent > 85) {
      this.settings.wakeWordEnabled = false;
      this.wakeWordStatus = 'off';
      this.database.logStorageEvent('WAKE_WORD_CPU_ALERT', `Wake word disabled automatically due to CPU spike: ${cpuPercent}%`);
      return {
        warning: `WARNING: CPU usage is at ${cpuPercent}%. Wake word has been auto-disabled to conserve system resources.`,
        disabled: true
      };
    }
    return { warning: null, disabled: false };
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
  public async recordAndTranscribe(options?: string | { simulatedText?: string; forceFailureOnce?: boolean; forceFailureAlways?: boolean }): Promise<string> {
    const opt = typeof options === 'string' ? { simulatedText: options } : options;
    let attempt = 1;
    const maxAttempts = this.settings.autoRetryVoiceOnce ? 2 : 1;

    while (attempt <= maxAttempts) {
      try {
        if (opt?.forceFailureAlways || (opt?.forceFailureOnce && attempt === 1)) {
          const err: any = new Error("TRANSCRIPTION_API_TIMEOUT: Simulated transcription service timeout.");
          err.transcriptionAttempt = opt?.simulatedText || (
            this.settings.preferredLanguage === 'hindi' ? "Jarvis, storage status check karo" :
            this.settings.preferredLanguage === 'hinglish' ? "Jarvis, current project ka git status batao" :
            "Jarvis, flutter analyze prepare karo"
          );
          throw err;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const transcript = opt?.simulatedText || (
          this.settings.preferredLanguage === 'hindi' ? "Jarvis, storage status check karo" :
          this.settings.preferredLanguage === 'hinglish' ? "Jarvis, current project ka git status batao" :
          "Jarvis, flutter analyze prepare karo"
        );

        // Raw audio storage logic (temp file always created, but only permanently saved to HP P500 if audio cache is ON)
        if (this.storage.isExternalDriveMounted()) {
          const tempPath = this.getAudioCachePath(`input_temp_${timestamp}`);
          const finalPath = this.getAudioCachePath(`input_${timestamp}`);
          const cacheDir = this.path ? this.path.dirname(tempPath) : '';
          
          if (this.fs) {
            if (cacheDir && !this.fs.existsSync(cacheDir)) {
              this.fs.mkdirSync(cacheDir, { recursive: true });
            }
            // Create the temp WAV content
            this.fs.writeFileSync(tempPath, `MOCK_RAW_AUDIO_INPUT: "${transcript}"`);
            
            if (this.settings.audioCacheEnabled) {
              // Permanently keep it by renaming
              this.fs.renameSync(tempPath, finalPath);
            } else {
              // Immediately delete temp file (do not permanently store raw audio)
              this.fs.unlinkSync(tempPath);
            }
          }
        }

        this.database.logStorageEvent('VOICE_INPUT', `Recorded and transcribed input: "${transcript}"`);
        return transcript;
      } catch (err: any) {
        if (attempt < maxAttempts) {
          console.warn(`[VoiceService] Transcription attempt ${attempt} failed. Retrying...`);
          attempt++;
          continue;
        }
        throw err;
      }
    }
    throw new Error("UNKNOWN_VOICE_ERROR");
  }

  /**
   * Synthesizes audio using native browser TTS or simulated TTS and optionally caches output
   */
  public async playVoiceMessage(text: string): Promise<boolean> {
    console.log(`TTS synthesis request (${this.settings.preferredLanguage}): "${text}"`);

    // 1. Speak voice response via Web Speech Synthesis if active and supported
    if (this.settings.voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.settings.preferredLanguage === 'hindi') {
          utterance.lang = 'hi-IN';
        } else if (this.settings.preferredLanguage === 'english') {
          utterance.lang = 'en-US';
        } else {
          utterance.lang = 'hi-IN'; // Hinglish mixed language fallback
        }

        utterance.rate = this.settings.voiceResponseSpeed === 'fast' ? 1.5 : 1.0;
        
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

  /**
   * Processes a voice command transcript to determine if it is a confirmation voice action
   */
  public processSpokenConfirmation(
    transcribedText: string,
    pendingCommand: string,
    pendingRiskLevel: 'low' | 'medium' | 'high' | 'critical' | 'blocked'
  ): {
    handled: boolean;
    action: 'confirm' | 'cancel' | 'show_details' | 'open_screen' | 'ambiguous' | 'none';
    allowed: boolean;
    reply: string;
  } {
    const clean = transcribedText.toLowerCase().trim();

    // Check if user input matches a confirmation keyword
    const isConfirm = clean === 'confirm' || clean.includes('confirm') || clean === 'yes' || clean === 'approve';
    const isCancel = clean === 'cancel' || clean.includes('cancel') || clean === 'abort';
    const isDetails = clean === 'show details' || clean.includes('show details') || clean.includes('details');
    const isScreen = clean === 'open approval screen' || clean.includes('approval screen') || clean.includes('open approvals');

    // Ambiguous spoken confirmations (e.g. "do it", "go", "run" without explicit "confirm")
    const isAmbiguous = clean === 'do it' || clean === 'go' || clean === 'run' || clean === 'ok' || clean === 'execute';

    if (!pendingCommand) {
      if (isConfirm || isCancel || isDetails || isScreen || isAmbiguous) {
        return {
          handled: true,
          action: 'none',
          allowed: false,
          reply: 'There is no pending command awaiting confirmation.'
        };
      }
      return { handled: false, action: 'none', allowed: false, reply: '' };
    }

    if (isAmbiguous) {
      return {
        handled: true,
        action: 'ambiguous',
        allowed: false,
        reply: 'Spoken confirmation is ambiguous. Please say "Confirm" to proceed or "Cancel" to abort.'
      };
    }

    if (isConfirm) {
      if (pendingRiskLevel === 'blocked') {
        return {
          handled: true,
          action: 'confirm',
          allowed: false,
          reply: 'This operation is blocked by security policies and cannot be executed.'
        };
      }

      if (pendingRiskLevel === 'critical') {
        return {
          handled: true,
          action: 'confirm',
          allowed: false,
          reply: 'This is a critical operation. Voice confirmation is not allowed. Please type the exact confirmation in the UI modal.'
        };
      }

      if (pendingRiskLevel === 'high') {
        return {
          handled: true,
          action: 'confirm',
          allowed: false,
          reply: 'This is a high risk operation. Voice confirmation is not allowed. Please approve manually using the UI confirmation modal.'
        };
      }

      if (pendingRiskLevel === 'medium') {
        // Rule 6: Send/call/deploy/delete/publish cannot be confirmed by voice alone
        const lowerCmd = pendingCommand.toLowerCase();
        const restricts = ['send', 'call', 'deploy', 'delete', 'publish'];
        const hasRestrict = restricts.some(word => lowerCmd.includes(word));
        
        if (hasRestrict) {
          return {
            handled: true,
            action: 'confirm',
            allowed: false,
            reply: `Security Gate: Spoken confirmation is not permitted for operations containing '${restricts.filter(w => lowerCmd.includes(w)).join(', ')}'. Please approve this action manually using the UI modal.`
          };
        }

        return {
          handled: true,
          action: 'confirm',
          allowed: true,
          reply: 'Spoken confirmation accepted. Executing command.'
        };
      }

      return {
        handled: true,
        action: 'confirm',
        allowed: true,
        reply: 'Command confirmed.'
      };
    }

    if (isCancel) {
      return {
        handled: true,
        action: 'cancel',
        allowed: true,
        reply: 'Operation cancelled successfully.'
      };
    }

    if (isDetails) {
      return {
        handled: true,
        action: 'show_details',
        allowed: true,
        reply: `Pending command is: "${pendingCommand}". Risk Level is: ${pendingRiskLevel}.`
      };
    }

    if (isScreen) {
      return {
        handled: true,
        action: 'open_screen',
        allowed: true,
        reply: 'Opening security approvals screen.'
      };
    }

    return { handled: false, action: 'none', allowed: false, reply: '' };
  }
}
