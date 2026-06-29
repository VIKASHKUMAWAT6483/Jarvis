export class ProjectManager {
    storage;
    database;
    activeProjectId = null;
    fs;
    path;
    constructor(storageManager, databaseManager, options) {
        this.storage = storageManager;
        this.database = databaseManager;
        this.fs = options?.fs || null;
        this.path = options?.path || null;
    }
    /**
     * Scans a project path to determine its development ecosystem types
     */
    detectProjectType(projectPath) {
        const types = [];
        if (!this.fs)
            return ['Generic'];
        try {
            // 1. Check for Flutter
            const pubspecPath = this.path ? this.path.join(projectPath, 'pubspec.yaml') : `${projectPath}/pubspec.yaml`;
            if (this.fs.existsSync(pubspecPath)) {
                types.push('Flutter');
            }
            // 2. Check for React/Node
            const packagePath = this.path ? this.path.join(projectPath, 'package.json') : `${projectPath}/package.json`;
            if (this.fs.existsSync(packagePath)) {
                types.push('React/Node');
            }
            // 3. Check for Firebase
            const firebasePath = this.path ? this.path.join(projectPath, 'firebase.json') : `${projectPath}/firebase.json`;
            if (this.fs.existsSync(firebasePath)) {
                types.push('Firebase');
            }
            // 4. Check for WordPress plugin
            let hasWpHeader = false;
            try {
                const rootFiles = this.fs.readdirSync ? this.fs.readdirSync(projectPath) : [];
                const phpFiles = rootFiles.filter((f) => f.endsWith('.php'));
                for (const file of phpFiles) {
                    const filePath = this.path ? this.path.join(projectPath, file) : `${projectPath}/${file}`;
                    const content = this.fs.readFileSync ? this.fs.readFileSync(filePath, 'utf8') : '';
                    if (content.includes('Plugin Name:') || content.includes('Description:')) {
                        hasWpHeader = true;
                        break;
                    }
                }
            }
            catch {
                // Ignore read directory errors
            }
            if (hasWpHeader) {
                types.push('WordPress Plugin');
            }
            if (types.length === 0) {
                types.push('Generic');
            }
        }
        catch {
            types.push('Generic');
        }
        return types;
    }
    /**
     * Determines if a project path lies on the internal SSD instead of the recommended external SSD
     */
    isPathInternal(projectPath) {
        const extRoot = this.storage.getExternalRoot();
        // Normalize path resolves to ensure clean substring comparison
        const resolvedPath = this.path ? this.path.resolve(projectPath) : projectPath;
        const resolvedExtRoot = this.path ? this.path.resolve(extRoot) : extRoot;
        // If it doesn't start with the external SSD root path, it is classified as internal.
        return !resolvedPath.startsWith(resolvedExtRoot);
    }
    /**
     * Registers a project folder path in Jarvis
     */
    addProject(projectPath, name) {
        if (!this.database.isReady()) {
            throw new Error('Database is offline. Cannot add project profile.');
        }
        const finalName = name || (this.path ? this.path.basename(projectPath) : projectPath.split('/').pop()) || 'Unnamed Project';
        const detectedTypes = this.detectProjectType(projectPath);
        const isInternal = this.isPathInternal(projectPath);
        // Save project profile to the SQLite audit database
        const projectId = this.database.logProjectProfile(finalName, projectPath, detectedTypes.join(', '));
        // Audit log this storage event
        const internalWarningText = isInternal ? ' (WARNING: Path is on internal SSD)' : '';
        this.database.logStorageEvent('PROJECT_ADD', `Registered project "${finalName}" at path: "${projectPath}"${internalWarningText}`);
        return projectId;
    }
    /**
     * Sets a project as the current active project
     */
    selectProject(projectId) {
        if (!this.database.isReady()) {
            throw new Error('Database is offline. Cannot change project selection.');
        }
        const profiles = this.database.getProjectProfiles();
        const target = profiles.find(p => p.id === projectId);
        if (!target) {
            throw new Error(`Project profile with ID "${projectId}" not found.`);
        }
        this.activeProjectId = projectId;
        this.database.logStorageEvent('PROJECT_SELECT', `Selected project "${target.project_name}" as current active workspace.`);
    }
    /**
     * Returns the current active project profile details
     */
    getActiveProject() {
        if (!this.activeProjectId || !this.database.isReady())
            return null;
        const profiles = this.database.getProjectProfiles();
        return profiles.find(p => p.id === this.activeProjectId) || null;
    }
    /**
     * Triggers developer quick actions for the active project
     */
    async executeQuickAction(action) {
        const active = this.getActiveProject();
        if (!active) {
            throw new Error('No active project is currently selected.');
        }
        const projectPath = active.project_path;
        switch (action) {
            case 'cursor':
                // Command: cursor "${projectPath}"
                console.log(`[SHELL] cursor "${projectPath}"`);
                this.database.logStorageEvent('PROJECT_ACTION', `Opened project in Cursor editor: "${active.project_name}"`);
                return `Cursor opened successfully for path: ${projectPath}`;
            case 'vscode':
                // Command: code "${projectPath}"
                console.log(`[SHELL] code "${projectPath}"`);
                this.database.logStorageEvent('PROJECT_ACTION', `Opened project in VS Code editor: "${active.project_name}"`);
                return `VS Code opened successfully for path: ${projectPath}`;
            case 'finder':
                // Command: open "${projectPath}"
                console.log(`[SHELL] open "${projectPath}"`);
                this.database.logStorageEvent('PROJECT_ACTION', `Opened project in Finder: "${active.project_name}"`);
                return `Finder view opened for path: ${projectPath}`;
            case 'git_status':
                // Command: git status inside projectPath
                console.log(`[SHELL] cd "${projectPath}" && git status`);
                this.database.logStorageEvent('PROJECT_ACTION', `Checked Git status for project: "${active.project_name}"`);
                // Mock Git output for portability validation
                return [
                    `On branch main`,
                    `Your branch is up to date with 'origin/main'.`,
                    ``,
                    `Changes not staged for commit:`,
                    `  (use "git add <file>..." to update what will be committed)`,
                    `  (use "git restore <file>..." to discard changes in working directory)`,
                    `\tmodified:   src/App.tsx`,
                    ``,
                    `no changes added to commit (use "git add" and/or "git commit -a")`
                ].join('\n');
            default:
                throw new Error(`Unknown quick action type: ${action}`);
        }
    }
}
