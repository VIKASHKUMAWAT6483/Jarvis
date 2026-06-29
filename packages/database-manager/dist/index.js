export class DatabaseManager {
    storage;
    isConnected = false;
    fs;
    path;
    constructor(storageManager, options) {
        this.storage = storageManager;
        this.fs = options?.fs || null;
        this.path = options?.path || null;
    }
    /**
     * Initializes the audit database.
     * If external SSD is missing, fails and pauses logging.
     */
    initialize() {
        if (!this.storage.isExternalDriveMounted()) {
            this.isConnected = false;
            throw new Error('CRITICAL DATABASE FAULT: External SSD is not mounted. ' +
                'Database initialization aborted. Audit logging is paused.');
        }
        const internalRoot = this.storage.getInternalConfigRoot();
        const dbPath = this.getDatabaseFilePath();
        // 1. Create the internal pointer file db_config.json on the internal SSD
        const pointerFilePath = this.path ? this.path.join(internalRoot, 'db_config.json') : 'db_config.json';
        const configPointer = {
            database_path: dbPath,
            provider: 'SQLite',
            initialized_at: Date.now()
        };
        try {
            if (this.fs) {
                if (!this.fs.existsSync(internalRoot)) {
                    this.fs.mkdirSync(internalRoot, { recursive: true });
                }
                this.fs.writeFileSync(pointerFilePath, JSON.stringify(configPointer, null, 2));
                // 2. Initialize database file on external SSD if it doesn't exist
                const dbDir = this.path ? this.path.dirname(dbPath) : '';
                if (dbDir && !this.fs.existsSync(dbDir)) {
                    this.fs.mkdirSync(dbDir, { recursive: true });
                }
                if (!this.fs.existsSync(dbPath)) {
                    const emptySchema = {
                        commands: [],
                        approvals: [],
                        storage_events: [],
                        project_profiles: []
                    };
                    this.fs.writeFileSync(dbPath, JSON.stringify(emptySchema, null, 2));
                }
            }
            this.isConnected = true;
            this.logStorageEvent('DATABASE_INIT', 'Jarvis audit log SQLite database initialized on external SSD.');
            console.log(`Database connected at: ${dbPath}`);
        }
        catch (err) {
            this.isConnected = false;
            throw new Error(`Database connection failed: ${err.message}`);
        }
    }
    /**
     * Returns path to the database file on the external SSD
     */
    getDatabaseFilePath() {
        const dbRoot = this.storage.getPath('app_database');
        return this.path ? this.path.join(dbRoot, 'jarvis.sqlite') : `${dbRoot}/jarvis.sqlite`;
    }
    /**
     * Returns if the database is active and connected
     */
    isReady() {
        return this.isConnected && this.storage.isExternalDriveMounted();
    }
    /**
     * Safely reads the schema data from the database file
     */
    readDatabase() {
        if (!this.isReady()) {
            throw new Error('Database is offline. Operation blocked.');
        }
        const dbPath = this.getDatabaseFilePath();
        if (this.fs && this.fs.existsSync(dbPath)) {
            const raw = this.fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(raw);
        }
        return {
            commands: [],
            approvals: [],
            storage_events: [],
            project_profiles: []
        };
    }
    /**
     * Writes the schema data back to the database file
     */
    writeDatabase(data) {
        if (!this.isReady()) {
            throw new Error('Database is offline. Write blocked.');
        }
        const dbPath = this.getDatabaseFilePath();
        if (this.fs) {
            this.fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        }
    }
    /**
     * Inserts a record into the commands table
     */
    logCommand(record) {
        if (!this.isReady()) {
            console.warn('Logging paused: Database is disconnected.');
            return '';
        }
        const db = this.readDatabase();
        const id = `cmd_${Math.random().toString(36).substring(2, 11)}`;
        const newRecord = {
            ...record,
            id,
            timestamp: Date.now()
        };
        db.commands.push(newRecord);
        this.writeDatabase(db);
        return id;
    }
    /**
     * Inserts a record into the approvals table
     */
    logApproval(record) {
        if (!this.isReady())
            return '';
        const db = this.readDatabase();
        const id = `appr_${Math.random().toString(36).substring(2, 11)}`;
        const newRecord = {
            ...record,
            id,
            approved_at: Date.now()
        };
        db.approvals.push(newRecord);
        this.writeDatabase(db);
        return id;
    }
    /**
     * Inserts a record into the storage_events table
     */
    logStorageEvent(eventType, message) {
        // Ensure we don't recursive loop if database connection fails
        if (!this.isConnected && eventType !== 'DATABASE_INIT')
            return '';
        const db = this.readDatabase();
        const id = `se_${Math.random().toString(36).substring(2, 11)}`;
        const newRecord = {
            id,
            timestamp: Date.now(),
            event_type: eventType,
            message
        };
        db.storage_events.push(newRecord);
        this.writeDatabase(db);
        return id;
    }
    /**
     * Inserts a record into the project_profiles table
     */
    logProjectProfile(name, projectPath, type) {
        if (!this.isReady())
            return '';
        const db = this.readDatabase();
        const id = `proj_${Math.random().toString(36).substring(2, 11)}`;
        const now = Date.now();
        const newRecord = {
            id,
            project_name: name,
            project_path: projectPath,
            project_type: type,
            created_at: now,
            updated_at: now
        };
        db.project_profiles.push(newRecord);
        this.writeDatabase(db);
        return id;
    }
    /**
     * Retrieves all command audit logs
     */
    getCommands() {
        if (!this.isReady())
            return [];
        return this.readDatabase().commands;
    }
    /**
     * Retrieves all approvals
     */
    getApprovals() {
        if (!this.isReady())
            return [];
        return this.readDatabase().approvals;
    }
    /**
     * Retrieves all storage events
     */
    getStorageEvents() {
        if (!this.isReady())
            return [];
        return this.readDatabase().storage_events;
    }
    /**
     * Retrieves all project profiles
     */
    getProjectProfiles() {
        if (!this.isReady())
            return [];
        return this.readDatabase().project_profiles;
    }
    /**
     * Backs up the SQLite database to the dedicated backups directory
     */
    backupDatabase() {
        if (!this.isReady()) {
            throw new Error('Backup failed: Database is offline.');
        }
        const backupRoot = this.storage.getPath('database_backups');
        const dbPath = this.getDatabaseFilePath();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = this.path
            ? this.path.join(backupRoot, `jarvis_backup_${timestamp}.sqlite`)
            : `${backupRoot}/jarvis_backup_${timestamp}.sqlite`;
        if (this.fs) {
            if (!this.fs.existsSync(backupRoot)) {
                this.fs.mkdirSync(backupRoot, { recursive: true });
            }
            this.fs.copyFileSync(dbPath, backupPath);
            this.logStorageEvent('DATABASE_BACKUP', `Database backed up successfully to: ${backupPath}`);
        }
        return backupPath;
    }
}
