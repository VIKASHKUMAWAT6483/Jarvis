export class ErrorDiagnostics {
    diagnose(category, rawErrorMsg) {
        // Redact any raw secret patterns
        const cleanMsg = rawErrorMsg
            .replace(/sk-proj-[A-Za-z0-9_-]{10,}/g, "[REDACTED OPENAI KEY]")
            .replace(/AIzaSy[A-Za-z0-9_-]{10,}/g, "[REDACTED FIREBASE KEY]");
        switch (category) {
            case 'ssd_disconnected':
                return {
                    category,
                    whatHappened: 'External HP P500 SSD is not detected by the system.',
                    whyLikely: 'The USB cable might be loose or the SSD drive was unmounted.',
                    safeNextStep: 'Verify USB connection physically, remount drive HP P500, then click Reconnect.',
                    hinglishSummary: 'Jarvis ko external SSD nahi mila. Cable check karein aur wapas connect karein.',
                    logPath: '/Volumes/HP P500/Jarvis/09-logs/storage_events.log',
                    canRetry: true
                };
            case 'api_key_missing':
                return {
                    category,
                    whatHappened: 'OpenAI API key is missing or blank.',
                    whyLikely: 'The configuration file was reset or the key has not been entered yet.',
                    safeNextStep: 'Go to Settings -> Storage and enter your OpenAI API key.',
                    hinglishSummary: 'OpenAI API key nahi mila. Settings me jaakar key add karein.',
                    canRetry: false
                };
            case 'voice_api_failure':
                return {
                    category,
                    whatHappened: 'Voice transcription or playback engine failed.',
                    whyLikely: 'OpenAI transcription service returned an authentication or rate limit error.',
                    safeNextStep: 'Check your internet connection and API key quota status.',
                    hinglishSummary: 'Voice command transcription fail ho gaya. Internet aur key limits check karein.',
                    canRetry: true
                };
            case 'gmail_token_expired':
                return {
                    category,
                    whatHappened: 'Gmail OAuth credentials token has expired.',
                    whyLikely: 'The token reached its lifetime limit or was revoked by Google security policy.',
                    safeNextStep: 'Click Re-authenticate to obtain a fresh OAuth token.',
                    hinglishSummary: 'Gmail access token expire ho gaya hai. Wapas authorization refresh karein.',
                    canRetry: true
                };
            case 'github_token_expired':
                return {
                    category,
                    whatHappened: 'GitHub Personal Access Token (PAT) is invalid or expired.',
                    whyLikely: 'The token expired based on its set calendar duration.',
                    safeNextStep: 'Generate a new token in GitHub settings and update it in Jarvis.',
                    hinglishSummary: 'GitHub token expire ho gaya. Naya token settings me upload karein.',
                    canRetry: false
                };
            case 'project_missing':
                return {
                    category,
                    whatHappened: 'Selected active workspace project folder was not found on disk.',
                    whyLikely: 'The directory was renamed, deleted, or the SSD mount path changed.',
                    safeNextStep: 'Reselect the active project folder from the Projects list.',
                    hinglishSummary: 'Selected project path nahi mila. Workspace list se wapas choose karein.',
                    canRetry: true
                };
            case 'command_timeout':
                return {
                    category,
                    whatHappened: 'Terminal process execution exceeded the safety timeout barrier.',
                    whyLikely: 'The command is waiting for interactive prompt input or download loop.',
                    safeNextStep: 'Run the command in non-interactive mode or increase the timeout limit.',
                    hinglishSummary: 'Command run karne me zyada time lag raha hai. Script ko check karein.',
                    canRetry: true
                };
            case 'build_failed':
                return {
                    category,
                    whatHappened: 'Production compile build script exited with non-zero code.',
                    whyLikely: 'TypeScript compiler errors or missing file references.',
                    safeNextStep: 'Check local compile errors output, fix syntax issues, and rebuild.',
                    hinglishSummary: 'App build fail ho gaya compile errors ki wajah se. Code fix karein.',
                    canRetry: true
                };
            case 'permission_denied':
                return {
                    category,
                    whatHappened: 'Operating System denied read/write permissions for the target path.',
                    whyLikely: 'The command lacks admin permissions or directory write access rights.',
                    safeNextStep: 'Run chmod permissions or run CLI agent with sudo credentials.',
                    hinglishSummary: 'Permission nahi mili file change karne ki. User access levels check karein.',
                    canRetry: true
                };
            case 'report_generation_failed':
                return {
                    category,
                    whatHappened: 'Report format exporter failed to parse metadata.',
                    whyLikely: 'Telemetry log files are corrupted or missing write access to /05-reports/.',
                    safeNextStep: 'Clean report cache directory and verify target folder write permission.',
                    hinglishSummary: 'Report file create nahi ho payi. SSD permissions confirm karein.',
                    canRetry: true
                };
            default:
                return {
                    category: 'generic_error',
                    whatHappened: cleanMsg || 'An unexpected error occurred.',
                    whyLikely: 'Diagnostic reasons are currently not categorized.',
                    safeNextStep: 'Review terminal log output details or restart the application.',
                    hinglishSummary: 'Kuch problem aayi hai. Terminal logs verify karein.',
                    canRetry: true
                };
        }
    }
}
