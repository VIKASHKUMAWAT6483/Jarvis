import { StorageManager } from '@jarvis/storage-manager';

export interface CommandRecord {
  id: string;
  timestamp: number;
  user_input: string;
  detected_intent: string;
  tool_name: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | 'blocked';
  status: 'success' | 'failed' | 'blocked' | 'pending';
  summary: string;
}

export interface ApprovalRecord {
  id: string;
  command_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | 'blocked';
  approval_status: 'approved' | 'rejected' | 'pending';
  approved_at: number;
}

export interface StorageEventRecord {
  id: string;
  timestamp: number;
  event_type: string;
  message: string;
}

export interface ProjectProfileRecord {
  id: string;
  project_name: string;
  project_path: string;
  project_type: string;
  created_at: number;
  updated_at: number;
}

export interface DatabaseSchema {
  commands: CommandRecord[];
  approvals: ApprovalRecord[];
  storage_events: StorageEventRecord[];
  project_profiles: ProjectProfileRecord[];
}

export class DatabaseManager {
  private storage: StorageManager;
  private isConnected: boolean = false;
  private fs: any;
  private path: any;

  constructor(storageManager: StorageManager, options?: { fs?: any; path?: any }) {
    this.storage = storageManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  /**
   * Initializes the audit database.
   * If external SSD is missing, fails and pauses logging.
   */
  public initialize(): void {
    if (!this.storage.isExternalDriveMounted()) {
      this.isConnected = false;
      throw new Error(
        'CRITICAL DATABASE FAULT: External SSD is not mounted. ' +
        'Database initialization aborted. Audit logging is paused.'
      );
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
          const emptySchema: DatabaseSchema = {
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
    } catch (err: any) {
      this.isConnected = false;
      throw new Error(`Database connection failed: ${err.message}`);
    }
  }

  /**
   * Returns path to the database file on the external SSD
   */
  public getDatabaseFilePath(): string {
    const dbRoot = this.storage.getPath('app_database');
    return this.path ? this.path.join(dbRoot, 'jarvis.sqlite') : `${dbRoot}/jarvis.sqlite`;
  }

  /**
   * Returns if the database is active and connected
   */
  public isReady(): boolean {
    return this.isConnected && this.storage.isExternalDriveMounted();
  }

  /**
   * Safely reads the schema data from the database file
   */
  private readDatabase(): DatabaseSchema {
    if (!this.isReady()) {
      throw new Error('Database is offline. Operation blocked.');
    }

    const dbPath = this.getDatabaseFilePath();
    if (this.fs && this.fs.existsSync(dbPath)) {
      const raw = this.fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(raw) as DatabaseSchema;
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
  private writeDatabase(data: DatabaseSchema): void {
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
  public logCommand(record: Omit<CommandRecord, 'id' | 'timestamp'>): string {
    if (!this.isReady()) {
      console.warn('Logging paused: Database is disconnected.');
      return '';
    }

    const db = this.readDatabase();
    const id = `cmd_${Math.random().toString(36).substring(2, 11)}`;
    const newRecord: CommandRecord = {
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
  public logApproval(record: Omit<ApprovalRecord, 'id' | 'approved_at'>): string {
    if (!this.isReady()) return '';

    const db = this.readDatabase();
    const id = `appr_${Math.random().toString(36).substring(2, 11)}`;
    const newRecord: ApprovalRecord = {
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
  public logStorageEvent(eventType: string, message: string): string {
    // Ensure we don't recursive loop if database connection fails
    if (!this.isConnected && eventType !== 'DATABASE_INIT') return '';

    const db = this.readDatabase();
    const id = `se_${Math.random().toString(36).substring(2, 11)}`;
    const newRecord: StorageEventRecord = {
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
  public logProjectProfile(name: string, projectPath: string, type: string): string {
    if (!this.isReady()) return '';

    const db = this.readDatabase();
    const id = `proj_${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();
    const newRecord: ProjectProfileRecord = {
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
  public getCommands(): CommandRecord[] {
    if (!this.isReady()) return [];
    return this.readDatabase().commands;
  }

  /**
   * Retrieves all approvals
   */
  public getApprovals(): ApprovalRecord[] {
    if (!this.isReady()) return [];
    return this.readDatabase().approvals;
  }

  /**
   * Retrieves all storage events
   */
  public getStorageEvents(): StorageEventRecord[] {
    if (!this.isReady()) return [];
    return this.readDatabase().storage_events;
  }

  /**
   * Retrieves all project profiles
   */
  public getProjectProfiles(): ProjectProfileRecord[] {
    if (!this.isReady()) return [];
    return this.readDatabase().project_profiles;
  }

  /**
   * Backs up the SQLite database to the dedicated backups directory
   */
  public backupDatabase(): string {
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
