# Jarvis v1.0 Known Limitations

The following features are **intentionally out of scope** for v1.0. They may be added in future versions.

---

## Communication Limits

| Feature | Status | Detail |
| :--- | :--- | :--- |
| **Direct Email Sending** | ❌ Not available | Only draft creation via `gmail_create_draft`. Direct sends require v1.1+. |
| **Direct SMS/Message Sending** | ❌ Not available | Only draft creation via `message_create_draft`. |
| **Direct Phone Calls** | ❌ Not available | Only call preparation via `call_prepare`. Actual dialing requires explicit user action. |

## Voice Limits

| Feature | Status | Detail |
| :--- | :--- | :--- |
| **Always-On Wake Word** | ❌ Not available | No "Hey Jarvis" wake word. Voice requires manual push-to-talk (`Cmd+Shift+J` or mic button). |
| **Voice Noise Profiles** | ❌ Not available | No ambient noise filtering or custom voice profiles. |
| **Real-Time Streaming STT** | ❌ Not available | Recording is batch — record first, transcribe after release. |

## GitHub Limits

| Feature | Status | Detail |
| :--- | :--- | :--- |
| **Create PR** | ❌ Blocked | Only issue drafts are allowed. PR creation requires v1.1+. |
| **Merge PR** | ❌ Blocked | Merges are high-risk operations blocked by default. |
| **Delete Branch** | ❌ Blocked | Branch deletion is blocked. |
| **Modify Secrets** | ❌ Blocked | Repository secret changes are blocked. |

## Browser Limits

| Feature | Status | Detail |
| :--- | :--- | :--- |
| **Form Submission** | ❌ Blocked | Opening URLs is supported, but form submissions are blocked. |
| **Payment Processing** | ❌ Blocked | Any payment or purchase actions are blocked. |
| **App Publishing** | ❌ Blocked | Play Store / App Store publishing via browser is blocked. |

## Security Limits

| Feature | Status | Detail |
| :--- | :--- | :--- |
| **Live OAuth Flow** | ❌ Not available | API keys are entered manually. Live OAuth login flow is not yet implemented. |
| **Multi-User Support** | ❌ Not available | Single-user only. No role-based access control. |
| **Audit Log Export** | ❌ Not available | Logs are in SQLite but no CSV/PDF export UI yet. |

## Platform Limits

| Feature | Status | Detail |
| :--- | :--- | :--- |
| **Windows/Linux** | ❌ Not available | macOS only. Cross-platform support planned for v2.0. |
| **Mobile Companion** | ❌ Not available | No iOS/Android companion app. Desktop only. |
