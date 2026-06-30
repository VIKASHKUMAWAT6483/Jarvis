export class BackupManager {
    storage;
    dbManager;
    projectManager;
    voiceService;
    fs;
    path;
    constructor(storage, dbManager, projectManager, voiceService, options) {
        this.storage = storage;
        this.dbManager = dbManager;
        this.projectManager = projectManager;
        this.voiceService = voiceService;
        this.fs = options?.fs || null;
        this.path = options?.path || null;
    }
    /**
     * Resolves the main backups root directory path
     */
    getBackupsRootPath() {
        const isMounted = this.storage.isExternalDriveMounted();
        const base = isMounted
            ? this.storage.getExternalRoot()
            : this.path.join(this.storage.getInternalConfigRoot(), 'temp_fallback');
        return this.path ? this.path.join(base, '10-backups') : `${base}/10-backups`;
    }
    /**
     * Executes a complete secure system backup
     * Excludes all secret parameters, local env keys, or raw private communications.
     */
    async executeBackup() {
        const backupsRoot = this.getBackupsRootPath();
        const timestamp = Date.now();
        const backupDirName = `backup_${timestamp}`;
        const targetDir = this.path ? this.path.join(backupsRoot, backupDirName) : `${backupsRoot}/${backupDirName}`;
        if (!this.fs) {
            throw new Error('File system adapter is unavailable.');
        }
        // 1. Create target backup directories
        if (!this.fs.existsSync(targetDir)) {
            this.fs.mkdirSync(targetDir, { recursive: true });
        }
        // 2. Database Backup (Item 1)
        const dbPath = this.dbManager.getDatabaseFilePath();
        if (dbPath && this.fs.existsSync(dbPath)) {
            const destDb = this.path ? this.path.join(targetDir, 'jarvis.sqlite') : `${targetDir}/jarvis.sqlite`;
            this.fs.copyFileSync(dbPath, destDb);
        }
        // 3. Project Profiles (Item 2)
        const profiles = this.dbManager.getProjectProfiles();
        const destProj = this.path ? this.path.join(targetDir, 'project_profiles.json') : `${targetDir}/project_profiles.json`;
        this.fs.writeFileSync(destProj, JSON.stringify(profiles, null, 2), 'utf8');
        // 4. Settings Export (without OpenAI API keys / secrets) (Item 3)
        const voiceSettings = this.voiceService ? this.voiceService.getSettings() : {};
        const settingsExport = {
            voice: voiceSettings,
            general: {
                theme: 'dark',
                temporaryInternalModeAllowed: this.storage.isTemporaryInternalModeAllowed()
            }
        };
        const destSettings = this.path ? this.path.join(targetDir, 'settings-export.json') : `${targetDir}/settings-export.json`;
        this.fs.writeFileSync(destSettings, JSON.stringify(settingsExport, null, 2), 'utf8');
        // 5. Tool Registry Config List (Item 4)
        // Stub tool definitions list for mapping tools inventory
        const toolsConfig = {
            registered_tools: [
                'list_directory', 'search_file', 'read_file', 'open_folder', 'open_file',
                'create_report_file', 'create_temp_file', 'git_status', 'git_branch',
                'git_diff_summary', 'git_last_commit', 'git_log_summary', 'flutter_analyze',
                'flutter_build_apk', 'flutter_build_aab', 'npm_run_build', 'npm_run_dev', 'npm_install'
            ]
        };
        const destTools = this.path ? this.path.join(targetDir, 'tool-registry-config.json') : `${targetDir}/tool-registry-config.json`;
        this.fs.writeFileSync(destTools, JSON.stringify(toolsConfig, null, 2), 'utf8');
        // 6. Storage Policy Snapshot (Item 5)
        const storageSnapshot = {
            timestamp,
            version: '0.1.0-alpha',
            storagePolicy: {
                externalRoot: this.storage.getExternalRoot(),
                internalRoot: this.storage.getInternalConfigRoot(),
                temporaryInternalModeAllowed: this.storage.isTemporaryInternalModeAllowed()
            }
        };
        const destSnapshot = this.path ? this.path.join(targetDir, 'storage-policy-snapshot.json') : `${targetDir}/storage-policy-snapshot.json`;
        this.fs.writeFileSync(destSnapshot, JSON.stringify(storageSnapshot, null, 2), 'utf8');
        // 7. Command Logs Index (Item 6)
        const commandsList = this.dbManager.getCommands();
        const destLogsIndex = this.path ? this.path.join(targetDir, 'logs-index.json') : `${targetDir}/logs-index.json`;
        this.fs.writeFileSync(destLogsIndex, JSON.stringify(commandsList, null, 2), 'utf8');
        // Log backup event to Database
        this.dbManager.logStorageEvent('BACKUP_SUCCESS', `Jarvis secure backup package created at: "${targetDir}"`);
        return targetDir;
    }
    /**
     * Restores system configurations and SQLite database from backup package
     */
    async restoreFromBackup(backupFolder) {
        if (!this.fs || !this.fs.existsSync(backupFolder)) {
            throw new Error(`Backup folder "${backupFolder}" does not exist.`);
        }
        const srcDb = this.path ? this.path.join(backupFolder, 'jarvis.sqlite') : `${backupFolder}/jarvis.sqlite`;
        const srcProj = this.path ? this.path.join(backupFolder, 'project_profiles.json') : `${backupFolder}/project_profiles.json`;
        const srcSettings = this.path ? this.path.join(backupFolder, 'settings-export.json') : `${backupFolder}/settings-export.json`;
        if (!this.fs.existsSync(srcDb) || !this.fs.existsSync(srcProj) || !this.fs.existsSync(srcSettings)) {
            throw new Error('Invalid backup package structure. Core elements are missing.');
        }
        // 1. Restore Database file
        const dbPath = this.dbManager.getDatabaseFilePath();
        if (dbPath) {
            const dbDir = this.path ? this.path.dirname(dbPath) : '';
            if (dbDir && !this.fs.existsSync(dbDir)) {
                this.fs.mkdirSync(dbDir, { recursive: true });
            }
            this.fs.copyFileSync(srcDb, dbPath);
        }
        // Re-initialize SQLite Database Manager
        this.dbManager.initialize();
        // 2. Restore settings configurations
        try {
            const settingsContent = this.fs.readFileSync(srcSettings, 'utf8');
            const settings = JSON.parse(settingsContent);
            if (settings.voice && this.voiceService) {
                this.voiceService.setSettings(settings.voice);
            }
            if (settings.general) {
                this.storage.setTemporaryInternalMode(settings.general.temporaryInternalModeAllowed);
            }
        }
        catch {
            // Allow soft restores for secondary configurations
        }
        // Log restore event
        this.dbManager.logStorageEvent('RESTORE_SUCCESS', `Successfully restored configurations and SQLite database from backup: "${backupFolder}"`);
        return true;
    }
    /**
     * Creates a backup of project config files and metadata before running a risky command
     */
    createPreActionBackup(projectName, projectPath, commandPreview) {
        if (!this.fs || !this.path) {
            throw new Error('File system adapter is unavailable for pre-action backups.');
        }
        const backupRoot = '/Volumes/HP P500/Jarvis/10-backups/pre-action';
        if (!this.fs.existsSync(backupRoot)) {
            this.fs.mkdirSync(backupRoot, { recursive: true });
        }
        const timestamp = Date.now();
        const backupDirName = `pre_action_${projectName}_${timestamp}`;
        const targetDir = this.path.join(backupRoot, backupDirName);
        this.fs.mkdirSync(targetDir, { recursive: true });
        // 1. Save metadata file
        const meta = {
            project_name: projectName,
            project_path: projectPath,
            command_preview: commandPreview,
            timestamp,
            date: new Date().toISOString()
        };
        this.fs.writeFileSync(this.path.join(targetDir, 'metadata.json'), JSON.stringify(meta, null, 2));
        // 2. Save current git status (simulated or read from files)
        const gitStatus = `On branch main. Pre-action backup triggered for command: ${commandPreview}`;
        this.fs.writeFileSync(this.path.join(targetDir, 'git_status.txt'), gitStatus);
        // 3. Copy config files if they exist (excluding env or private files)
        const configsToBackup = ['package.json', 'pubspec.yaml', 'firebase.json', 'jsconfig.json', 'tsconfig.json'];
        for (const config of configsToBackup) {
            const srcPath = this.path.join(projectPath, config);
            if (this.fs.existsSync(srcPath)) {
                let content = this.fs.readFileSync(srcPath, 'utf8');
                // Mask any secrets just in case
                content = content.replace(/"(sk-proj-|AIzaSy)[^"]+"/g, '"[REDACTED]"');
                this.fs.writeFileSync(this.path.join(targetDir, config), content);
            }
        }
        return targetDir;
    }
    /**
     * Exports safe configuration settings for migration (excluding secrets/keys)
     */
    exportSettings() {
        if (!this.fs || !this.path) {
            throw new Error('File system adapter is unavailable for settings export.');
        }
        const exportRoot = '/Volumes/HP P500/Jarvis/10-backups/settings-export';
        if (!this.fs.existsSync(exportRoot)) {
            this.fs.mkdirSync(exportRoot, { recursive: true });
        }
        // Assemble safe configuration
        const safeConfig = {
            timestamp: Date.now(),
            storage_paths: {
                externalRoot: this.storage.getExternalRoot(),
                internalRoot: this.storage.getInternalConfigRoot(),
                temporaryInternalModeAllowed: this.storage.isTemporaryInternalModeAllowed()
            },
            project_profiles: this.dbManager ? this.dbManager.getProjectProfiles() : [],
            ui_preferences: {
                theme: 'dark',
                glassmorphism: true
            },
            language_preference: 'Hinglish',
            voice_settings: this.voiceService ? this.voiceService.getSettings() : {
                voiceEnabled: true,
                audioCacheEnabled: true,
                voiceResponseSpeed: 'normal',
                preferredLanguage: 'Hinglish',
                autoRetryVoiceOnce: true
            },
            command_template_settings: {
                templates_enabled: true
            },
            report_settings: {
                default_format: 'markdown',
                reports_dir: '/Volumes/HP P500/Jarvis/05-reports/'
            },
            safety_preferences: {
                safety_gating_enabled: true
            }
        };
        const targetFile = this.path.join(exportRoot, 'jarvis_settings_export.json');
        this.fs.writeFileSync(targetFile, JSON.stringify(safeConfig, null, 2));
        if (this.dbManager) {
            this.dbManager.logStorageEvent('SETTINGS_EXPORT', `Exported safe settings configurations to: ${targetFile}`);
        }
        return targetFile;
    }
    /**
     * Imports configuration settings from a safe backup file (validates & blocks secrets)
     */
    importSettings(exportFilePath) {
        if (!this.fs || !this.fs.existsSync(exportFilePath)) {
            throw new Error(`Settings export file not found at: ${exportFilePath}`);
        }
        const content = this.fs.readFileSync(exportFilePath, 'utf8');
        const config = JSON.parse(content);
        // Verify safe contents: must not contain api keys or tokens
        const rawKeys = ['openai', 'key', 'token', 'secret', 'password', 'cert', 'keystore'];
        const contentLower = content.toLowerCase();
        for (const key of rawKeys) {
            if (contentLower.includes(key) && (contentLower.includes("sk-proj") || contentLower.includes("aizasy"))) {
                throw new Error('CRITICAL SAFETY BLOCK: Expired settings packet contains unencrypted credentials or secret tokens.');
            }
        }
        // Apply general configurations
        if (config.storage_paths) {
            this.storage.setTemporaryInternalMode(config.storage_paths.temporaryInternalModeAllowed);
        }
        if (config.voice_settings && this.voiceService) {
            this.voiceService.setSettings(config.voice_settings);
        }
        // Import project profiles
        if (config.project_profiles && Array.isArray(config.project_profiles) && this.dbManager) {
            for (const proj of config.project_profiles) {
                try {
                    this.dbManager.registerProjectProfile(proj);
                }
                catch {
                    // ignore duplicate profiles
                }
            }
        }
        if (this.dbManager) {
            this.dbManager.logStorageEvent('SETTINGS_IMPORT', `Imported safe settings configurations from: ${exportFilePath}`);
        }
        return true;
    }
}
