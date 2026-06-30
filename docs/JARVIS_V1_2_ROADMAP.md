# Jarvis v1.2 Development Roadmap

**Branch**: `v1.2-development`  
**Base Tag**: `v1.1.0` (Stable)  
**Creation Date**: 2026-06-30  

---

## 🎯 Release Goals & Phases

### 🎙️ 1. Standby Wake Word Integration
- Implement standby listener mode detecting "Jarvis" hot-word without user clicks.
- Optimize voice processing engine to operate locally and securely.

### 💻 2. Lightweight HUD (Heads-Up Display)
- Create a lightweight floating overlay window (HUD) for quick voice activation and progress indicator logs.
- Support glassmorphism layouts and minimized layouts.

### 📧 3. Advanced Gmail Search & Read
- Implement full inbox query parsing and folder classification.
- Support safe emails rendering with privacy content filters.

### 📞 4. Messages & Calls Execution Gate
- Add support for queuing SMS/text payloads and dialing commands.
- Gate executions strictly with multi-modal approval dialog overlays.

### 📊 5. Multi-Project Monitoring
- Track file changes, lint issues, and health metrics across multiple registered projects concurrently.
- Consolidate dashboard widgets showing real-time updates.

### 🔌 6. Extensible Plugin System
- Support custom third-party javascript files integrations in runtime.
- Expose safe storage-manager and database-manager handles.

### 🐙 7. Advanced GitHub Integrations
- Fetch issues, generate pull request details, and automate changes commits.
- Authenticate safely via Keychain.

### 📱 8. Release Assistant
- Automate Android manifest checks, bundle exports, and App Store readiness checklists.
- Generate formatted changelogs automatically.
