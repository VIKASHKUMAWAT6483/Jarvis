# Jarvis Safety Rules

The Safety Engine is Jarvis's command classification and approval gateway. Every command — whether typed, pasted, or spoken via voice — passes through this engine before execution.

---

## Risk Classification Levels

### 🔴 Blocked (Immediate Denial)
These commands are **never** executed. No override is available.

| Pattern | Description |
| :--- | :--- |
| `rm -rf /` | Recursive root deletion |
| `rm -rf *` | Recursive wildcard deletion |
| `sudo rm` | Elevated deletion |
| `diskutil erase` | Disk formatting |
| `git reset --hard` | Destructive history rewrite |
| `git push --force` / `git push -f` | Force push (overwrites remote) |
| `firebase firestore:delete` | Firestore data deletion |
| `npm publish` | Package publishing |

### 🟣 Critical (Typed Confirmation Required)
User must type **"CONFIRM"** in a text field to proceed.

| Pattern | Description |
| :--- | :--- |
| `rm` (any form) | File deletion |
| `unlink` | File removal |
| `modify/alter/drop database` | Database schema changes |
| `firebase deploy --only firestore:rules` | Security rule deployment |
| App Store submission commands | `fastlane`, `xcrun altool` |
| `production release` | Production release triggers |

### 🟠 High (Click Approval Required)
User must click "Approve & Execute" in the safety modal.

| Pattern | Description |
| :--- | :--- |
| `git commit` | Code commits |
| `git push` | Remote pushes (non-force) |
| `firebase deploy` | Firebase deployments |
| `send email` / `send message` | Outbound communications |
| `start call` / `call` | Phone call initiation |

### 🟡 Medium (Click Approval Required)
Same approval flow as high, but lower severity.

| Pattern | Description |
| :--- | :--- |
| `npm install` | Dependency installation |
| `npm run build` | Production builds |
| `npm run dev` | Dev server startup |
| `flutter analyze` | Static analysis |
| `flutter build apk/appbundle` | Mobile builds |
| `gmail_create_draft` | Email draft creation |
| `firebase_config_check` | Firebase audits |
| `play_store_readiness_audit` | Store readiness checks |

### 🟢 Low (Auto-Execute)
These commands run immediately without approval.

| Pattern | Description |
| :--- | :--- |
| `git status` | Repository status |
| `ls` | Directory listing |
| `pwd` | Print working directory |
| `cat` | File reading |
| `flutter --version` | Version checks |
| `node --version` | Version checks |

---

## Secret Scanning

The Safety Engine also scans all inputs for leaked credentials:

| Pattern | Description |
| :--- | :--- |
| `AIzaSy...` (35+ chars) | Google/Firebase API keys |
| `sk-proj-...` / `sk-...` | OpenAI API keys |
| `API_KEY = "..."` | Generic API key assignments |
| `Bearer ...` (20+ chars) | OAuth bearer tokens |
| `ghp_...` / `gho_...` | GitHub personal/OAuth tokens |
| `-----BEGIN PRIVATE KEY-----` | Private key blocks |

If a secret is detected in user input, the command is **immediately blocked** with: `"Access denied. Prompt contains plain-text secret token."`.

---

## Log Privacy Rules

| Data Type | Log Behavior |
| :--- | :--- |
| Email body content | **Redacted** — only action summary logged |
| Phone numbers | **Masked** — e.g. `+9198765XXXXX` |
| Calendar event details | **Redacted** — only title and date logged |
| Message content | **Redacted** — only recipient logged |
| Browser URLs | **Domain only** — query parameters stripped |
| API keys/tokens | **Never logged** |
