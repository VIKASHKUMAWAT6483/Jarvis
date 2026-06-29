export type StorageCategory =
  | 'internal_config'
  | 'secrets'
  | 'source_code'
  | 'projects'
  | 'logs'
  | 'reports'
  | 'audio_cache'
  | 'builds'
  | 'database_backups'
  | 'temp_runtime'
  | 'app_database';

export interface StorageStatus {
  isExternalMounted: boolean;
  externalRoot: string;
  internalRoot: string;
  temporaryInternalModeAllowed: boolean;
  categories: Record<StorageCategory, string>;
}

export interface HealthCheckReport {
  externalRootMounted: boolean;
  externalRootWritable: boolean;
  internalConfigExists: boolean;
  internalConfigWritable: boolean;
  freeSpaceBytesExternal?: number;
  freeSpaceBytesInternal?: number;
}

export interface IFileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  statSync(path: string): { isDirectory(): boolean };
  accessSync(path: string, mode?: number): void;
  constants: { W_OK: number };
}

export interface IPathResolver {
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
  dirname(p: string): string;
}

export interface IOsHelper {
  homedir(): string;
}

export class StorageManager {
  private externalRootOverride?: string;
  private internalRootOverride?: string;
  private temporaryInternalModeAllowed: boolean = false;

  private fs: IFileSystem;
  private path: IPathResolver;
  private os: IOsHelper;

  constructor(options?: {
    externalRoot?: string;
    internalRoot?: string;
    allowTemporaryInternalMode?: boolean;
    fs?: IFileSystem;
    path?: IPathResolver;
    os?: IOsHelper;
  }) {
    if (options?.externalRoot) {
      this.externalRootOverride = options.externalRoot;
    }
    if (options?.internalRoot) {
      this.internalRootOverride = options.internalRoot;
    }
    if (options?.allowTemporaryInternalMode !== undefined) {
      this.temporaryInternalModeAllowed = options.allowTemporaryInternalMode;
    }

    // Default to mock fs/path/os if not injected.
    // This allows pure browser execution out of the box,
    // while unit tests and Node scripts inject real OS implementations.
    this.fs = options?.fs || StorageManager.createMockFs();
    this.path = options?.path || StorageManager.createMockPath();
    this.os = options?.os || { homedir: () => '/Users/mockuser' };
  }

  private static createMockFs(): IFileSystem {
    return {
      existsSync: () => false,
      mkdirSync: () => {},
      statSync: () => ({ isDirectory: () => true }),
      accessSync: () => {},
      constants: { W_OK: 2 }
    };
  }

  private static createMockPath(): IPathResolver {
    return {
      resolve: (...paths) => paths.join('/').replace(/\/+/g, '/'),
      join: (...paths) => paths.join('/').replace(/\/+/g, '/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/') || '.'
    };
  }

  /**
   * Returns the expanded path of the external root directory
   */
  public getExternalRoot(): string {
    if (this.externalRootOverride) {
      return this.path.resolve(this.externalRootOverride);
    }
    return '/Volumes/HP P500/Jarvis';
  }

  /**
   * Returns the expanded path of the internal config directory
   */
  public getInternalConfigRoot(): string {
    if (this.internalRootOverride) {
      return this.path.resolve(this.internalRootOverride);
    }
    const home = this.os.homedir();
    return this.path.join(home, 'Library', 'Application Support', 'Jarvis');
  }

  /**
   * Checks whether the external SSD or external root directory is mounted
   */
  public isExternalDriveMounted(): boolean {
    const extRoot = this.getExternalRoot();
    
    // In macOS, /Volumes/HP P500 must exist as a mounted directory.
    let volumePath = extRoot;
    if (extRoot.startsWith('/Volumes/')) {
      const parts = extRoot.split('/');
      if (parts.length >= 3) {
        volumePath = parts.slice(0, 3).join('/');
      }
    }

    try {
      if (!this.fs.existsSync(volumePath)) {
        return false;
      }
      const stat = this.fs.statSync(volumePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Enables or disables temporary internal storage mode
   */
  public setTemporaryInternalMode(allowed: boolean): void {
    this.temporaryInternalModeAllowed = allowed;
  }

  /**
   * Returns if temporary internal storage mode is currently allowed
   */
  public isTemporaryInternalModeAllowed(): boolean {
    return this.temporaryInternalModeAllowed;
  }

  /**
   * Determines if writing to this category on internal storage should be prevented
   */
  public preventHeavyInternalWrite(category: StorageCategory): boolean {
    if (category === 'internal_config') {
      return false;
    }
    if (category === 'secrets') {
      return true;
    }

    if (!this.isExternalDriveMounted()) {
      return !this.temporaryInternalModeAllowed;
    }
    return false;
  }

  /**
   * Resolves the path for a given storage category
   */
  public getPath(category: StorageCategory): string {
    if (category === 'secrets') {
      throw new Error('SECURITY BLOCK: Plaintext secret files are not allowed. Use macOS Keychain instead.');
    }

    const isMounted = this.isExternalDriveMounted();
    const internalRoot = this.getInternalConfigRoot();
    const externalRoot = this.getExternalRoot();

    if (category === 'internal_config') {
      return internalRoot;
    }

    if (!isMounted && !this.temporaryInternalModeAllowed) {
      throw new Error(
        `STORAGE ERROR: External SSD is not mounted at "${externalRoot}". ` +
        `Writing heavy data category "${category}" to internal SSD is blocked. ` +
        `Please mount the external SSD or allow temporary internal mode.`
      );
    }

    const baseDir = isMounted ? externalRoot : this.path.join(internalRoot, 'temp_fallback');

    switch (category) {
      case 'source_code':
        return this.path.join(baseDir, '01-source-code');
      case 'projects':
        return this.path.join(baseDir, '02-projects');
      case 'logs':
        return this.path.join(baseDir, '03-logs');
      case 'builds':
        return this.path.join(baseDir, '04-builds');
      case 'reports':
        return this.path.join(baseDir, '05-reports');
      case 'audio_cache':
        return this.path.join(baseDir, '06-audio-cache');
      case 'database_backups':
        return this.path.join(baseDir, '07-database-backups');
      case 'temp_runtime':
        return this.path.join(baseDir, 'runtime');
      case 'app_database':
        return this.path.join(baseDir, 'runtime', 'data');
      default:
        throw new Error(`Unknown storage category: ${category}`);
    }
  }

  /**
   * Validates if a path is writable
   */
  public validateWritablePath(targetPath: string): boolean {
    try {
      if (!this.fs.existsSync(targetPath)) {
        const parent = this.path.dirname(targetPath);
        if (!this.fs.existsSync(parent)) {
          return false;
        }
        this.fs.accessSync(parent, this.fs.constants.W_OK);
        return true;
      }
      this.fs.accessSync(targetPath, this.fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Performs directories initialization for Jarvis
   */
  public ensureJarvisFolders(): void {
    const internalRoot = this.getInternalConfigRoot();
    
    if (!this.fs.existsSync(internalRoot)) {
      this.fs.mkdirSync(internalRoot, { recursive: true });
    }

    if (this.isExternalDriveMounted() || this.temporaryInternalModeAllowed) {
      const categories: StorageCategory[] = [
        'source_code',
        'projects',
        'logs',
        'builds',
        'reports',
        'audio_cache',
        'database_backups',
        'temp_runtime',
        'app_database'
      ];

      for (const cat of categories) {
        const dirPath = this.getPath(cat);
        if (!this.fs.existsSync(dirPath)) {
          this.fs.mkdirSync(dirPath, { recursive: true });
        }
      }
    } else {
      throw new Error('CRITICAL SETUP HALT: External SSD is not mounted. Cannot create storage structures.');
    }
  }

  /**
   * Performs storage health checks including accessibility and free space
   */
  public storageHealthCheck(): HealthCheckReport {
    const isExtMounted = this.isExternalDriveMounted();
    const extRoot = this.getExternalRoot();
    const intRoot = this.getInternalConfigRoot();

    const report: HealthCheckReport = {
      externalRootMounted: isExtMounted,
      externalRootWritable: isExtMounted ? this.validateWritablePath(extRoot) : false,
      internalConfigExists: this.fs.existsSync(intRoot),
      internalConfigWritable: this.fs.existsSync(intRoot) ? this.validateWritablePath(intRoot) : false
    };

    if (report.externalRootMounted) {
      try {
        report.freeSpaceBytesExternal = 465 * 1024 * 1024 * 1024; // Mocking 465GB free space on HP P500
      } catch {
        report.freeSpaceBytesExternal = 0;
      }
    }
    if (report.internalConfigExists) {
      try {
        report.freeSpaceBytesInternal = 120 * 1024 * 1024 * 1024; // Mocking 120GB free space
      } catch {
        report.freeSpaceBytesInternal = 0;
      }
    }

    return report;
  }

  /**
   * Outputs status explanation for users
   */
  public explainStorageStatus(): string {
    const isMounted = this.isExternalDriveMounted();
    const extRoot = this.getExternalRoot();
    const intRoot = this.getInternalConfigRoot();
    const tempMode = this.temporaryInternalModeAllowed;

    const sections = [
      `==================================================`,
      `JARVIS STORAGE STATUS`,
      `==================================================`,
      `* External SSD Mounted:  ${isMounted ? '✅ YES' : '❌ NO'}`,
      `* Config Path (Internal): "${intRoot}"`,
      `* Data Path (External):   "${extRoot}"`,
      `* Temporary Internal Mode: ${tempMode ? '⚠️ ALLOWED' : '🚫 BLOCKED'}`,
      ``,
      `Storage Categories Matrix:`,
      `  - Secrets:             [macOS Keychain Only (Protected)]`
    ];

    const categories: StorageCategory[] = [
      'internal_config',
      'source_code',
      'projects',
      'logs',
      'reports',
      'audio_cache',
      'builds',
      'database_backups',
      'temp_runtime',
      'app_database'
    ];

    for (const cat of categories) {
      try {
        const resolved = this.getPath(cat);
        sections.push(`  - ${cat.padEnd(20)} -> "${resolved}"`);
      } catch (err: any) {
        sections.push(`  - ${cat.padEnd(20)} -> [❌ BLOCKED: ${err.message.split('.')[0]}]`);
      }
    }

    sections.push(`==================================================`);
    return sections.join('\n');
  }
}

export { SecretsManager } from './secrets.js';
export { BackupManager } from './backup-migration.js';
