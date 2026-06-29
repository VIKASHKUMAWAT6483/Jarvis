export interface AppConfig {
    env: 'development' | 'production' | 'test';
    externalRoot: string;
    internalConfigRoot: string;
    tauriVersion: string;
}
export interface UserSession {
    sessionId: string;
    userId: string;
    createdAt: Date;
}
export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}
