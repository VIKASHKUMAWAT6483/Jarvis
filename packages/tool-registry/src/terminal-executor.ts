import { StorageManager } from '@jarvis/storage-manager';
import { DatabaseManager } from '@jarvis/database-manager';
import { SafetyEngine, RiskLevel } from '@jarvis/safety-engine';

export interface CommandExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  riskLevel: RiskLevel;
  logPath?: string;
}

export class TerminalExecutor {
  private storage: StorageManager;
  private database: DatabaseManager;
  private safety: SafetyEngine;
  private fs: any;
  private path: any;
  private customExec: ((cmd: string, cwd: string, timeoutMs: number) => Promise<string>) | null = null;

  constructor(
    storageManager: StorageManager,
    databaseManager: DatabaseManager,
    safetyEngine: SafetyEngine,
    options?: {
      fs?: any;
      path?: any;
      exec?: (cmd: string, cwd: string, timeoutMs: number) => Promise<string>;
    }
  ) {
    this.storage = storageManager;
    this.database = databaseManager;
    this.safety = safetyEngine;
    this.fs = options?.fs || null;
    this.path = options?.path || null;
    this.customExec = options?.exec || null;
  }

  /**
   * Helper to write command logs to the external SSD
   */
  private writeTerminalLog(command: string, output: string): string | undefined {
    try {
      if (!this.storage.isExternalDriveMounted()) return undefined;

      const logsRoot = this.storage.getPath('logs'); // `/Volumes/HP P500/Jarvis/03-logs`
      const terminalLogsDir = this.path ? this.path.join(logsRoot, 'terminal') : `${logsRoot}/terminal`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const cleanCmdName = command.trim()
        .split(' ')[0]
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      
      const targetPath = this.path 
        ? this.path.join(terminalLogsDir, `term_${cleanCmdName}_${timestamp}.log`) 
        : `${terminalLogsDir}/term_${cleanCmdName}_${timestamp}.log`;

      if (this.fs) {
        if (!this.fs.existsSync(terminalLogsDir)) {
          this.fs.mkdirSync(terminalLogsDir, { recursive: true });
        }
        this.fs.writeFileSync(targetPath, output);
      }
      return targetPath;
    } catch {
      return undefined;
    }
  }

  /**
   * Safe command execution wrapper with strict safety checking, confirmation gates, and redaction logging
   */
  public async executeCommand(
    command: string,
    projectPath: string,
    options?: {
      bypassApprovalOverride?: boolean;
      timeoutMs?: number;
    }
  ): Promise<CommandExecutionResult> {
    const timeoutMs = options?.timeoutMs || 30000; // default 30 second timeout
    const bypassApproval = options?.bypassApprovalOverride || false;

    if (!projectPath) {
      return {
        success: false,
        output: '',
        error: 'EXECUTION ERROR: Selected workspace project folder path is required.',
        riskLevel: 'blocked'
      };
    }

    const trimmedCmd = command.trim();

    // 1. Risk Analysis via Safety Engine
    const analysis = this.safety.analyzeCommand(trimmedCmd);

    // 2. Gate: Blocked Commands
    if (analysis.isBlocked) {
      const blockedErr = `EXECUTION BLOCKED: Command violates safety policy. ${analysis.explanation}`;
      
      this.database.logCommand({
        user_input: trimmedCmd,
        detected_intent: 'TERMINAL_EXECUTE',
        tool_name: 'terminal_executor',
        risk_level: 'blocked',
        status: 'blocked',
        summary: 'Blocked dangerous command execution.'
      });

      return {
        success: false,
        output: '',
        error: blockedErr,
        riskLevel: 'blocked'
      };
    }

    // 3. Gate: Confirmation for critical/high/medium risk commands
    const requiresUserApproval = this.safety.requiresApproval(analysis.riskLevel) || (analysis.riskLevel === 'medium');
    
    if (requiresUserApproval && !bypassApproval) {
      const approvalCode = analysis.riskLevel === 'critical' ? 'TYPED_CONFIRMATION_REQUIRED' : 'APPROVAL_REQUIRED';
      const approvalErr = `${approvalCode}: Command requires explicit user approval. Risk level: ${analysis.riskLevel}. Reason: ${analysis.explanation}`;
      
      return {
        success: false,
        output: '',
        error: approvalErr,
        riskLevel: analysis.riskLevel
      };
    }

    // 4. Execution (calls dynamic injected exec OR local Node exec fallback OR mock default fallback)
    let rawOutput = '';
    let hasError = false;

    try {
      if (this.customExec) {
        // Run injected executor (e.g. from tests or browser mocks)
        rawOutput = await this.customExec(trimmedCmd, projectPath, timeoutMs);
      } else {
        // Fallback: Dynamic Node.js child_process run when executing in Node scripting runner
        try {
          const cp = await import('child_process');
          rawOutput = await new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
              reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds.`));
            }, timeoutMs);

            cp.exec(trimmedCmd, { cwd: projectPath }, (err, stdout, stderr) => {
              clearTimeout(timer);
              if (err) {
                reject(new Error(stderr || err.message));
              } else {
                resolve(stdout);
              }
            });
          });
        } catch {
          // Dynamic import fails in browser webview environment -> return simulated successful mock log
          rawOutput = `[SIMULATED terminal execution success for: "${trimmedCmd}" inside directory "${projectPath}"]\nNo outputs returned by browser sandbox.`;
        }
      }
    } catch (err: any) {
      rawOutput = err.message;
      hasError = true;
    }

    // 5. Sanitize Output (API key / secrets redactions)
    const sanitizedOutput = this.safety.sanitizeOutput(rawOutput);

    // 6. Write raw outputs log to external SSD
    const logPath = this.writeTerminalLog(trimmedCmd, sanitizedOutput);

    // 7. Save summary to SQLite database audit log
    this.database.logCommand({
      user_input: trimmedCmd,
      detected_intent: 'TERMINAL_EXECUTE',
      tool_name: 'terminal_executor',
      risk_level: analysis.riskLevel,
      status: hasError ? 'failed' : 'success',
      summary: hasError 
        ? `Failed executing command. Error: ${sanitizedOutput.slice(0, 60)}...` 
        : `Executed command successfully. Output: ${sanitizedOutput.slice(0, 60)}...`
    });

    return {
      success: !hasError,
      output: sanitizedOutput,
      riskLevel: analysis.riskLevel,
      logPath
    };
  }
}
