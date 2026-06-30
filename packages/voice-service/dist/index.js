export class VoiceService {
    storage;
    database;
    fs;
    path;
    settings = {
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
    wakeWordStatus = 'off';
    constructor(storage, database, options) {
        this.storage = storage;
        this.database = database;
        this.fs = options?.fs || null;
        this.path = options?.path || null;
    }
    /**
     * Sets active settings configuration
     */
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        if (settings.preferredLanguage) {
            this.settings.language = settings.preferredLanguage;
        }
    }
    /**
     * Retrieves active settings configuration
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Retrieves wake word status
     */
    getWakeWordStatus() {
        return this.settings.wakeWordEnabled ? this.wakeWordStatus : 'off';
    }
    /**
     * Sets wake word status
     */
    setWakeWordStatus(status) {
        if (this.settings.wakeWordEnabled) {
            this.wakeWordStatus = status;
        }
        else {
            this.wakeWordStatus = 'off';
        }
    }
    /**
     * Monitor CPU usage. Auto-disables wake word if CPU > 85% and autoDisableOnHighCpu is true
     */
    monitorCpuUsage(cpuPercent) {
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
    getAudioCachePath(phraseId) {
        const root = this.storage.getPath('audio_cache');
        return this.path ? this.path.join(root, `${phraseId}.wav`) : `${root}/${phraseId}.wav`;
    }
    /**
     * Simulates/Executes Voice-to-Text Speech Recognition and optionally saves audio log
     */
    async recordAndTranscribe(options) {
        const opt = typeof options === 'string' ? { simulatedText: options } : options;
        let attempt = 1;
        const maxAttempts = this.settings.autoRetryVoiceOnce ? 2 : 1;
        while (attempt <= maxAttempts) {
            try {
                if (opt?.forceFailureAlways || (opt?.forceFailureOnce && attempt === 1)) {
                    const err = new Error("TRANSCRIPTION_API_TIMEOUT: Simulated transcription service timeout.");
                    err.transcriptionAttempt = opt?.simulatedText || (this.settings.preferredLanguage === 'hindi' ? "Jarvis, storage status check karo" :
                        this.settings.preferredLanguage === 'hinglish' ? "Jarvis, current project ka git status batao" :
                            "Jarvis, flutter analyze prepare karo");
                    throw err;
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const transcript = opt?.simulatedText || (this.settings.preferredLanguage === 'hindi' ? "Jarvis, storage status check karo" :
                    this.settings.preferredLanguage === 'hinglish' ? "Jarvis, current project ka git status batao" :
                        "Jarvis, flutter analyze prepare karo");
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
                        }
                        else {
                            // Immediately delete temp file (do not permanently store raw audio)
                            this.fs.unlinkSync(tempPath);
                        }
                    }
                }
                this.database.logStorageEvent('VOICE_INPUT', `Recorded and transcribed input: "${transcript}"`);
                return transcript;
            }
            catch (err) {
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
    async playVoiceMessage(text) {
        console.log(`TTS synthesis request (${this.settings.preferredLanguage}): "${text}"`);
        // 1. Speak voice response via Web Speech Synthesis if active and supported
        if (this.settings.voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                if (this.settings.preferredLanguage === 'hindi') {
                    utterance.lang = 'hi-IN';
                }
                else if (this.settings.preferredLanguage === 'english') {
                    utterance.lang = 'en-US';
                }
                else {
                    utterance.lang = 'hi-IN'; // Hinglish mixed language fallback
                }
                utterance.rate = this.settings.voiceResponseSpeed === 'fast' ? 1.5 : 1.0;
                window.speechSynthesis.speak(utterance);
            }
            catch (e) {
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
            }
            catch {
                // Silently skip write errors
            }
        }
        return true;
    }
}
