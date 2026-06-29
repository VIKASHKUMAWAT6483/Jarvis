# Jarvis Desktop AI Assistant

**Version**: 1.0.0 · **Platform**: macOS · **Stack**: Tauri + React + TypeScript

Jarvis is a professional Mac desktop AI assistant designed for Indian solo developers. It provides push-to-talk voice control, safe developer tool automation, Gmail/Calendar draft management, and GitHub integration — all while keeping heavy data on an external SSD and secrets encrypted in macOS Keychain.

---

## 🏗️ Monorepo Architecture

```text
jarvis-ai/
├── apps/
│   └── desktop/             # Tauri + React + TypeScript Desktop App
├── packages/
│   ├── shared-types/        # Common interfaces and config definitions
│   ├── storage-manager/     # SSD segregation, mount checks, path routing
│   ├── database-manager/    # SQLite audit logging and command history
│   ├── project-manager/     # Workspace profile management
│   ├── safety-engine/       # Command classification, secret scanning, risk gates
│   ├── tool-registry/       # Tool definitions, managers (Git, Build, Gmail, etc.)
│   ├── agent-core/          # Central intent detection and tool dispatch
│   └── voice-service/       # Push-to-talk STT/TTS and audio cache management
├── docs/                    # Documentation (you are here)
├── scripts/                 # Build, test, backup, and migration scripts
├── .env.example             # Environment template (never commit real values)
├── .gitignore               # Strict exclusion rules
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20+ and **npm**
- **Rust** toolchain (for Tauri builds): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **External SSD** (HP P500) mounted at `/Volumes/HP P500/`

### Install & Run
```bash
# Install all workspace dependencies
npm run install:all

# Start desktop development server
npm run dev --workspace=desktop

# Production build
npm run build --workspace=desktop
```

### Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| `Cmd + Shift + J` | Toggle push-to-talk voice mode |

---

## 💾 Storage Policy

Jarvis enforces strict storage separation:

| Location | Purpose |
| :--- | :--- |
| **Internal SSD** (`~/Library/Application Support/Jarvis`) | Small configs, encrypted secrets (Keychain) |
| **External SSD** (`/Volumes/HP P500/Jarvis/`) | Source code, builds, logs, audio cache, database, backups |

> [!WARNING]
> No plaintext credentials may ever be committed to Git or stored on the external SSD.

See [STORAGE_POLICY.md](docs/STORAGE_POLICY.md) for full details.

---

## 🛡️ Safety Engine

All commands pass through the Safety Engine before execution:

| Risk Level | Behavior | Examples |
| :--- | :--- | :--- |
| **Blocked** | Denied immediately | `rm -rf /`, `git push --force`, `npm publish` |
| **Critical** | Requires typed "CONFIRM" | `rm`, `drop database`, App Store submissions |
| **High** | Requires click approval | `git commit`, `git push`, `firebase deploy` |
| **Medium** | Requires click approval | `npm run build`, `flutter analyze`, Gmail drafts |
| **Low** | Executes immediately | `git status`, `ls`, `node --version` |

See [SAFETY_RULES.md](docs/SAFETY_RULES.md) for complete rules.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| [STORAGE_POLICY.md](docs/STORAGE_POLICY.md) | Storage separation rules and SSD mount policies |
| [SETUP_NEW_MAC.md](docs/SETUP_NEW_MAC.md) | Step-by-step restore guide for a new Mac |
| [SAFETY_RULES.md](docs/SAFETY_RULES.md) | Command classification and approval rules |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | How to use Jarvis (voice, chat, dashboard) |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |
| [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | Features intentionally out of scope |
| [COMMAND_EXAMPLES.md](docs/COMMAND_EXAMPLES.md) | Example commands in English and Hinglish |

---

## 🔗 Links

- **GitHub**: [VIKASHKUMAWAT6483/Jarvis](https://github.com/VIKASHKUMAWAT6483/Jarvis)
- **Release Tag**: `v1.0.0`
- **Reports**: `/Volumes/HP P500/Jarvis/05-reports/`
- **Backups**: `/Volumes/HP P500/Jarvis/10-backups/v1.0-final/`
