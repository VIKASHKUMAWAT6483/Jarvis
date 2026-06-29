# RELEASE CHECKLIST - Jarvis v0.1

Use this checklist to verify that all functional requirements, security parameters, and directory setups are fully satisfied before signing off on the v0.1 release.

---

## 💾 1. Storage & Directories Setup

- [ ] **External SSD Directory Structure**:
  Verify folders exist on SSD mount path `/Volumes/HP P500/Jarvis/`:
  - `01-source-code/`
  - `02-projects/`
  - `03-logs/` (with nested `terminal/`, `git/`, `builds/`)
  - `04-builds/`
  - `05-reports/`
  - `06-audio-cache/`
  - `07-database-backups/`
  - `10-backups/`
  - `runtime/data/` (holds SQLite database)
- [ ] **Database Connection Check**:
  SQLite database initializes successfully inside `/Volumes/HP P500/Jarvis/runtime/data/jarvis.sqlite` and writes tables.
- [ ] **SSD Disconnected Safe Fallback Check**:
  Verify heavy writes are blocked when SSD is missing unless *temporary fallback* setting is activated.

---

## 🛡️ 2. Safety Engine & Security Boundaries

- [ ] **Risk Classification Verification**:
  Ensure command categories match target safety classifications:
  - Low-risk: `git status`, `ls`, `pwd` (run directly).
  - Medium-risk: `flutter analyze`, `npm install` (requires UI confirmation).
  - High-risk: `git commit`, `git push`, `firebase deploy` (requires UI confirmation + command preview).
  - Critical-risk: deleting files, editing security rules (requires typed "CONFIRM" input).
  - Blocked: `rm -rf /`, `npm publish` (strictly blocked).
- [ ] **Key Redaction / Sanitization**:
  Verify that credentials matching `sk-`, `API_KEY=`, `GOOGLE_API_KEY`, `FIREBASE`, and `private_key` are redacted from logs and console outputs.
- [ ] **Plaintext Key Scan**:
  Confirm that no plaintext secrets exist inside `.env` template files, databases, or external SSD.

---

## 🛠️ 3. Tools Playground & Auditing

- [ ] **Read-Only Git Tools**:
  Test quick buttons: Git Status, Diff Summary, and Last Commit.
- [ ] **Audit DB Logs**:
  Inspect `commands`, `approvals`, and `storage_events` SQLite database tables to confirm audits are correctly populated.
- [ ] **Zipped Configurations Backups**:
  Run a manual backup via Settings and verify the generated folder inside `10-backups/` contains:
  - `jarvis.sqlite`
  - `project_profiles.json`
  - `settings-export.json`
  - `tool-registry-config.json`
  - `storage-policy-snapshot.json`
  - `logs-index.json`

---

## 🗣️ 4. Voice Mode & UI Dashboard

- [ ] **Keyboard Hotkey bindings**:
  Press `Command + Shift + J` and confirm the microphone recording triggers successfully.
- [ ] **Speech Synthesis Voice Replies**:
  Verify that voice responses are spoken out loud via browser native speech interfaces when active.
- [ ] **Telemetry status indicators**:
  Verify that all 8 status cards (SSD status, Active Workspace, Git status, Last command, Pending approvals, Recent logs, Build status, Storage usage) are rendered on the control dashboard and update dynamically.
