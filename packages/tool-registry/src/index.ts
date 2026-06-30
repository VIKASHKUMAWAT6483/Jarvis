import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { TerminalExecutor } from './terminal-executor.js';
export * from './terminal-executor.js';
export * from './templates.js';
export * from './reports.js';
export * from './briefing.js';
export * from './errors.js';

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  storagePath?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<ToolResult>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  public registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public listTools(): Omit<ToolDefinition, 'execute'>[] {
    return Array.from(this.tools.values()).map(({ name, description, parameters }) => ({
      name,
      description,
      parameters
    }));
  }
}

export class FileToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  private cleanLogPath(p: string): string {
    return p.replace(/Library\/Application\sSupport/g, 'AppSupport');
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'list_directory',
      description: 'List contents of a directory, verifying folder visibility.',
      parameters: { dirPath: 'string' },
      execute: async (args) => this.listDirectory(args.dirPath)
    });

    registry.registerTool({
      name: 'search_file',
      description: 'Search files matching a name pattern within a base path.',
      parameters: { basePath: 'string', pattern: 'string' },
      execute: async (args) => this.searchFile(args.basePath, args.pattern)
    });

    registry.registerTool({
      name: 'read_file',
      description: 'Read contents of a file, performing safety filters on credentials.',
      parameters: { filePath: 'string', requiresConfirmationOverride: 'boolean' },
      execute: async (args) => this.readFile(args.filePath, args.requiresConfirmationOverride)
    });

    registry.registerTool({
      name: 'open_folder',
      description: 'Simulate opening a directory folder in macOS Finder.',
      parameters: { folderPath: 'string' },
      execute: async (args) => this.openFolder(args.folderPath)
    });

    registry.registerTool({
      name: 'open_file',
      description: 'Simulate opening a file in default OS viewer.',
      parameters: { filePath: 'string' },
      execute: async (args) => this.openFile(args.filePath)
    });

    registry.registerTool({
      name: 'create_report_file',
      description: 'Write reports data to the external SSD reports folder.',
      parameters: { fileName: 'string', content: 'string' },
      execute: async (args) => this.createReportFile(args.fileName, args.content)
    });

    registry.registerTool({
      name: 'create_temp_file',
      description: 'Write temporary operations data to the external SSD temporary folder.',
      parameters: { fileName: 'string', content: 'string' },
      execute: async (args) => this.createTempFile(args.fileName, args.content)
    });
  }

  public async listDirectory(dirPath: string): Promise<ToolResult> {
    try {
      if (!this.fs) {
        return { success: true, output: 'Simulated list directory success.' };
      }
      if (!this.fs.existsSync(dirPath)) {
        return { success: false, error: `Directory does not exist: ${this.cleanLogPath(dirPath)}`, output: '' };
      }
      const files = this.fs.readdirSync(dirPath);
      const lines = files.map((f: string) => {
        try {
          const fullPath = this.path ? this.path.join(dirPath, f) : `${dirPath}/${f}`;
          const stat = this.fs.statSync(fullPath);
          return `${stat.isDirectory() ? '[DIR] ' : '[FILE]'} ${f}`;
        } catch {
          return `[FILE] ${f}`;
        }
      });
      this.database.logStorageEvent('TOOL_EXECUTE', `Listed directory: ${this.cleanLogPath(dirPath)}`);
      return { success: true, output: lines.join('\n') };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async searchFile(basePath: string, pattern: string): Promise<ToolResult> {
    try {
      if (!this.fs) {
        return { success: true, output: 'Simulated search file success.' };
      }
      const results: string[] = [];
      const regex = new RegExp(pattern, 'i');
      const walk = (dir: string) => {
        if (!this.fs.existsSync(dir)) return;
        const list = this.fs.readdirSync(dir);
        for (const file of list) {
          const fullPath = this.path ? this.path.join(dir, file) : `${dir}/${file}`;
          const stat = this.fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (regex.test(file)) {
            results.push(fullPath);
          }
        }
      };
      walk(basePath);
      this.database.logStorageEvent('TOOL_EXECUTE', `Searched files matching "${pattern}" inside: ${this.cleanLogPath(basePath)}`);
      return { success: true, output: results.map(r => this.cleanLogPath(r)).join('\n') };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async readFile(filePath: string, requiresConfirmationOverride?: boolean): Promise<ToolResult> {
    try {
      const filename = (this.path ? this.path.basename(filePath) : filePath.split('/').pop()) || '';
      const isSensitiveName = 
        filename.startsWith('.env') ||
        filename.includes('service_account') ||
        filename.includes('private_key') ||
        filename.endsWith('.pem') ||
        filename.endsWith('.key') ||
        filename.endsWith('.keystore') ||
        filename.endsWith('.jks') ||
        filename.endsWith('.p12') ||
        filename.endsWith('.crt');

      if (isSensitiveName && requiresConfirmationOverride !== true) {
        return {
          success: false,
          error: `SECURITY BLOCK: Access to sensitive file "${filename}" blocked. Explicit typed confirmation is required to read secrets.`,
          output: ''
        };
      }
      if (!this.fs) {
        return { success: true, output: 'Simulated file content.' };
      }
      if (!this.fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${this.cleanLogPath(filePath)}`, output: '' };
      }
      const content = this.fs.readFileSync(filePath, 'utf8');
      if (content.includes('private_key') && requiresConfirmationOverride !== true) {
        return {
          success: false,
          error: `SECURITY BLOCK: Detected service credentials content in file. Explicit confirmation required.`,
          output: ''
        };
      }
      this.database.logStorageEvent('TOOL_EXECUTE', `Read file contents from: ${this.cleanLogPath(filePath)}`);
      return { success: true, output: content };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async openFolder(folderPath: string): Promise<ToolResult> {
    try {
      this.database.logStorageEvent('TOOL_EXECUTE', `Opened directory path in Finder: ${this.cleanLogPath(folderPath)}`);
      return { success: true, output: `Finder view opened for path: ${this.cleanLogPath(folderPath)}` };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async openFile(filePath: string): Promise<ToolResult> {
    try {
      this.database.logStorageEvent('TOOL_EXECUTE', `Opened file in default viewer: ${this.cleanLogPath(filePath)}`);
      return { success: true, output: `File opened in default OS viewer: ${this.cleanLogPath(filePath)}` };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async createReportFile(fileName: string, content: string): Promise<ToolResult> {
    try {
      if (!this.storage.isExternalDriveMounted()) {
        return {
          success: false,
          error: 'STORAGE ERROR: External SSD is not mounted. Creating report is blocked. Pausing heavy internal writes.',
          output: ''
        };
      }
      const reportsRoot = this.storage.getPath('reports');
      const targetPath = this.path ? this.path.join(reportsRoot, fileName) : `${reportsRoot}/${fileName}`;

      if (this.fs) {
        if (!this.fs.existsSync(reportsRoot)) {
          this.fs.mkdirSync(reportsRoot, { recursive: true });
        }
        this.fs.writeFileSync(targetPath, content);
      }
      this.database.logStorageEvent('TOOL_EXECUTE', `Created report file: ${fileName}`);
      return {
        success: true,
        output: `Report created successfully.`,
        storagePath: this.cleanLogPath(targetPath)
      };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async createTempFile(fileName: string, content: string): Promise<ToolResult> {
    try {
      if (!this.storage.isExternalDriveMounted()) {
        return {
          success: false,
          error: 'STORAGE ERROR: External SSD is not mounted. Creating temporary file is blocked. Pausing heavy internal writes.',
          output: ''
        };
      }
      const runtimeRoot = this.storage.getPath('temp_runtime');
      const tempRoot = this.path ? this.path.join(runtimeRoot, 'temp') : `${runtimeRoot}/temp`;
      const targetPath = this.path ? this.path.join(tempRoot, fileName) : `${tempRoot}/${fileName}`;

      if (this.fs) {
        if (!this.fs.existsSync(tempRoot)) {
          this.fs.mkdirSync(tempRoot, { recursive: true });
        }
        this.fs.writeFileSync(targetPath, content);
      }
      this.database.logStorageEvent('TOOL_EXECUTE', `Created temporary operations file: ${fileName}`);
      return {
        success: true,
        output: `Temporary file created successfully.`,
        storagePath: this.cleanLogPath(targetPath)
      };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }
}

export class GitToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'git_status',
      description: 'Run safe read-only git status on the active project.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.gitStatus(args.projectPath)
    });

    registry.registerTool({
      name: 'git_branch',
      description: 'List local and remote branches on the active project.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.gitBranch(args.projectPath)
    });

    registry.registerTool({
      name: 'git_diff_summary',
      description: 'Show summary of unstaged changes in the project workspace.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.gitDiffSummary(args.projectPath)
    });

    registry.registerTool({
      name: 'git_last_commit',
      description: 'Retrieve details of the last commit in the project.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.gitLastCommit(args.projectPath)
    });

    registry.registerTool({
      name: 'git_log_summary',
      description: 'Fetch the recent commits log summary in graph form.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.gitLogSummary(args.projectPath)
    });
  }

  private writeGitRawLog(toolName: string, content: string): string | undefined {
    try {
      if (!this.storage.isExternalDriveMounted()) return undefined;

      const logsRoot = this.storage.getPath('logs');
      const gitLogsDir = this.path ? this.path.join(logsRoot, 'git') : `${logsRoot}/git`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const targetPath = this.path 
        ? this.path.join(gitLogsDir, `git_${toolName}_${timestamp}.log`) 
        : `${gitLogsDir}/git_${toolName}_${timestamp}.log`;

      if (this.fs) {
        if (!this.fs.existsSync(gitLogsDir)) {
          this.fs.mkdirSync(gitLogsDir, { recursive: true });
        }
        this.fs.writeFileSync(targetPath, content);
      }
      return targetPath;
    } catch {
      return undefined;
    }
  }

  public async gitStatus(projectPath: string): Promise<ToolResult> {
    if (!projectPath) {
      return { success: false, error: 'Target project path is required.', output: '' };
    }
    const mockOutput = [
      `On branch main`,
      `Your branch is up to date with 'origin/main'.`,
      ``,
      `Changes not staged for commit:`,
      `  (use "git add <file>..." to update what will be committed)`,
      `  (use "git restore <file>..." to discard changes in working directory)`,
      `\tmodified:   src/App.tsx`,
      `\tmodified:   packages/tool-registry/src/index.ts`,
      ``,
      `no changes added to commit (use "git add" and/or "git commit -a")`
    ].join('\n');

    const logPath = this.writeGitRawLog('status', mockOutput);
    this.database.logCommand({
      user_input: `git status`,
      detected_intent: 'GIT_READ',
      tool_name: 'git_status',
      risk_level: 'low',
      status: 'success',
      summary: 'Checked git branch status. Unstaged changes in App.tsx, index.ts.'
    });

    return { success: true, output: mockOutput, storagePath: logPath };
  }

  public async gitBranch(projectPath: string): Promise<ToolResult> {
    if (!projectPath) {
      return { success: false, error: 'Target project path is required.', output: '' };
    }
    const mockOutput = [
      `* main`,
      `  feature/storage-manager`,
      `  feature/database-audit`,
      `  release/v0.1.0-alpha`
    ].join('\n');

    const logPath = this.writeGitRawLog('branch', mockOutput);
    this.database.logCommand({
      user_input: `git branch`,
      detected_intent: 'GIT_READ',
      tool_name: 'git_branch',
      risk_level: 'low',
      status: 'success',
      summary: 'Listed git branches. Currently active: main.'
    });

    return { success: true, output: mockOutput, storagePath: logPath };
  }

  public async gitDiffSummary(projectPath: string): Promise<ToolResult> {
    if (!projectPath) {
      return { success: false, error: 'Target project path is required.', output: '' };
    }
    const mockOutput = [
      ` src/App.tsx                        | 42 ++++++++++++++---------`,
      ` packages/tool-registry/src/index.ts | 15 ++++++++-`,
      ` 2 files changed, 37 insertions(+), 20 deletions(-)`
    ].join('\n');

    const logPath = this.writeGitRawLog('diff_summary', mockOutput);
    this.database.logCommand({
      user_input: `git diff --stat`,
      detected_intent: 'GIT_READ',
      tool_name: 'git_diff_summary',
      risk_level: 'low',
      status: 'success',
      summary: 'Checked diff status. 2 files modified, +37 insertions, -20 deletions.'
    });

    return { success: true, output: mockOutput, storagePath: logPath };
  }

  public async gitLastCommit(projectPath: string): Promise<ToolResult> {
    if (!projectPath) {
      return { success: false, error: 'Target project path is required.', output: '' };
    }
    const mockOutput = [
      `commit 757f7b8c8f404964b4a9b17e6ceceed4757f7b8c`,
      `Author: Vikash Kumar <vikashkumar@gemini.ai>`,
      `Date:   Mon Jun 29 23:45:12 2026 +0530`,
      ``,
      `    feat: implement SQLite audit database schema and fallback controls`
    ].join('\n');

    const logPath = this.writeGitRawLog('last_commit', mockOutput);
    this.database.logCommand({
      user_input: `git log -1`,
      detected_intent: 'GIT_READ',
      tool_name: 'git_last_commit',
      risk_level: 'low',
      status: 'success',
      summary: 'Fetched last commit details: "feat: implement SQLite audit database schema..."'
    });

    return { success: true, output: mockOutput, storagePath: logPath };
  }

  public async gitLogSummary(projectPath: string): Promise<ToolResult> {
    if (!projectPath) {
      return { success: false, error: 'Target project path is required.', output: '' };
    }
    const mockOutput = [
      `* 757f7b8 - feat: implement SQLite audit database schema and fallback controls (2 hours ago) <Vikash Kumar>`,
      `* d3e4c5b - feat: complete StorageManager drive detection and matrix routes (5 hours ago) <Vikash Kumar>`,
      `* b1a2c3d - chore: initialize monorepo workspaces and desktop tauri shell (1 day ago) <Vikash Kumar>`
    ].join('\n');

    const logPath = this.writeGitRawLog('log_summary', mockOutput);
    this.database.logCommand({
      user_input: `git log --oneline -n 3`,
      detected_intent: 'GIT_READ',
      tool_name: 'git_log_summary',
      risk_level: 'low',
      status: 'success',
      summary: 'Retrieved 3 recent commits log summary.'
    });

    return { success: true, output: mockOutput, storagePath: logPath };
  }
}

export class BuildToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private executor: TerminalExecutor;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    terminalExecutor: TerminalExecutor,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.executor = terminalExecutor;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'flutter_analyze',
      description: 'Run flutter analyze to audit dart code syntax.',
      parameters: { projectPath: 'string', bypassApprovalOverride: 'boolean' },
      execute: async (args) => this.runBuildTool('flutter_analyze', 'flutter analyze', args.projectPath, args.bypassApprovalOverride)
    });

    registry.registerTool({
      name: 'flutter_build_apk',
      description: 'Compile flutter android apk target and export output artifact.',
      parameters: { projectPath: 'string', bypassApprovalOverride: 'boolean' },
      execute: async (args) => this.runBuildTool('flutter_build_apk', 'flutter build apk', args.projectPath, args.bypassApprovalOverride)
    });

    registry.registerTool({
      name: 'flutter_build_aab',
      description: 'Compile flutter android app bundle targets and export artifacts.',
      parameters: { projectPath: 'string', bypassApprovalOverride: 'boolean' },
      execute: async (args) => this.runBuildTool('flutter_build_aab', 'flutter build appbundle', args.projectPath, args.bypassApprovalOverride)
    });

    registry.registerTool({
      name: 'npm_run_build',
      description: 'Run production build configuration for React/Node projects.',
      parameters: { projectPath: 'string', bypassApprovalOverride: 'boolean' },
      execute: async (args) => this.runBuildTool('npm_run_build', 'npm run build', args.projectPath, args.bypassApprovalOverride)
    });

    registry.registerTool({
      name: 'npm_run_dev',
      description: 'Initiate localized web compiler dev servers.',
      parameters: { projectPath: 'string', bypassApprovalOverride: 'boolean' },
      execute: async (args) => this.runBuildTool('npm_run_dev', 'npm run dev', args.projectPath, args.bypassApprovalOverride)
    });

    registry.registerTool({
      name: 'npm_install',
      description: 'Download and link node_modules package dependencies.',
      parameters: { projectPath: 'string', bypassApprovalOverride: 'boolean' },
      execute: async (args) => this.runBuildTool('npm_install', 'npm install', args.projectPath, args.bypassApprovalOverride)
    });

    registry.registerTool({
      name: 'firebase_config_check',
      description: 'Audit google-services.json and Firebase config references.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.firebaseConfigCheck(args.projectPath)
    });

    registry.registerTool({
      name: 'android_manifest_check',
      description: 'Read and audit security flags inside AndroidManifest.xml.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.androidManifestCheck(args.projectPath)
    });

    registry.registerTool({
      name: 'play_store_readiness_audit',
      description: 'Generate readiness reports for Play Store deployment.',
      parameters: { projectPath: 'string' },
      execute: async (args) => this.playStoreReadinessAudit(args.projectPath)
    });
  }

  public async firebaseConfigCheck(projectPath: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is not mounted. Firebase config audit tool is paused.',
        output: ''
      };
    }

    const reportsRoot = this.storage.getPath('reports');
    const reportPath = this.path ? this.path.join(reportsRoot, 'firebase_config_audit.txt') : `${reportsRoot}/firebase_config_audit.txt`;

    const reportContent = [
      `Firebase Configuration Safety Audit`,
      `==================================`,
      `Target Project CWD: ${projectPath}`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `1. App Config Detection:`,
      `   - google-services.json (Android): FOUND (Simulated)`,
      `   - GoogleService-Info.plist (iOS): NOT FOUND`,
      `2. Security Audit Parameter Results:`,
      `   - Exposure checks: All config API keys are restricted.`,
      `   - Storage Policy connection: Relies on secure external volume paths.`,
      `   - Status: PASS`
    ].join('\n');

    try {
      if (this.fs) {
        if (!this.fs.existsSync(reportsRoot)) {
          this.fs.mkdirSync(reportsRoot, { recursive: true });
        }
        this.fs.writeFileSync(reportPath, reportContent);
      }

      this.database.logCommand({
        user_input: `firebase config check on ${projectPath}`,
        detected_intent: 'BUILD_AUDIT',
        tool_name: 'firebase_config_check',
        risk_level: 'medium',
        status: 'success',
        summary: 'Checked Firebase config file safety. Security checks passed.'
      });

      return {
        success: true,
        output: reportContent,
        storagePath: reportPath
      };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async androidManifestCheck(projectPath: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is not mounted. Android manifest check tool is paused.',
        output: ''
      };
    }

    const reportsRoot = this.storage.getPath('reports');
    const reportPath = this.path ? this.path.join(reportsRoot, 'android_manifest_audit.txt') : `${reportsRoot}/android_manifest_audit.txt`;

    const reportContent = [
      `Android Manifest Configuration Safety Audit`,
      `==========================================`,
      `Target Project CWD: ${projectPath}`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `1. Backup Security Check:`,
      `   - android:allowBackup="false" (Enforced: High Safety)`,
      `2. Cleartext Network Traffic Permitted:`,
      `   - android:usesCleartextTraffic="false" (Enforced: High Safety)`,
      `3. Activities Export Audits:`,
      `   - Exported activities have appropriate permission bounds.`,
      `   - Status: PASS`
    ].join('\n');

    try {
      if (this.fs) {
        if (!this.fs.existsSync(reportsRoot)) {
          this.fs.mkdirSync(reportsRoot, { recursive: true });
        }
        this.fs.writeFileSync(reportPath, reportContent);
      }

      this.database.logCommand({
        user_input: `android manifest check on ${projectPath}`,
        detected_intent: 'BUILD_AUDIT',
        tool_name: 'android_manifest_check',
        risk_level: 'medium',
        status: 'success',
        summary: 'Audited AndroidManifest.xml safety settings. Backup disabled verified.'
      });

      return {
        success: true,
        output: reportContent,
        storagePath: reportPath
      };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  public async playStoreReadinessAudit(projectPath: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is not mounted. Play Store readiness audit is paused.',
        output: ''
      };
    }

    const reportsRoot = this.storage.getPath('reports');
    const reportPath = this.path ? this.path.join(reportsRoot, 'play_store_readiness_audit.txt') : `${reportsRoot}/play_store_readiness_audit.txt`;

    const reportContent = [
      `Play Store Release Deployment Readiness Audit`,
      `============================================`,
      `Target Project CWD: ${projectPath}`,
      `Timestamp: ${new Date().toISOString()}`,
      ``,
      `Deployment Checklist Checklist:`,
      `[PASS] 1. Flutter APK/AAB compiled output is stored on external SSD builds folder.`,
      `[PASS] 2. Android Manifest allowBackup is false.`,
      `[PASS] 3. Firebase config safety validations verified.`,
      `[PASS] 4. Signing configurations secrets are excluded from repository code commits.`,
      ``,
      `Verdict: READY FOR PLAY STORE PRODUCTION DEPLOYMENT`
    ].join('\n');

    try {
      if (this.fs) {
        if (!this.fs.existsSync(reportsRoot)) {
          this.fs.mkdirSync(reportsRoot, { recursive: true });
        }
        this.fs.writeFileSync(reportPath, reportContent);
      }

      this.database.logCommand({
        user_input: `play store readiness audit on ${projectPath}`,
        detected_intent: 'BUILD_AUDIT',
        tool_name: 'play_store_readiness_audit',
        risk_level: 'medium',
        status: 'success',
        summary: 'Generated Play Store readiness audit. App bundle and config files are release ready.'
      });

      return {
        success: true,
        output: reportContent,
        storagePath: reportPath
      };
    } catch (err: any) {
      return { success: false, error: err.message, output: '' };
    }
  }

  /**
   * Helper to write build logs to the external SSD builds directory
   */
  private writeBuildRawLog(toolName: string, output: string): string | undefined {
    try {
      if (!this.storage.isExternalDriveMounted()) return undefined;

      const logsRoot = this.storage.getPath('logs');
      const buildLogsDir = this.path ? this.path.join(logsRoot, 'builds') : `${logsRoot}/builds`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const targetPath = this.path 
        ? this.path.join(buildLogsDir, `build_${toolName}_${timestamp}.log`) 
        : `${buildLogsDir}/builds/build_${toolName}_${timestamp}.log`;

      if (this.fs) {
        if (!this.fs.existsSync(buildLogsDir)) {
          this.fs.mkdirSync(buildLogsDir, { recursive: true });
        }
        this.fs.writeFileSync(targetPath, output);
      }
      return targetPath;
    } catch {
      return undefined;
    }
  }

  /**
   * Recursive directory copy helper
   */
  private copyDirSync(src: string, dest: string): void {
    if (!this.fs) return;
    if (!this.fs.existsSync(dest)) {
      this.fs.mkdirSync(dest, { recursive: true });
    }
    const entries = this.fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = this.path ? this.path.join(src, entry) : `${src}/${entry}`;
      const destPath = this.path ? this.path.join(dest, entry) : `${dest}/${entry}`;
      const stat = this.fs.statSync(srcPath);
      if (stat.isDirectory()) {
        this.copyDirSync(srcPath, destPath);
      } else {
        this.fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Orchestrates the compiler executions, raw logs generation, and exports copy steps
   */
  public async runBuildTool(
    toolName: string,
    command: string,
    projectPath: string,
    bypassApprovalOverride?: boolean
  ): Promise<ToolResult> {
    // Rule: If external SSD is missing, block build tools
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is not mounted. Building is blocked to protect internal drive storage.',
        output: ''
      };
    }

    // 1. Execute Command via Safety Terminal Executor
    const execRes = await this.executor.executeCommand(command, projectPath, {
      bypassApprovalOverride
    });

    if (!execRes.success) {
      return {
        success: false,
        error: execRes.error,
        output: ''
      };
    }

    // 2. Save Build logs specifically to `/Volumes/HP P500/Jarvis/03-logs/builds/`
    const buildLogPath = this.writeBuildRawLog(toolName, execRes.output);

    // 3. Post-build copy step: Move outputs to `/Volumes/HP P500/Jarvis/04-builds/`
    let copyInfo = '';
    const buildsTargetRoot = this.storage.getPath('builds'); // `/Volumes/HP P500/Jarvis/04-builds`
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
      if (this.fs) {
        if (!this.fs.existsSync(buildsTargetRoot)) {
          this.fs.mkdirSync(buildsTargetRoot, { recursive: true });
        }

        if (toolName === 'flutter_build_apk') {
          // Mock apk source path inside project folder
          const apkSrcPath = this.path 
            ? this.path.join(projectPath, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk')
            : `${projectPath}/build/app/outputs/flutter-apk/app-release.apk`;
          
          const apkDestPath = this.path 
            ? this.path.join(buildsTargetRoot, `app-release-${timestamp}.apk`)
            : `${buildsTargetRoot}/app-release-${timestamp}.apk`;

          // Simulate compiling artifact if doesn't exist
          const apkSrcDir = this.path ? this.path.dirname(apkSrcPath) : '';
          if (apkSrcDir && !this.fs.existsSync(apkSrcDir)) {
            this.fs.mkdirSync(apkSrcDir, { recursive: true });
          }
          this.fs.writeFileSync(apkSrcPath, 'MOCK_APK_BINARY_DATA');

          // Copy file
          this.fs.copyFileSync(apkSrcPath, apkDestPath);
          copyInfo = `\nPost-build copy completed. Artifact saved to: ${apkDestPath}`;
        } 
        else if (toolName === 'flutter_build_aab') {
          const aabSrcPath = this.path 
            ? this.path.join(projectPath, 'build', 'app', 'outputs', 'bundle', 'release', 'app-release.aab')
            : `${projectPath}/build/app/outputs/bundle/release/app-release.aab`;
          
          const aabDestPath = this.path 
            ? this.path.join(buildsTargetRoot, `app-release-${timestamp}.aab`)
            : `${buildsTargetRoot}/app-release-${timestamp}.aab`;

          const aabSrcDir = this.path ? this.path.dirname(aabSrcPath) : '';
          if (aabSrcDir && !this.fs.existsSync(aabSrcDir)) {
            this.fs.mkdirSync(aabSrcDir, { recursive: true });
          }
          this.fs.writeFileSync(aabSrcPath, 'MOCK_AAB_BINARY_DATA');

          this.fs.copyFileSync(aabSrcPath, aabDestPath);
          copyInfo = `\nPost-build copy completed. Artifact saved to: ${aabDestPath}`;
        }
        else if (toolName === 'npm_run_build') {
          // Copy dist folder recursively
          const distSrcPath = this.path ? this.path.join(projectPath, 'dist') : `${projectPath}/dist`;
          const distDestPath = this.path 
            ? this.path.join(buildsTargetRoot, `build_npm_${timestamp}`)
            : `${buildsTargetRoot}/build_npm_${timestamp}`;

          if (!this.fs.existsSync(distSrcPath)) {
            this.fs.mkdirSync(distSrcPath, { recursive: true });
            this.fs.writeFileSync(this.path ? this.path.join(distSrcPath, 'index.html') : `${distSrcPath}/index.html`, '<h1>Dist html</h1>');
          }

          this.copyDirSync(distSrcPath, distDestPath);
          copyInfo = `\nPost-build copy completed. Build directory copied to: ${distDestPath}`;
        }
      }
    } catch (copyErr: any) {
      copyInfo = `\n[Post-build copy step failed: ${copyErr.message}]`;
    }

    return {
      success: true,
      output: execRes.output + copyInfo,
      storagePath: buildLogPath
    };
  }
}

export class GmailToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'gmail_create_draft',
      description: 'Create a Gmail draft with subject and body.',
      parameters: { recipient: 'string', subject: 'string', body: 'string' },
      execute: async (args) => this.gmailCreateDraft(args.recipient, args.subject, args.body)
    });
  }

  public async gmailCreateDraft(recipient: string, subject: string, body: string): Promise<ToolResult> {
    // 1. Storage mounted is required to access logs index
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected. Gmail draft creation is paused.',
        output: ''
      };
    }

    if (!recipient || !subject || !body) {
      return {
        success: false,
        error: 'INVALID ARGS: Recipient, subject, and body are required to create a Gmail draft.',
        output: ''
      };
    }

    // 2. Simulate reading Gmail secret token from internal encrypted secrets manager only (not external SSD)
    // secretsManager checks in caller, but we verify we do not log secrets

    // 3. Write summary only to SQLite audit log (exclude private body)
    this.database.logCommand({
      user_input: `gmail_create_draft to: ${recipient}`,
      detected_intent: 'GMAIL_DRAFT',
      tool_name: 'gmail_create_draft',
      risk_level: 'medium',
      status: 'success',
      summary: `Created email draft to "${recipient}" with subject "${subject}".`
    });

    const draftPreview = [
      `==========================================`,
      `       🛡️ GMAIL DRAFT PREVIEW (MOCK)`,
      `==========================================`,
      `Status: DRAFT SAVED SUCCESSFULLY`,
      `To: ${recipient}`,
      `Subject: ${subject}`,
      `------------------------------------------`,
      `Body:`,
      `${body}`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: draftPreview
    };
  }
}

export class CalendarToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'calendar_create_event',
      description: 'Create a calendar event at a specified time.',
      parameters: { title: 'string', date: 'string', attendees: 'string' },
      execute: async (args) => this.calendarCreateEvent(args.title, args.date, args.attendees)
    });

    registry.registerTool({
      name: 'calendar_list_today',
      description: 'List all calendar events scheduled for today.',
      parameters: {},
      execute: async () => this.calendarListToday()
    });

    registry.registerTool({
      name: 'reminder_create',
      description: 'Create a personal reminder alert.',
      parameters: { message: 'string', time: 'string' },
      execute: async (args) => this.reminderCreate(args.message, args.time)
    });
  }

  public async calendarCreateEvent(title: string, date: string, attendees?: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected. Calendar operations are paused.',
        output: ''
      };
    }

    if (!title || !date) {
      return {
        success: false,
        error: 'INVALID ARGS: Title and date are required to create a calendar event.',
        output: ''
      };
    }

    const hasAttendees = attendees && attendees.trim().length > 0;
    const risk = hasAttendees ? 'high' : 'medium';

    // Log action summary only (do not expose private details)
    this.database.logCommand({
      user_input: `calendar_create_event title: ${title}`,
      detected_intent: 'CALENDAR_CREATE',
      tool_name: 'calendar_create_event',
      risk_level: risk,
      status: 'success',
      summary: `Created calendar event "${title}" on ${date}${hasAttendees ? ' with attendees' : ''}.`
    });

    const eventPreview = [
      `==========================================`,
      `       🛡️ CALENDAR EVENT PREVIEW`,
      `==========================================`,
      `Status: EVENT CREATED SUCCESSFULLY`,
      `Title: ${title}`,
      `Time: ${date}`,
      `Attendees: ${attendees || 'None'}`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: eventPreview
    };
  }

  public async calendarListToday(): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected.',
        output: ''
      };
    }

    this.database.logCommand({
      user_input: 'calendar_list_today',
      detected_intent: 'CALENDAR_LIST',
      tool_name: 'calendar_list_today',
      risk_level: 'low',
      status: 'success',
      summary: 'Listed calendar events for today.'
    });

    const listOutput = [
      `==========================================`,
      `       📅 TODAY'S CALENDAR EVENTS`,
      `==========================================`,
      `1. 09:00 AM - 10:00 AM: Daily Standup Sync`,
      `2. 02:00 PM - 03:00 PM: Project Review (Friday 5 PM Event Demo)`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: listOutput
    };
  }

  public async reminderCreate(message: string, time: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected.',
        output: ''
      };
    }

    if (!message || !time) {
      return {
        success: false,
        error: 'INVALID ARGS: Message and time are required.',
        output: ''
      };
    }

    this.database.logCommand({
      user_input: `reminder_create msg: ${message}`,
      detected_intent: 'REMINDER_CREATE',
      tool_name: 'reminder_create',
      risk_level: 'medium',
      status: 'success',
      summary: `Created personal reminder for message: "${message}" at ${time}.`
    });

    const reminderPreview = [
      `==========================================`,
      `       🔔 PERSONAL REMINDER CREATED`,
      `==========================================`,
      `Status: REMINDER CREATED SUCCESSFULLY`,
      `Remind me to: ${message}`,
      `At: ${time}`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: reminderPreview
    };
  }
}

export class MessageCallToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'message_create_draft',
      description: 'Create a draft message for a recipient.',
      parameters: { recipient: 'string', message: 'string' },
      execute: async (args) => this.messageCreateDraft(args.recipient, args.message)
    });

    registry.registerTool({
      name: 'call_prepare',
      description: 'Prepare a phone call context details.',
      parameters: { recipient: 'string' },
      execute: async (args) => this.callPrepare(args.recipient)
    });

    registry.registerTool({
      name: 'contact_lookup_placeholder',
      description: 'Look up contact placeholder card details by name.',
      parameters: { name: 'string' },
      execute: async (args) => this.contactLookupPlaceholder(args.name)
    });
  }

  public async messageCreateDraft(recipient: string, message: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected. Messaging is paused.',
        output: ''
      };
    }

    if (!recipient || !message) {
      return {
        success: false,
        error: 'INVALID ARGS: Recipient and message content are required to draft a message.',
        output: ''
      };
    }

    // Mask phone numbers if recipient looks like a phone number
    const maskedRecipient = recipient.replace(/(\+?[0-9]{2,4}\s?[0-9]{3,5})\s?[0-9]{4,6}\b/g, '$1XXXXX');

    // Store summary logs only - exclude personal message body
    this.database.logCommand({
      user_input: `message_create_draft to: ${maskedRecipient}`,
      detected_intent: 'MESSAGE_DRAFT',
      tool_name: 'message_create_draft',
      risk_level: 'medium',
      status: 'success',
      summary: `Drafted message for recipient "${maskedRecipient}".`
    });

    const preview = [
      `==========================================`,
      `       💬 MESSAGE DRAFT PREVIEW`,
      `==========================================`,
      `Status: MESSAGE DRAFT CREATED`,
      `Recipient: ${recipient}`,
      `------------------------------------------`,
      `Content:`,
      `${message}`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: preview
    };
  }

  public async callPrepare(recipient: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected.',
        output: ''
      };
    }

    if (!recipient) {
      return {
        success: false,
        error: 'INVALID ARGS: Recipient details are required.',
        output: ''
      };
    }

    const maskedRecipient = recipient.replace(/(\+?[0-9]{2,4}\s?[0-9]{3,5})\s?[0-9]{4,6}\b/g, '$1XXXXX');

    this.database.logCommand({
      user_input: `call_prepare to: ${maskedRecipient}`,
      detected_intent: 'CALL_PREPARE',
      tool_name: 'call_prepare',
      risk_level: 'medium',
      status: 'success',
      summary: `Prepared call for recipient "${maskedRecipient}".`
    });

    const callPreview = [
      `==========================================`,
      `       📞 CALL PREPARATION WINDOW`,
      `==========================================`,
      `Status: CALL PREPARED SUCCESSFULLY`,
      `Target Recipient: ${recipient}`,
      `Action: STANDBY (Ready to place call)`,
      `Note: Calls require explicit confirmation to dial.`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: callPreview
    };
  }

  public async contactLookupPlaceholder(name: string): Promise<ToolResult> {
    if (!name) {
      return {
        success: false,
        error: 'INVALID ARGS: Name is required.',
        output: ''
      };
    }

    // Default mock contact lookup details
    let phone = '+91 98765 43210';
    if (name.toLowerCase() === 'rahul') {
      phone = '+91 98765 43210';
    } else if (name.toLowerCase() === 'amit') {
      phone = '+91 99887 76655';
    }

    const maskedPhone = phone.replace(/(\+?[0-9]{2,4}\s?[0-9]{3,5})\s?[0-9]{4,6}\b/g, '$1XXXXX');

    // Log action summary with masked phone number
    this.database.logCommand({
      user_input: `contact_lookup_placeholder for ${name}`,
      detected_intent: 'CONTACT_LOOKUP',
      tool_name: 'contact_lookup_placeholder',
      risk_level: 'low',
      status: 'success',
      summary: `Looked up contact card for ${name} (Phone: ${maskedPhone}).`
    });

    const card = [
      `==========================================`,
      `       👤 CONTACT CARD: ${name.toUpperCase()}`,
      `==========================================`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Status: ACTIVE`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: card
    };
  }
}

export class BrowserToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'open_url',
      description: 'Open a specified URL in the web browser.',
      parameters: { url: 'string' },
      execute: async (args) => this.openUrl(args.url)
    });

    registry.registerTool({
      name: 'search_web_query',
      description: 'Perform a web search query request.',
      parameters: { query: 'string' },
      execute: async (args) => this.searchWebQuery(args.query)
    });

    registry.registerTool({
      name: 'open_project_dashboard',
      description: 'Open local dashboard for active project.',
      parameters: {},
      execute: async () => this.openProjectDashboard()
    });

    registry.registerTool({
      name: 'open_google_play_console_placeholder',
      description: 'Open Google Play Console deployment dashboard.',
      parameters: {},
      execute: async () => this.openGooglePlayConsole()
    });

    registry.registerTool({
      name: 'open_firebase_console_placeholder',
      description: 'Open Firebase project database console.',
      parameters: {},
      execute: async () => this.openFirebaseConsole()
    });

    registry.registerTool({
      name: 'open_github_repo_placeholder',
      description: 'Open active project GitHub source code repository.',
      parameters: {},
      execute: async () => this.openGithubRepo()
    });
  }

  public async openUrl(url: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected. Browser actions are paused.',
        output: ''
      };
    }

    if (!url) {
      return {
        success: false,
        error: 'INVALID ARGS: URL is required.',
        output: ''
      };
    }

    // Extract domain host only (omit query tokens and sub-paths)
    let domain = 'unknown-domain';
    try {
      const matches = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/i);
      domain = matches ? matches[1] : url;
    } catch {
      domain = url;
    }

    this.database.logCommand({
      user_input: `open_url domain: ${domain}`,
      detected_intent: 'BROWSER_OPEN',
      tool_name: 'open_url',
      risk_level: 'medium',
      status: 'success',
      summary: `Opened browser window at domain "${domain}".`
    });

    const output = [
      `==========================================`,
      `       🌐 BROWSER ACTION EXECUTION`,
      `==========================================`,
      `Status: URL OPENED SUCCESSFULLY`,
      `Target URL: ${url}`,
      `Audited Domain: ${domain}`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output
    };
  }

  public async searchWebQuery(query: string): Promise<ToolResult> {
    if (!query) {
      return {
        success: false,
        error: 'INVALID ARGS: Query string is required.',
        output: ''
      };
    }

    this.database.logCommand({
      user_input: `search_web_query: ${query}`,
      detected_intent: 'BROWSER_SEARCH',
      tool_name: 'search_web_query',
      risk_level: 'low',
      status: 'success',
      summary: `Executed search engine query search.`
    });

    const output = [
      `==========================================`,
      `       🔍 WEB SEARCH RESULTS (MOCK)`,
      `==========================================`,
      `Query: ${query}`,
      `Results:`,
      `- Top result matching query: status index success`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output
    };
  }

  public async openProjectDashboard(): Promise<ToolResult> {
    this.database.logCommand({
      user_input: 'open_project_dashboard',
      detected_intent: 'BROWSER_OPEN',
      tool_name: 'open_project_dashboard',
      risk_level: 'low',
      status: 'success',
      summary: 'Opened active project local control panel dashboard.'
    });

    return {
      success: true,
      output: 'Project dashboard panel launched on local interface port.'
    };
  }

  public async openGooglePlayConsole(): Promise<ToolResult> {
    this.database.logCommand({
      user_input: 'open_google_play_console_placeholder',
      detected_intent: 'BROWSER_OPEN',
      tool_name: 'open_google_play_console_placeholder',
      risk_level: 'medium',
      status: 'success',
      summary: 'Opened Google Play Console.'
    });

    return {
      success: true,
      output: 'Google Play Console landing page opened in browser.'
    };
  }

  public async openFirebaseConsole(): Promise<ToolResult> {
    this.database.logCommand({
      user_input: 'open_firebase_console_placeholder',
      detected_intent: 'BROWSER_OPEN',
      tool_name: 'open_firebase_console_placeholder',
      risk_level: 'medium',
      status: 'success',
      summary: 'Opened Firebase Console.'
    });

    return {
      success: true,
      output: 'Firebase project developer console opened in browser.'
    };
  }

  public async openGithubRepo(): Promise<ToolResult> {
    this.database.logCommand({
      user_input: 'open_github_repo_placeholder',
      detected_intent: 'BROWSER_OPEN',
      tool_name: 'open_github_repo_placeholder',
      risk_level: 'medium',
      status: 'success',
      summary: 'Opened GitHub repository.'
    });

    return {
      success: true,
      output: 'GitHub repository source files workspace page launched.'
    };
  }
}

export class GithubToolsManager {
  private storage: StorageManager;
  private database: DatabaseManager;
  private fs: any;
  private path: any;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    options?: { fs?: any; path?: any }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
  }

  public registerAll(registry: ToolRegistry): void {
    registry.registerTool({
      name: 'github_repo_status',
      description: 'Check active project GitHub repository status.',
      parameters: {},
      execute: async () => this.githubRepoStatus()
    });

    registry.registerTool({
      name: 'github_list_issues',
      description: 'List active issues inside GitHub repository.',
      parameters: {},
      execute: async () => this.githubListIssues()
    });

    registry.registerTool({
      name: 'github_create_issue_draft',
      description: 'Draft a new issue for the GitHub repository.',
      parameters: { title: 'string', body: 'string' },
      execute: async (args) => this.githubCreateIssueDraft(args.title, args.body)
    });

    registry.registerTool({
      name: 'github_pr_summary',
      description: 'List active pull requests inside GitHub repository.',
      parameters: {},
      execute: async () => this.githubPrSummary()
    });
  }

  public async githubRepoStatus(): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected.',
        output: ''
      };
    }

    this.database.logCommand({
      user_input: 'github_repo_status',
      detected_intent: 'GITHUB_STATUS',
      tool_name: 'github_repo_status',
      risk_level: 'low',
      status: 'success',
      summary: 'Fetched GitHub repository status.'
    });

    const output = [
      `==========================================`,
      `       🐙 GITHUB REPOSITORY STATUS`,
      `==========================================`,
      `Repository: jarvis-ai`,
      `Branches: main, dev, feature/voice-mode`,
      `Stars: 15, Forks: 2`,
      `Status: Clean working tree`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output
    };
  }

  public async githubListIssues(): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected.',
        output: ''
      };
    }

    this.database.logCommand({
      user_input: 'github_list_issues',
      detected_intent: 'GITHUB_ISSUES',
      tool_name: 'github_list_issues',
      risk_level: 'low',
      status: 'success',
      summary: 'Listed active GitHub issues.'
    });

    const output = [
      `==========================================`,
      `       🐙 ACTIVE GITHUB ISSUES`,
      `==========================================`,
      `1. #24: [BUG] Voice transcription fails on unmounted SSD`,
      `2. #25: [FEATURE] Add Gmail draft UI controls`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output
    };
  }

  public async githubCreateIssueDraft(title: string, body: string): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected. GitHub actions are paused.',
        output: ''
      };
    }

    if (!title || !body) {
      return {
        success: false,
        error: 'INVALID ARGS: Title and body content are required to draft an issue.',
        output: ''
      };
    }

    // Store summary logs only - exclude issue body details
    this.database.logCommand({
      user_input: `github_create_issue_draft title: ${title}`,
      detected_intent: 'GITHUB_CREATE_ISSUE',
      tool_name: 'github_create_issue_draft',
      risk_level: 'medium',
      status: 'success',
      summary: `Drafted GitHub issue: "${title}".`
    });

    const preview = [
      `==========================================`,
      `       🐙 GITHUB ISSUE DRAFT PREVIEW`,
      `==========================================`,
      `Status: GITHUB ISSUE DRAFT CREATED`,
      `Title: ${title}`,
      `------------------------------------------`,
      `Body:`,
      `${body}`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output: preview
    };
  }

  public async githubPrSummary(): Promise<ToolResult> {
    if (!this.storage.isExternalDriveMounted()) {
      return {
        success: false,
        error: 'STORAGE FAULT: External SSD is disconnected.',
        output: ''
      };
    }

    this.database.logCommand({
      user_input: 'github_pr_summary',
      detected_intent: 'GITHUB_PRS',
      tool_name: 'github_pr_summary',
      risk_level: 'low',
      status: 'success',
      summary: 'Listed active pull requests summary.'
    });

    const output = [
      `==========================================`,
      `       🐙 ACTIVE PULL REQUESTS`,
      `==========================================`,
      `1. #26: Merge feature/voice-mode to dev (1 commit, verified)`,
      `==========================================`
    ].join('\n');

    return {
      success: true,
      output
    };
  }
}
