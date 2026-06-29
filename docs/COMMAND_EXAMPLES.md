# Jarvis Command Examples

A collection of example commands you can use with Jarvis — via text chat or voice. Jarvis understands English, Hindi, and Hinglish.

---

## 📁 Storage & Project

| Command (Hinglish) | Command (English) | What It Does |
| :--- | :--- | :--- |
| "Jarvis, storage status check karo." | "Jarvis, check storage status." | Shows SSD mount state and free space |
| "Jarvis, external SSD folder open karo." | "Jarvis, open external SSD folder." | Opens SSD root in Finder |
| "Jarvis, current project ka status batao." | "Jarvis, show current project status." | Displays active workspace info |
| "Jarvis, current project Cursor me open karo." | "Jarvis, open current project in Cursor." | Launches project in code editor |

---

## 🔀 Git

| Command (Hinglish) | Command (English) | What It Does |
| :--- | :--- | :--- |
| "Jarvis, git status batao." | "Jarvis, show git status." | Shows branch and file changes |
| "Jarvis, git diff summary do." | "Jarvis, show git diff summary." | Summarizes changed files |
| "Jarvis, last commit dikhao." | "Jarvis, show last commit." | Displays most recent commit info |
| "Jarvis, git branch check karo." | "Jarvis, check git branch." | Lists branches |

---

## 🛠️ Developer Tools

| Command (Hinglish) | Command (English) | Risk | What It Does |
| :--- | :--- | :--- | :--- |
| "Jarvis, Flutter analyze karo." | "Jarvis, run Flutter analyze." | Medium | Runs `flutter analyze` |
| "Jarvis, APK build karo." | "Jarvis, build APK." | Medium | Runs `flutter build apk` |
| "Jarvis, npm build karo." | "Jarvis, run npm build." | Medium | Runs `npm run build` |
| "Jarvis, Play Store readiness audit karo." | "Jarvis, run Play Store audit." | Medium | Generates store readiness report |
| "Jarvis, Firebase config check karo." | "Jarvis, check Firebase config." | Medium | Audits Firebase configuration |

---

## 📧 Gmail

| Command (Hinglish) | Command (English) | What It Does |
| :--- | :--- | :--- |
| "Jarvis, client ko email draft karo ki app ka testing kal complete ho jayega." | "Jarvis, draft an email to client that app testing will complete tomorrow." | Creates Gmail draft with subject and body |

> [!NOTE]
> Jarvis creates **drafts only** — it never sends emails directly.

---

## 📅 Calendar & Reminders

| Command (Hinglish) | Command (English) | What It Does |
| :--- | :--- | :--- |
| "Jarvis, kal subah 8 baje mujhe app testing remind karna." | "Jarvis, remind me about app testing tomorrow at 8 AM." | Creates a personal reminder |
| "Jarvis, Friday ko 5 PM project review event add karo." | "Jarvis, add project review event on Friday at 5 PM." | Creates a calendar event |

---

## 💬 Messages & Calls

| Command (Hinglish) | Command (English) | What It Does |
| :--- | :--- | :--- |
| "Jarvis, Rahul ko message draft karo ki main 30 minute me call karunga." | "Jarvis, draft a message to Rahul that I'll call in 30 minutes." | Creates message draft (no send) |
| "Jarvis, Rahul ko call prepare karo." | "Jarvis, prepare call to Rahul." | Prepares call details (no dial) |

> [!NOTE]
> Phone numbers are **masked** in logs: `+9198765XXXXX`

---

## 🌐 Browser

| Command (Hinglish) | Command (English) | What It Does |
| :--- | :--- | :--- |
| "Jarvis, Firebase console open karo." | "Jarvis, open Firebase console." | Opens Firebase project dashboard |
| "Jarvis, Play Console open karo." | "Jarvis, open Play Console." | Opens Google Play Console |
| "Jarvis, GitHub repo open karo." | "Jarvis, open GitHub repo." | Opens current project's GitHub page |

---

## 🐙 GitHub

| Command (Hinglish) | Command (English) | Risk | What It Does |
| :--- | :--- | :--- | :--- |
| "Jarvis, GitHub status batao." | "Jarvis, show GitHub status." | Low | Shows repo status |
| "Jarvis, GitHub issues list karo." | "Jarvis, list GitHub issues." | Low | Lists open issues |
| "Jarvis, current bug ke liye GitHub issue draft karo." | "Jarvis, draft a GitHub issue for the current bug." | Medium | Creates issue draft |

---

## 🚫 Blocked Commands (Always Denied)

These will **never** execute:

```
rm -rf /
rm -rf *
sudo rm
git push --force
git reset --hard
npm publish
diskutil erase
firebase firestore:delete
```
