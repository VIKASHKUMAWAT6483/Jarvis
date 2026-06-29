# Jarvis User Guide

## Getting Started

### Launch Jarvis
```bash
cd /Volumes/HP\ P500/Jarvis/01-source-code/jarvis-ai
npm run dev --workspace=desktop
```
Open your browser at `http://localhost:1420` (or the Tauri desktop window launches automatically).

---

## Interface Overview

Jarvis has a tabbed interface:

| Tab | Purpose |
| :--- | :--- |
| **Home / Dashboard** | System status, warnings, shortcuts, and quick actions |
| **Chat** | Text-based command input with Jarvis |
| **Terminal** | Direct CLI command execution with safety gates |
| **Control Panel** | Project management, diagnostics, developer tools |

---

## Using Voice Mode

### Activate Voice
- **Click** the 🎤 mic button on the Home screen, OR
- **Press** `Cmd + Shift + J` keyboard shortcut.

### How It Works
1. Press the mic button / hotkey to start recording.
2. Speak your command (English, Hindi, or Hinglish).
3. Release to stop recording.
4. Jarvis transcribes your voice to text.
5. The transcribed text goes through the same text pipeline (intent detection → safety check → tool execution).
6. Jarvis replies with both **text** and **voice**.

### Voice Settings
| Setting | Options |
| :--- | :--- |
| Voice Enabled | On / Off |
| Audio Cache | On / Off (saves WAV files to external SSD) |
| Language | English, Hindi, Hinglish |

### Audio Cache Location
When enabled, recordings are saved to:
```
/Volumes/HP P500/Jarvis/06-audio-cache/
```
If the external SSD is disconnected, audio cache is automatically disabled with a warning.

---

## How Approvals Work

When you issue a command classified as **medium**, **high**, or **critical** risk:

1. Jarvis pauses execution.
2. A **Safety Shield modal** appears showing:
   - Risk level badge (medium / high / critical)
   - Command preview
   - Risk explanation
3. For **medium/high**: Click "Approve & Execute" or "Deny Execution".
4. For **critical**: You must type **CONFIRM** before the approve button activates.
5. **Blocked** commands show an error immediately — no override available.

---

## How Logs Are Stored

All command executions are logged to an SQLite database on the external SSD:

```
/Volumes/HP P500/Jarvis/runtime/data/jarvis.sqlite
```

### What Is Logged
- Tool name and execution timestamp
- Action summary (e.g. "Created Gmail draft for client@example.com")
- Risk level classification
- Approval status (approved / denied / auto)

### What Is NOT Logged
- Email body content
- Full phone numbers (masked)
- Calendar event private details
- Message text content
- API keys or tokens
- URL query parameters

---

## Using the Dashboard

The Home tab dashboard shows real-time status:

| Panel | What It Shows |
| :--- | :--- |
| **Storage Status** | External SSD mount state and free space |
| **Voice Status** | Voice mode enabled/disabled, language |
| **Workspace** | Current selected project |
| **Git Status** | Branch, clean/dirty state |
| **Build Status** | Last build result |
| **Pending Approvals** | Commands waiting for user approval |
| **Recent Commands** | Last executed commands with results |
| **Warning Alerts** | SSD disconnected, API key missing, safety blocks |

---

## How to Backup

### Quick Backup
```bash
npx tsx scripts/make-final-backup-v1.0.ts
```
This creates a backup at `/Volumes/HP P500/Jarvis/10-backups/v1.0-final/` containing:
- Source code (without `node_modules`, secrets, or `.git`)
- SQLite database snapshot
- Project profiles, settings, and tool configs
- Validation reports and setup guide

### What Is Excluded from Backups
- API keys, OAuth tokens, `.env.local`
- Keystore passwords, Apple certificates
- Raw email/message content

---

## How to Migrate to Another Mac

1. Copy the backup folder to your new Mac (via SSD or network).
2. Follow [SETUP_NEW_MAC.md](SETUP_NEW_MAC.md) step by step.
3. Re-enter your API keys manually in the Jarvis Settings panel.
4. Run `npx tsx scripts/verify-final-build.ts` to verify the restore.

See [SETUP_NEW_MAC.md](SETUP_NEW_MAC.md) for full details.
