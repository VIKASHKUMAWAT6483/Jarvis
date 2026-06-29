import * as crypto from 'crypto';
import { StorageManager } from './index.js';

export class SecretsManager {
  private storage: StorageManager;
  private fs: any;
  private path: any;
  private encryptionKey: Buffer | null = null;

  constructor(storage: StorageManager, options?: { fs?: any; path?: any }) {
    this.storage = storage;
    this.fs = options?.fs || null;
    this.path = options?.path || null;

    // Initialize key in Node context
    if (typeof crypto !== 'undefined' && crypto.createHash) {
      const machineSalt = 'jarvis-secure-salt-9831';
      const hash = crypto.createHash('sha256');
      hash.update(machineSalt);
      this.encryptionKey = hash.digest();
    }
  }

  private getSecretsFilePath(): string {
    const internalRoot = this.storage.getInternalConfigRoot();
    return this.path ? this.path.join(internalRoot, 'secrets.enc') : `${internalRoot}/secrets.enc`;
  }

  /**
   * Encrypts plaintext string securely (with browser base64 fallback)
   */
  private encrypt(text: string): string {
    if (!crypto || !crypto.createCipheriv || !this.encryptionKey) {
      // Browser fallback (base64 obfuscation)
      if (typeof btoa !== 'undefined') {
        return `obf:${btoa(unescape(encodeURIComponent(text)))}`;
      }
      return `obf:${Buffer.from(text).toString('base64')}`;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext string securely
   */
  private decrypt(ciphertext: string): string {
    if (ciphertext.startsWith('obf:')) {
      const base64Data = ciphertext.substring(4);
      if (typeof atob !== 'undefined') {
        return decodeURIComponent(escape(atob(base64Data)));
      }
      return Buffer.from(base64Data, 'base64').toString('utf8');
    }

    if (!crypto || !crypto.createDecipheriv || !this.encryptionKey) {
      throw new Error('Secure decryption engine is unavailable in this runtime context.');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format.');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Reads all secrets from the encrypted store
   */
  public getAllSecrets(): Record<string, string> {
    const filePath = this.getSecretsFilePath();
    if (!this.fs || !this.fs.existsSync(filePath)) {
      return {};
    }
    try {
      const encryptedContent = this.fs.readFileSync(filePath, 'utf8');
      if (!encryptedContent) return {};
      const decryptedJson = this.decrypt(encryptedContent);
      return JSON.parse(decryptedJson);
    } catch (e) {
      return {};
    }
  }

  /**
   * Saves all secrets to the encrypted store
   */
  public saveAllSecrets(secrets: Record<string, string>): void {
    const filePath = this.getSecretsFilePath();
    const internalRoot = this.storage.getInternalConfigRoot();
    
    if (this.fs) {
      if (!this.fs.existsSync(internalRoot)) {
        this.fs.mkdirSync(internalRoot, { recursive: true });
      }
      const jsonStr = JSON.stringify(secrets);
      const encryptedContent = this.encrypt(jsonStr);
      this.fs.writeFileSync(filePath, encryptedContent, 'utf8');
    }
  }

  /**
   * Sets a specific secret key
   */
  public setSecret(key: string, value: string): void {
    const secrets = this.getAllSecrets();
    secrets[key] = value;
    this.saveAllSecrets(secrets);
  }

  /**
   * Retrieves a specific secret key
   */
  public getSecret(key: string): string | null {
    const secrets = this.getAllSecrets();
    return secrets[key] || null;
  }

  /**
   * Deletes a specific secret key
   */
  public deleteSecret(key: string): void {
    const secrets = this.getAllSecrets();
    if (secrets[key]) {
      delete secrets[key];
      this.saveAllSecrets(secrets);
    }
  }
}
