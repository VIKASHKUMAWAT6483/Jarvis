# KNOWN LIMITATIONS - Jarvis v0.1

The following are the known limitations and system constraints of Jarvis v0.1. These items are scheduled to be addressed in subsequent v0.2/v0.3 releases.

---

## 💻 1. Sandboxed Browser Mock File System
- **Constraint**: In pure web browser execution, Jarvis uses a simulated in-memory storage registry to mock file structures.
- **Impact**: Code updates do not modify actual files on the host computer unless running through Electron/Tauri desktop binary targets.
- **Future Plan**: Integrate native web file system APIs or Tauri FS bindings.

## 🗣️ 2. Speech Recording & Wake Words
- **Constraint**: Voice recording uses simulated waveforms and pre-set transcript mapping pools. No hot-word trigger ("Hey Jarvis") or continuous background microphone listener is active.
- **Impact**: Microphone recording must be manually activated via UI button click or the `Command + Shift + J` hotkey.
- **Future Plan**: Integrate background voice activity detection (VAD) and local offline wake-word engines in Tauri.

## 🔑 3. Keychain Services Fallback
- **Constraint**: Plaintext keys are stored encrypted. Outside native desktop applications (e.g. running in standard browsers), the app falls back to Base64 obfuscated files inside simulated local directories due to missing macOS security APIs.
- **Impact**: Native hardware security keychain bounds only activate under Tauri distribution packages.
- **Future Plan**: Implement native macOS Keychain Access wrappers.

## ⚙️ 4. Interactive Terminal Commands
- **Constraint**: The Safe Terminal Executor executes commands inside shell processes with a hard timeout. It cannot handle commands requiring interactive stdin prompts (e.g. `npm link` prompt inputs or SSH password keys prompts).
- **Impact**: Interactive prompts during task executions will cause the command execution to block and timeout.
- **Future Plan**: Provide interactive terminal shell feeds in UI dashboards.
