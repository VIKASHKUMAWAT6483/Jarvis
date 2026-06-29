import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { SafetyEngine } from './index.js';

describe('SafetyEngine Tests', () => {
  const safety = new SafetyEngine();

  test('1. Low Risk Command Classifications', () => {
    assert.equal(safety.classifyCommand('git status'), 'low');
    assert.equal(safety.classifyCommand('ls'), 'low');
    assert.equal(safety.classifyCommand('pwd'), 'low');
    assert.equal(safety.classifyCommand('flutter --version'), 'low');
    assert.equal(safety.classifyCommand('node --version'), 'low');

    const report = safety.analyzeCommand('git status');
    assert.equal(report.isBlocked, false);
    assert.equal(report.requiresApproval, false);
    assert.equal(report.requiresTypedConfirmation, false);
  });

  test('2. Medium Risk Command Classifications', () => {
    assert.equal(safety.classifyCommand('npm install'), 'medium');
    assert.equal(safety.classifyCommand('npm run build'), 'medium');
    assert.equal(safety.classifyCommand('flutter analyze'), 'medium');
    assert.equal(safety.classifyCommand('flutter build apk'), 'medium');

    const report = safety.analyzeCommand('npm install');
    assert.equal(report.isBlocked, false);
    assert.equal(report.requiresApproval, false);
    assert.equal(report.requiresTypedConfirmation, false);
  });

  test('3. High Risk Command Classifications & Approvals', () => {
    assert.equal(safety.classifyCommand('git commit -m "feat: logs"'), 'high');
    assert.equal(safety.classifyCommand('git push origin main'), 'high');
    assert.equal(safety.classifyCommand('firebase deploy'), 'high');
    assert.equal(safety.classifyCommand('send email to bob@example.com'), 'high');

    const report = safety.analyzeCommand('git commit');
    assert.equal(report.isBlocked, false);
    assert.equal(report.requiresApproval, true); // High risk requires approval
    assert.equal(report.requiresTypedConfirmation, false);
  });

  test('4. Critical Risk Command Classifications & Confirmations', () => {
    assert.equal(safety.classifyCommand('rm file.txt'), 'critical');
    assert.equal(safety.classifyCommand('unlink path/to/file'), 'critical');
    assert.equal(safety.classifyCommand('modify database schema alter table users'), 'critical');
    assert.equal(safety.classifyCommand('firebase deploy --only firestore:rules'), 'critical');
    assert.equal(safety.classifyCommand('fastlane build production release'), 'critical');

    const report = safety.analyzeCommand('rm test.log');
    assert.equal(report.isBlocked, false);
    assert.equal(report.requiresApproval, true);
    assert.equal(report.requiresTypedConfirmation, true); // Critical risk requires typed confirmation
  });

  test('5. Blocked Commands Security Barriers', () => {
    assert.equal(safety.isBlocked('rm -rf /'), true);
    assert.equal(safety.isBlocked('rm -rf *'), true);
    assert.equal(safety.isBlocked('sudo rm -rf configs'), true);
    assert.equal(safety.isBlocked('diskutil eraseDisk JHFS+ test /dev/disk2'), true);
    assert.equal(safety.isBlocked('git reset --hard HEAD'), true);
    assert.equal(safety.isBlocked('git push origin main --force'), true);
    assert.equal(safety.isBlocked('git push origin -f'), true);
    assert.equal(safety.isBlocked('firebase firestore:delete --all-collections'), true);
    assert.equal(safety.isBlocked('npm publish --access public'), true);

    // Exposing API keys or certificates
    assert.equal(safety.isBlocked('cat .env'), true);
    assert.equal(safety.isBlocked('cat path/to/private.key'), true);

    const report = safety.analyzeCommand('rm -rf /');
    assert.equal(report.isBlocked, true);
    assert.equal(report.riskLevel, 'blocked');
    assert.equal(report.requiresApproval, true);
  });

  test('6. Output Logs Sanitization & Redactions', () => {
    const rawGeminiKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
    const rawOpenAiKey = 'sk-proj-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';
    const jsonOutput = '{"password":"mypassword123","client_secret":"myclientsecret"}';
    const pemOutput = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';

    assert.equal(safety.sanitizeOutput(`Key: ${rawGeminiKey}`), 'Key: [REDACTED_GEMINI_API_KEY]');
    assert.equal(safety.sanitizeOutput(`Token: ${rawOpenAiKey}`), 'Token: [REDACTED_OPENAI_API_KEY]');
    assert.equal(safety.sanitizeOutput(jsonOutput), '{"password":"[REDACTED_SECRET]","client_secret":"[REDACTED_SECRET]"}');
    assert.equal(safety.sanitizeOutput(pemOutput), '[REDACTED_PRIVATE_KEY_BLOCK]');

    // Validate new specific secrets redactions
    assert.equal(safety.sanitizeOutput('sk-abcdefg12345'), '[REDACTED_OPENAI_API_KEY]');
    assert.equal(safety.sanitizeOutput('API_KEY=mysecretkey'), 'API_KEY=[REDACTED]');
    assert.equal(safety.sanitizeOutput('GOOGLE_API_KEY="mygoogleapikey"'), 'GOOGLE_API_KEY=[REDACTED]');
    assert.equal(safety.sanitizeOutput('FIREBASE_CONFIG_KEY=myfirebasekey'), 'FIREBASE_KEY=[REDACTED]');
    assert.equal(safety.sanitizeOutput('private_key=secretkeycontent'), 'private_key=[REDACTED]');
  });
});
