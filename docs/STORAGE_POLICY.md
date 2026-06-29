# Jarvis Storage Policy

## Overview

Jarvis separates all data across two physical drives to protect internal SSD lifespan and enforce credential isolation.

---

## Drive Mapping

### Internal SSD (`~/Library/Application Support/Jarvis/`)
| What is stored | Why |
| :--- | :--- |
| Encrypted secrets (`secrets.enc`) | Credentials must never leave the internal drive |
| macOS Keychain references | OS-level secure credential storage |
| Small app config files | Minimal footprint settings |

> [!CAUTION]
> **Never** store builds, logs, audio cache, database backups, or any generated heavy files on the internal SSD.

### External SSD (`/Volumes/HP P500/Jarvis/`)
| Directory | Contents |
| :--- | :--- |
| `01-source-code/` | Jarvis monorepo workspace |
| `02-projects/` | Managed development projects |
| `03-flutter-sdk/` | Flutter SDK installation |
| `04-builds/` | Compiled app bundles (APK, AAB, Vite dist) |
| `05-reports/` | Test reports, audit logs, release notes |
| `06-audio-cache/` | Voice mode WAV recordings (when enabled) |
| `07-database-backups/` | SQLite database snapshot backups |
| `08-temp-storage/` | Temporary files and scratch data |
| `10-backups/` | Full version backup packages |
| `runtime/data/` | Active SQLite database (`jarvis.sqlite`) |

---

## Mount Rules

1. **On startup**, `StorageManager` checks if `/Volumes/HP P500/` is mounted.
2. **If mounted**: All read/write operations proceed normally.
3. **If unmounted**:
   - Heavy write operations are **blocked** with `STORAGE ERROR`.
   - Dashboard displays a red **"External SSD Disconnected"** warning banner.
   - Audio cache is automatically disabled.
   - Database logging falls back to read-only mode.

---

## What NOT to Store on External SSD

| Item | Reason |
| :--- | :--- |
| API keys (OpenAI, Firebase, Gmail) | Must stay encrypted on internal SSD |
| `.env.local` files | Contains plaintext secrets |
| OAuth tokens | Sensitive authentication data |
| Keystore passwords | App signing credentials |
| Apple certificates (`.p12`, `.pem`) | Code signing credentials |

---

## What NOT to Commit to Git

The `.gitignore` enforces these exclusions:

```
node_modules/          # Dependencies (reinstall via npm)
dist/                  # Build outputs (rebuild via npm run build)
*.sqlite, *.db         # Database files
.env, .env.local       # Secret configurations
*.pem, *.key           # Certificate and key files
runtime/, logs/        # Runtime data directories
audio-cache/, builds/  # Heavy generated data
```

---

## Backup Strategy

1. **Database backups**: Stored in `/Volumes/HP P500/Jarvis/07-database-backups/`
2. **Full version backups**: Stored in `/Volumes/HP P500/Jarvis/10-backups/v{version}/`
3. **Backup script**: `npx tsx scripts/make-final-backup-v1.0.ts`
4. **Secrets are NEVER included** in any backup — they must be re-entered manually on restore.
