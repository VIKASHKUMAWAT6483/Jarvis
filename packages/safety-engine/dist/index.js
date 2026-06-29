export class SafetyEngine {
    // Regex patterns for blocked commands
    blockedPatterns = [
        /rm\s+-rf\s+\//, // rm -rf /
        /rm\s+-rf\s+\*/, // rm -rf *
        /sudo\s+rm/, // sudo rm
        /diskutil\s+erase/, // diskutil erase
        /git\s+reset\s+--hard/, // git reset --hard
        /git\s+push\s+.*--force/, // git push --force
        /git\s+push\s+.*-f(\s|$)/, // git push -f
        /firebase\s+firestore:delete/, // firebase firestore:delete
        /npm\s+publish/, // npm publish
        /exposing\s+API\s+keys/i // explicit API key exposure check
    ];
    // Regex patterns for critical commands
    criticalPatterns = [
        /rm\s+/, // delete files (rm)
        /unlink\s+/, // delete files (unlink)
        /(modify|alter|drop|delete\s+from)\s+database/i, // database alter/drops
        /firebase\s+deploy\s+--only\s+(firestore:rules|storage:rules)/, // Firebase security rule edits
        /(app\s+store\s+submission|fastlane|xcrun\s+altool)/i, // App Store submissions
        /production\s+release/i // Production release commands
    ];
    // Regex patterns for high commands
    highPatterns = [
        /git\s+commit/, // git commit
        /git\s+push/, // git push
        /firebase\s+deploy/, // firebase deploy
        /(send\s+email|mail\s+)/i, // send email
        /(send\s+message|sms\s+)/i, // send SMS/chat
        /(start\s+call|call\s+)/i // call operations
    ];
    // Regex patterns for medium commands
    mediumPatterns = [
        /npm\s+install/, // npm install
        /npm\s+i(\s|$)/, // npm i
        /npm\s+run\s+build/, // npm run build
        /flutter\s+analyze/, // flutter analyze
        /flutter\s+build\s+(apk|appbundle)/, // flutter build apk/appbundle
        /gmail_create_draft/, // gmail create draft
        /firebase_config_check/, // firebase config check
        /android_manifest_check/, // android manifest check
        /play_store_readiness_audit/ // play store readiness audit
    ];
    // Regex patterns for low commands
    lowPatterns = [
        /git\s+status/, // git status
        /ls(\s|$)/, // ls
        /pwd/, // pwd
        /cat\s+/, // cat (safe files check done additionally)
        /flutter\s+--version/, // flutter --version
        /node\s+--version/ // node --version
    ];
    // Secrets Redaction patterns
    secretRegexes = [
        /AIzaSy[A-Za-z0-9_-]{33,35}/g, // Google/Gemini API Key
        /sk-[a-zA-Z0-9_-]+/g, // OpenAI API keys
        /API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, // API_KEY=
        /GOOGLE_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, // GOOGLE_API_KEY
        /FIREBASE_[A-Za-z0-9_]*\s*=\s*['"]?[A-Za-z0-9_-]+['"]?/gi, // FIREBASE keys
        /private_key\s*=\s*['"]?[A-Za-z0-9_-]+['"]?/gi, // private_key
        /-----BEGIN\s[A-Z|\s]+PRIVATE\sKEY-----[\s\S]+?-----END\s[A-Z|\s]+PRIVATE\sKEY-----/g, // Private key blocks
        /("password"\s*:\s*")[^"]+(")/gi, // JSON passwords
        /("client_secret"\s*:\s*")[^"]+(")/gi // JSON client secrets
    ];
    /**
     * Helper checking if the command is blocked
     */
    isBlocked(command) {
        const trimmed = command.trim();
        // Check if the command contains sensitive paths check (e.g. reading .env files as low command)
        if (trimmed.includes('cat') && (trimmed.includes('.env') || trimmed.includes('private.key') || trimmed.includes('service-account'))) {
            return true; // Exposing secrets is blocked by default
        }
        return this.blockedPatterns.some(pattern => pattern.test(trimmed));
    }
    /**
     * Classifies the command into a RiskLevel
     */
    classifyCommand(command) {
        const trimmed = command.trim();
        if (trimmed.includes('calendar_create_event')) {
            if (trimmed.includes('attendees') && !trimmed.includes('attendees: ""') && !trimmed.includes('attendees: []')) {
                return 'high'; // calendar event with attendees requires approval
            }
            return 'medium'; // calendar event without attendees can be medium risk
        }
        if (trimmed.includes('reminder_create')) {
            return 'medium'; // personal reminder can be created after simple confirmation (medium risk)
        }
        if (trimmed.includes('calendar_list_today')) {
            return 'low'; // read-only is low risk
        }
        if (trimmed.includes('message_create_draft') || trimmed.includes('call_prepare')) {
            return 'medium'; // message draft creation and call preparation are medium risk
        }
        if (trimmed.includes('contact_lookup_placeholder')) {
            return 'low'; // contact lookup is low risk
        }
        if (trimmed.includes('open_url') || trimmed.includes('open_google_play_console_placeholder') ||
            trimmed.includes('open_firebase_console_placeholder') || trimmed.includes('open_github_repo_placeholder')) {
            return 'medium'; // opening URLs and dashboards are medium risk
        }
        if (trimmed.includes('search_web_query') || trimmed.includes('open_project_dashboard')) {
            return 'low'; // search web and local project dashboard is low risk
        }
        if (trimmed.includes('github_create_issue_draft')) {
            return 'medium'; // creating issue drafts is medium risk
        }
        if (trimmed.includes('github_repo_status') || trimmed.includes('github_list_issues') || trimmed.includes('github_pr_summary')) {
            return 'low'; // read-only github actions are low risk
        }
        if (this.isBlocked(trimmed)) {
            return 'blocked';
        }
        if (this.criticalPatterns.some(pattern => pattern.test(trimmed))) {
            return 'critical';
        }
        if (this.highPatterns.some(pattern => pattern.test(trimmed))) {
            return 'high';
        }
        if (this.mediumPatterns.some(pattern => pattern.test(trimmed))) {
            return 'medium';
        }
        if (this.lowPatterns.some(pattern => pattern.test(trimmed))) {
            return 'low';
        }
        // Default unknown commands are classified as medium risk to prevent accidental operations
        return 'medium';
    }
    /**
     * Checks if the risk level requires user approval to execute
     */
    requiresApproval(risk) {
        return risk === 'high' || risk === 'critical' || risk === 'blocked';
    }
    /**
     * Checks if the risk level requires explicit typed confirmation (e.g. critical items)
     */
    requiresTypedConfirmation(risk) {
        return risk === 'critical';
    }
    /**
     * Explains the risk classification in detail
     */
    explainRisk(command) {
        const risk = this.classifyCommand(command);
        switch (risk) {
            case 'blocked':
                return 'BLOCKED: This command is blocked by default. It carries dangerous parameters that can wipe your directories, hard-reset histories, or publish packages.';
            case 'critical':
                return 'CRITICAL RISK: Deletes files, modifies database schemas, alters security rules, or submits production deployments. Explicit typed confirmation is required.';
            case 'high':
                return 'HIGH RISK: Submits commits, triggers deploys to cloud, or initiates outward communication channels. Requires user approval.';
            case 'medium':
                return 'MEDIUM RISK: Downloads compiler dependencies, runs bundlers, or triggers codebase lint syntax analysis.';
            case 'low':
                return 'LOW RISK: Safe read-only inspections (status checks, path queries).';
            default:
                return 'UNKNOWN RISK: Classified as medium risk by default to enforce system safety.';
        }
    }
    /**
     * Redacts sensitive secret hashes or credentials from output logs
     */
    sanitizeOutput(output) {
        let sanitized = output;
        // Mask phone numbers fully (e.g. +919876543210 -> +9198765XXXXX)
        sanitized = sanitized.replace(/(\+?[0-9]{2,4}\s?[0-9]{3,5})\s?[0-9]{4,6}\b/g, '$1XXXXX');
        // Explicit checks for target replacement matching guidelines
        sanitized = sanitized.replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED_OPENAI_API_KEY]');
        sanitized = sanitized.replace(/API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, 'API_KEY=[REDACTED]');
        sanitized = sanitized.replace(/GOOGLE_API_KEY\s*=\s*['"]?[a-zA-Z0-9_-]+['"]?/gi, 'GOOGLE_API_KEY=[REDACTED]');
        sanitized = sanitized.replace(/FIREBASE_[A-Za-z0-9_]*\s*=\s*['"]?[A-Za-z0-9_-]+['"]?/gi, 'FIREBASE_KEY=[REDACTED]');
        sanitized = sanitized.replace(/private_key\s*=\s*['"]?[A-Za-z0-9_-]+['"]?/gi, 'private_key=[REDACTED]');
        for (const regex of this.secretRegexes) {
            sanitized = sanitized.replace(regex, (match, ...args) => {
                if (match.startsWith('AIzaSy')) {
                    return '[REDACTED_GEMINI_API_KEY]';
                }
                if (match.startsWith('sk-')) {
                    return '[REDACTED_OPENAI_API_KEY]';
                }
                if (match.startsWith('-----BEGIN')) {
                    return '[REDACTED_PRIVATE_KEY_BLOCK]';
                }
                if (match.toLowerCase().includes('api_key') || match.toLowerCase().includes('firebase') || match.toLowerCase().includes('private_key')) {
                    return '[REDACTED_SECRET]';
                }
                const p1 = args[0];
                const p2 = args[1];
                if (typeof p1 === 'string' && typeof p2 === 'string') {
                    return `${p1}[REDACTED_SECRET]${p2}`;
                }
                return '[REDACTED_SECRET]';
            });
        }
        return sanitized;
    }
    /**
     * Scans a string for plain-text secrets like API keys or private keys
     */
    scanForSecrets(input) {
        return this.secretRegexes.some(regex => {
            regex.lastIndex = 0;
            return regex.test(input);
        });
    }
    /**
     * Returns a complete safety profile report for a command
     */
    analyzeCommand(command) {
        const riskLevel = this.classifyCommand(command);
        return {
            isBlocked: riskLevel === 'blocked',
            riskLevel,
            requiresApproval: this.requiresApproval(riskLevel),
            requiresTypedConfirmation: this.requiresTypedConfirmation(riskLevel),
            explanation: this.explainRisk(command)
        };
    }
}
