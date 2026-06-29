import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { StorageManager } from '../packages/storage-manager/dist/index.js';
import { DatabaseManager } from '../packages/database-manager/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log("Initializing storage and database managers to write test log...");

const storage = new StorageManager({
  externalRoot: "/Volumes/HP P500/Jarvis",
  internalRoot: path.join(os.homedir(), 'Library', 'Application Support', 'Jarvis'),
  fs,
  path,
  os
});

const db = new DatabaseManager(storage, { fs, path });

try {
  db.initialize();
  console.log("Database connected successfully at:", db.getDatabaseFilePath());

  const testCommandInput = "jarvis --audit-sqlite-test-log";
  console.log(`Writing test command log: "${testCommandInput}"`);

  const cmdId = db.logCommand({
    user_input: testCommandInput,
    detected_intent: "AUDIT_TEST",
    tool_name: "test-log-writer",
    risk_level: "low",
    status: "success",
    summary: "Created programmatic test command to verify SQLite audit logger."
  });

  console.log(`✅ Success! Test command written with ID: ${cmdId}`);
  console.log("Check the Logs screen on your browser dashboard to verify it appears in the list.");
} catch (err: any) {
  console.error("❌ Failed to write log:", err.message);
}
