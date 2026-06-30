# Jarvis v1.1 Development Roadmap

This document outlines the goals, architecture updates, and feature specs for the **Jarvis v1.1** release.

---

## 🎯 v1.1 Release Goals

### 1. Improve Voice Reliability
* **Objective**: Reduce background noise interference and optimize voice processing reliability.
* **Scope**:
  * Add audio noise filtering algorithms during push-to-talk WAV recording.
  * Optimize transcription retry logic for weak network conditions.
  * Integrate custom voice activation preferences settings.

### 2. Add Command Templates
* **Objective**: Enable solo developers to execute complex workflows with single command macros.
* **Scope**:
  * Save favorite CLI commands as reusable templates (e.g. `npm run dev && git status`).
  * Add parameter variables inside templates (e.g., `git commit -m "{{message}}"`).

### 3. Add Report Generation
* **Objective**: Generate clean summary reports of developer operations automatically.
* **Scope**:
  * Output test logs, Git summaries, and build results as beautifully formatted Markdown documents.
  * Allow automatic export of audit logs to PDF/CSV spreadsheets via the UI console.

### 4. Add Project Health Score
* **Objective**: Provide automated code health audits and diagnostics inside the project console.
* **Scope**:
  * Calculate code health score based on static lint check warnings, package updates availability, and compiler output diagnostics.
  * Render project health metric score gauge inside the frontend dashboard.

### 5. Add Daily Briefing
* **Objective**: Summarize the current workstation state on first boot.
* **Scope**:
  * Render a greeting briefing detailing git changes, today's calendar events list, and unhandled high-risk pending actions on first dashboard launch.

### 6. Add Auto Backup Before Risky Actions
* **Objective**: Automate database checkpoints to protect developer logs.
* **Scope**:
  * Automatically create a fresh database snapshot inside `/Volumes/HP P500/Jarvis/07-database-backups/` right before executing any medium or high-risk commands.

### 7. Improve Error Handling
* **Objective**: Add graceful error boundaries and system recovery guidelines.
* **Scope**:
  * Provide helpful error recovery tips inside the console logs UI when build operations or voice components crash.

### 8. Improve Backup & Migration
* **Objective**: Optimize the restore sandbox workflow.
* **Scope**:
  * Add interactive step-by-step verification prompts inside the restore flow scripts.

### 9. Add Update Checker
* **Objective**: Alert solo developers of new stable version releases.
* **Scope**:
  * Query remote repository tags to compare local and latest builds, showing updates available notification banners in the UI.

---

## 🛠️ Architecture & Safe Separation Principles (Freeze)
* All core file paths rules and external SSD policies remain frozen: database and media folders reside strictly on external drive `/Volumes/HP P500/Jarvis/`.
* Plain-text credentials remain quarantined from SQLite log files and Git repository commits.
