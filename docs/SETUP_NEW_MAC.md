# Setup Jarvis on a New Mac

Follow these steps to restore Jarvis from a backup package onto a clean macOS machine.

---

## Step 1: Install Prerequisites

### Node.js (v20+)
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

### Rust & Tauri Toolchain
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### (Optional) Flutter SDK
Only needed if you build Flutter mobile targets:
```bash
# Download from https://flutter.dev/docs/get-started/install/macos
# Or restore from /Volumes/HP P500/Jarvis/03-flutter-sdk/
```

---

## Step 2: Connect External SSD

1. Plug in the **HP P500 SSD** via USB.
2. Verify it mounts at: `/Volumes/HP P500/`.
3. Confirm the Jarvis directory exists: `/Volumes/HP P500/Jarvis/`.

```bash
ls /Volumes/HP\ P500/Jarvis/
# Should show: 01-source-code, 02-projects, 04-builds, 05-reports, etc.
```

---

## Step 3: Restore Source Code

Copy from backup or clone from GitHub:

```bash
# Option A: From backup
cp -R /Volumes/HP\ P500/Jarvis/10-backups/v1.0-final/01-source-code/ \
      /Volumes/HP\ P500/Jarvis/01-source-code/jarvis-ai/

# Option B: From GitHub
cd /Volumes/HP\ P500/Jarvis/01-source-code/
git clone git@github.com:VIKASHKUMAWAT6483/Jarvis.git jarvis-ai
```

---

## Step 4: Install Dependencies

```bash
cd /Volumes/HP\ P500/Jarvis/01-source-code/jarvis-ai
npm install
```

---

## Step 5: Restore Database

Copy the SQLite database backup to the runtime directory:

```bash
mkdir -p /Volumes/HP\ P500/Jarvis/runtime/data/
cp /Volumes/HP\ P500/Jarvis/10-backups/v1.0-final/jarvis.sqlite \
   /Volumes/HP\ P500/Jarvis/runtime/data/jarvis.sqlite
```

---

## Step 6: Configure Secrets

> [!IMPORTANT]
> Secrets are **never** included in backups. You must re-enter them manually.

1. Launch Jarvis desktop app.
2. Go to the **Settings** panel.
3. Enter your API keys:
   - **OpenAI API Key** (for voice transcription)
   - **Gmail App Password** (for draft creation)
4. Keys are encrypted and stored in macOS Keychain — never on disk in plaintext.

---

## Step 7: Start Jarvis

```bash
# Development mode
npm run dev --workspace=desktop

# Or production build
npm run build --workspace=desktop
```

---

## Step 8: Verify Installation

Run the verification script:

```bash
npx tsx scripts/verify-final-build.ts
```

Expected output: `✅ Jarvis v1.0 STABLE (5/5)`

---

## Troubleshooting

| Issue | Fix |
| :--- | :--- |
| SSD not detected | Re-plug USB cable, check `/Volumes/` |
| `npm install` fails | Delete `node_modules/` and `package-lock.json`, retry |
| Database errors | Re-copy `jarvis.sqlite` from backup |
| API keys not working | Re-enter in Settings panel |

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more.
