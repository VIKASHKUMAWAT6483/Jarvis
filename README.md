# Jarvis Desktop AI Assistant

Jarvis is a professional Mac desktop AI assistant structured as a monorepo containing a Tauri desktop app and local TypeScript modules.

---

## 🏗️ Monorepo Architecture

```text
jarvis-ai/
├── apps/
│   └── desktop/           # Tauri + React + TypeScript Desktop Application
├── packages/
│   ├── shared-types/      # Common interfaces, config definitions, and structures
│   ├── storage-manager/   # SSD segregation, mount verifications, path routing
│   ├── safety-engine/     # Secret leak scanners, prompt filtering, safety rules
│   ├── tool-registry/     # Custom function definitions & tool registering agent system
│   ├── agent-core/        # Central core agent loop & processing cycle
│   └── voice-service/     # TTS/STT cache managers and speech services
├── docs/                  # System design manuals and architectural specs
├── scripts/               # Helper maintenance and setup scripts
├── .env.example           # Local environment template (configs & paths)
├── .gitignore             # Strict exclusion lists
└── README.md              # Project instructions and startup guide
```

---

## 💾 Storage & Security Policy

Jarvis operates under a strict storage separation protocol to conserve internal Mac SSD space and prevent credential leakage.

* **Internal SSD (`~/Library/Application Support/Jarvis`)**: Stores local configurations, small state parameters, and secure keys in the macOS Keychain.
* **External SSD (`/Volumes/HP P500/Jarvis`)**: Stores all heavy data (working workspaces, builds, logs, and media caches).

> [!WARNING]
> **No plaintext credentials may ever be committed to git or stored on the external SSD.**

For the full storage matrices and security guidelines, read the [Jarvis Storage Policy](file:///Users/vikashkumar/Library/Application%20Support/Jarvis/STORAGE_POLICY.md).

---

## ⚙️ Local Setup Steps

Follow these steps to initialize your local development environment:

### Prerequisites
* **macOS** (v12+ recommended)
* **Node.js** (v18+ recommended)
* **Rust & Cargo** (Required to compile the Tauri native binaries):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### 1. External SSD Verification
Ensure your external SSD is connected and mounted at `/Volumes/HP P500`. Verify that the directory exists:
```bash
ls -la "/Volumes/HP P500/Jarvis"
```

### 2. Environment Variables Configuration
Copy the environment template and define your configuration:
```bash
cp .env.example .env
```
Open `.env` and fill in any required development environment parameters.

### 3. Install Dependencies
Run npm installer from the root workspace folder to fetch and link monorepo packages:
```bash
npm install
```

### 4. Run Development Server
To launch the desktop client in development mode with hot reloading:
```bash
npm run dev:desktop
```
This builds packages, starts the Vite frontend dev server, and compiles the Tauri native window wrappers.

### 5. Build Distribution Bundles
To package the app for production:
```bash
npm run build:packages
npm run build:desktop
```
The compiled binaries will be outputted under the external builds path at `/Volumes/HP P500/Jarvis/04-builds/`.

---

## 💾 How to Run Jarvis from External SSD

1. **Connect the SSD**: Connect the external drive containing `/Volumes/HP P500/Jarvis` to your USB port.
2. **Mount Validation**: Verify the drive mounts successfully and is writable.
3. **Execute Jarvis**: Launch the compiled app from the SSD's builds folder.
   - If the drive is connected, Jarvis reads configurations, databases, and logs directly from `/Volumes/HP P500/Jarvis/`.
   - If disconnected, Jarvis starts in safe fallback mode (write actions paused) to prevent write overload on the internal Mac SSD.

## ⏏️ How to Safely Eject External SSD

To prevent database corruption or logs data loss, follow these ejection steps:
1. **Close Jarvis**: Exit the Jarvis Desktop App completely (`Cmd + Q`).
2. **Stop running tasks**: Ensure no active terminal execution tasks or background builds are running.
3. **Safely Eject volume**: In Finder, click the Eject (⏏️) icon next to the `HP P500` volume, or execute:
   ```bash
   diskutil eject "/Volumes/HP P500"
   ```

## 📦 How to Migrate to Another Mac

To transfer your Jarvis profile to another Mac:
1. Connect the external SSD to the new Mac.
2. Clone your private repository or copy the code files to `/Volumes/HP P500/Jarvis/01-source-code/jarvis-ai`.
3. Open the Jarvis App, go to **Settings > Backup**, and restore your latest backup folder from `/Volumes/HP P500/Jarvis/10-backups/`.
4. Enter your OpenAI API key in **Settings > Secrets** to encrypt and save it in the new machine's local configuration directory.
5. Grant necessary permissions (Accessibility, Full Disk Access) to the terminal executor.
   - For step-by-step instructions, read the [New Mac Setup Manual](file:///Volumes/HP%20P500/Jarvis/01-source-code/jarvis-ai/SETUP_NEW_MAC.md).
