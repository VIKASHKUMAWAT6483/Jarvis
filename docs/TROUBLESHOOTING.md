# Jarvis Troubleshooting Guide

## External SSD Issues

### SSD Not Detected
**Symptom**: Dashboard shows "External SSD Disconnected" warning.
**Fix**:
1. Check USB cable connection — try a different port.
2. Open Finder and verify `/Volumes/HP P500/` appears.
3. If the drive appears with a different name, update `externalRoot` in `StorageManager` config.
4. Restart Jarvis after reconnecting.

### SSD Disconnected During Operation
**Symptom**: `STORAGE ERROR: External SSD is not mounted` errors.
**Fix**:
1. Reconnect the SSD.
2. Jarvis will auto-detect the reconnection on next command.
3. No data is lost — operations were blocked, not partially written.

---

## Build Issues

### `npm run build` Fails
**Symptom**: TypeScript or Vite compilation errors.
**Fix**:
```bash
# Clean and rebuild
rm -rf apps/desktop/dist
rm -rf packages/*/dist
npm run build --workspace=desktop
```

### `npm install` Fails
**Symptom**: Package resolution errors.
**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Vite Browser External Warnings
**Symptom**: Warnings about `crypto` and `child_process` being externalized.
**Status**: **Expected behavior**. These Node.js modules are used by backend packages (SafetyEngine, TerminalExecutor) and are handled by Tauri's Rust backend at runtime. The browser build correctly externalizes them.

---

## Voice Mode Issues

### Voice Not Working
**Symptom**: Mic button does nothing or no transcription appears.
**Fix**:
1. Check Voice is enabled in Settings panel.
2. Grant microphone permissions: System Preferences → Privacy & Security → Microphone.
3. Verify external SSD is connected (audio cache requires it when enabled).

### Transcription Inaccurate
**Fix**:
1. Speak clearly and closer to the microphone.
2. Switch language setting to match your speech (English / Hindi / Hinglish).
3. Reduce background noise.

---

## Safety Engine Issues

### Command Blocked Unexpectedly
**Symptom**: A safe command gets classified as blocked.
**Fix**:
1. Check the exact phrasing — the Safety Engine uses regex pattern matching.
2. Avoid phrases that match dangerous patterns (e.g. "delete" maps to `rm`).
3. Rephrase the command to avoid triggering blocked patterns.

### Approval Modal Not Appearing
**Symptom**: Medium/high risk command executes without approval.
**Fix**: This should not happen. If it does, check `SafetyEngine.requiresApproval()` logic and report as a bug.

---

## Database Issues

### Database Errors on Startup
**Symptom**: `SQLITE_ERROR` or database connection failures.
**Fix**:
1. Verify the database file exists: `ls /Volumes/HP\ P500/Jarvis/runtime/data/jarvis.sqlite`
2. If missing, restore from backup: `cp /Volumes/HP\ P500/Jarvis/10-backups/v1.0-final/jarvis.sqlite /Volumes/HP\ P500/Jarvis/runtime/data/`
3. If corrupted, delete and let Jarvis create a fresh database on next start.

### Logs Not Appearing
**Fix**:
1. Check SSD is mounted.
2. Check database file permissions: `chmod 644 /Volumes/HP\ P500/Jarvis/runtime/data/jarvis.sqlite`

---

## API Key Issues

### "API Key Missing" Warning
**Fix**:
1. Open Jarvis Settings panel.
2. Enter your OpenAI API key and/or Gmail App Password.
3. Keys are encrypted and stored in macOS Keychain.

### Keys Not Persisting After Restart
**Fix**:
1. Check macOS Keychain Access app for Jarvis entries.
2. Ensure the `secrets.enc` file exists in internal config directory.
3. Re-enter keys if Keychain entries were cleared.

---

## Git Issues

### Git Commands Fail
**Symptom**: `git status` returns errors.
**Fix**:
1. Verify you're in a Git repository: `git rev-parse --git-dir`
2. Check that the active workspace path points to a valid project.
3. Select the correct project in the Workspace selector.
