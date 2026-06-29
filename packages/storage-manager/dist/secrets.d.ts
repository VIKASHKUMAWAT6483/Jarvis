import { StorageManager } from './index.js';
export declare class SecretsManager {
    private storage;
    private fs;
    private path;
    private encryptionKey;
    constructor(storage: StorageManager, options?: {
        fs?: any;
        path?: any;
    });
    private getSecretsFilePath;
    /**
     * Encrypts plaintext string securely (with browser base64 fallback)
     */
    private encrypt;
    /**
     * Decrypts ciphertext string securely
     */
    private decrypt;
    /**
     * Reads all secrets from the encrypted store
     */
    getAllSecrets(): Record<string, string>;
    /**
     * Saves all secrets to the encrypted store
     */
    saveAllSecrets(secrets: Record<string, string>): void;
    /**
     * Sets a specific secret key
     */
    setSecret(key: string, value: string): void;
    /**
     * Retrieves a specific secret key
     */
    getSecret(key: string): string | null;
    /**
     * Deletes a specific secret key
     */
    deleteSecret(key: string): void;
}
