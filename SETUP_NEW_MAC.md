# SETUP NEW MAC - Jarvis Migration Guide

This guide describes how to migrate your Jarvis workspace, configuration, database, and settings to a brand new macOS machine.

## Prerequisites

Before starting the setup, ensure you have your **external SSD drive** (HP P500 or equivalent) connected, as this holds your main workspaces, logs, and compiled bundles.

---

## Setup Steps

### 1. Install Node, Rust & Tauri Dependencies

First, prepare your development environment and install the compiler dependencies.

1. **Install Homebrew**:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. **Install Node.js & npm** (LTS version is recommended):
   ```bash
   brew install node
   ```
3. **Install Rust & Cargo**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
4. **Install Tauri CLI dependencies**:
   ```bash
   brew install git cocoapods
   ```

### 2. Connect External SSD

Connect your external SSD to the new Mac.
- Ensure the volume mounts at: `/Volumes/HP P500`
- If mounted correctly, your main project repository will be located at:
  `/Volumes/HP P500/Jarvis/01-source-code/jarvis-ai`

### 3. Clone Private Git Repo

If you are setting up code changes or starting from scratch, clone your private repository:
```bash
git clone git@github.com:yourusername/jarvis-ai.git
```
*(Note: Jarvis is pre-configured to ignore all local env files and secrets).*

### 4. Restore Jarvis Backup

1. Open your Jarvis App on the new machine.
2. Go to **Settings > Backup**.
3. Under the **Restore** panel, click **Restore from Backup**.
4. Select the desired backup package from the list stored in:
   `/Volumes/HP P500/Jarvis/10-backups/`
5. Click **Confirm**. Jarvis will copy the SQLite database and settings configs back to your machine.

### 5. Re-enter API Keys

Since API keys and credentials are **never** backed up to the external SSD or database (to prevent security leaks):
1. In the Jarvis App, navigate to **Settings > Secrets**.
2. Under the **OpenAI API Key** field, type or paste your key.
3. Click **Save Key**. It will be securely stored encrypted in your local macOS Keychain folder:
   `~/Library/Application Support/Jarvis/secrets.enc`

### 6. Re-enable macOS Permissions

Grant security permissions to the terminal executors:
1. Go to **macOS System Settings > Privacy & Security**.
2. Select **Full Disk Access**.
3. Enable access for **Jarvis app** (and/or Terminal, VS Code, Cursor as needed).
4. Select **Accessibility** and enable Jarvis App.

---
Your new Mac is now ready to orchestrate commands with Jarvis!
