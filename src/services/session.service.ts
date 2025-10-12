/**
 * Session Service
 *
 * Handles server-side session tracking and management.
 * Tracks concurrent sessions, session revocation, and activity monitoring.
 */

import logger from '../utils/logger';
import { redisClient } from '../config/redis';

interface SessionInfo {
  sessionId: string;
  userId: string;
  tokenId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  userSessions: Map<string, number>;
}

/**
 * Session Service Class
 */
export class SessionService {
  private sessions: Map<string, SessionInfo> = new Map(); // sessionId -> SessionInfo
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> Set<sessionId>
  private tokenSessions: Map<string, string> = new Map(); // tokenId -> sessionId
  private maxSessionsPerUser: number = 5;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes in milliseconds

  constructor() {
    logger.info('[SessionService] Initialized');

    // Start periodic cleanup of expired sessions
    this.startCleanupInterval();
  }

  /**
   * Create a new session
   *
   * @param userId - User ID
   * @param tokenId - Token ID (from JWT jti claim)
   * @param metadata - Optional session metadata
   * @returns Session ID
   */
  createSession(
    userId: string,
    tokenId: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ): string {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      tokenId,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.sessionTimeout),
    };

    // Store session
    this.sessions.set(sessionId, sessionInfo);
    this.tokenSessions.set(tokenId, sessionId);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    // Enforce max sessions per user
    this.enforceSessionLimit(userId);

    logger.info({
      sessionId,
      userId,
      ipAddress: metadata?.ipAddress,
    }, '[SessionService] Session created');

    // Store in Redis for distributed session management (if available)
    this.storeSessionInRedis(sessionInfo).catch((error) => {
      logger.warn({ error }, '[SessionService] Failed to store session in Redis');
    });

    return sessionId;
  }

  /**
   * Get session by ID
   *
   * @param sessionId - Session ID
   * @returns Session info or null
   */
  getSession(sessionId: string): SessionInfo | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.revokeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get session by token ID
   *
   * @param tokenId - Token ID
   * @returns Session info or null
   */
  getSessionByToken(tokenId: string): SessionInfo | null {
    const sessionId = this.tokenSessions.get(tokenId);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  /**
   * Update session activity
   *
   * @param sessionId - Session ID
   * @returns True if session updated
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    const now = new Date();
    session.lastActivity = now;
    session.expiresAt = new Date(now.getTime() + this.sessionTimeout);

    logger.debug({ sessionId }, '[SessionService] Session activity updated');

    // Update in Redis
    this.storeSessionInRedis(session).catch((error) => {
      logger.warn({ error }, '[SessionService] Failed to update session in Redis');
    });

    return true;
  }

  /**
   * Revoke a session
   *
   * @param sessionId - Session ID
   */
  revokeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    // Remove from all tracking maps
    this.sessions.delete(sessionId);
    this.tokenSessions.delete(session.tokenId);
    this.userSessions.get(session.userId)?.delete(sessionId);

    logger.info({
      sessionId,
      userId: session.userId,
    }, '[SessionService] Session revoked');

    // Remove from Redis
    this.removeSessionFromRedis(sessionId).catch((error) => {
      logger.warn({ error }, '[SessionService] Failed to remove session from Redis');
    });
  }

  /**
   * Revoke all sessions for a user
   *
   * @param userId - User ID
   */
  revokeAllUserSessions(userId: string): void {
    const userSessionIds = this.userSessions.get(userId);

    if (!userSessionIds) {
      return;
    }

    const sessionIds = Array.from(userSessionIds);
    sessionIds.forEach((sessionId) => {
      this.revokeSession(sessionId);
    });

    logger.info({
      userId,
      count: sessionIds.length,
    }, '[SessionService] All user sessions revoked');
  }

  /**
   * Get active sessions for a user
   *
   * @param userId - User ID
   * @returns Array of session info
   */
  getUserSessions(userId: string): SessionInfo[] {
    const userSessionIds = this.userSessions.get(userId);

    if (!userSessionIds) {
      return [];
    }

    const sessions: SessionInfo[] = [];
    userSessionIds.forEach((sessionId) => {
      const session = this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    });

    return sessions;
  }

  /**
   * Get count of active sessions for a user
   *
   * @param userId - User ID
   * @returns Number of active sessions
   */
  getUserSessionCount(userId: string): number {
    return this.getUserSessions(userId).length;
  }

  /**
   * Get session statistics
   *
   * @returns Session statistics
   */
  getSessionStats(): SessionStats {
    const stats: SessionStats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      userSessions: new Map(),
    };

    this.sessions.forEach((session) => {
      if (session.expiresAt > new Date()) {
        stats.activeSessions++;

        const count = stats.userSessions.get(session.userId) || 0;
        stats.userSessions.set(session.userId, count + 1);
      }
    });

    return stats;
  }

  /**
   * Enforce maximum sessions per user
   *
   * @param userId - User ID
   */
  private enforceSessionLimit(userId: string): void {
    const sessions = this.getUserSessions(userId);

    if (sessions.length > this.maxSessionsPerUser) {
      // Sort by last activity, oldest first
      sessions.sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());

      // Revoke oldest sessions
      const sessionsToRevoke = sessions.length - this.maxSessionsPerUser;
      for (let i = 0; i < sessionsToRevoke; i++) {
        this.revokeSession(sessions[i].sessionId);
      }

      logger.info({
        userId,
        revoked: sessionsToRevoke,
        remaining: this.maxSessionsPerUser,
      }, '[SessionService] Enforced session limit');
    }
  }

  /**
   * Generate a unique session ID
   *
   * @returns Session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Run every 5 minutes

    logger.info('[SessionService] Started periodic session cleanup');
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    this.sessions.forEach((session, sessionId) => {
      if (session.expiresAt < now) {
        this.revokeSession(sessionId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.info({
        count: cleanedCount,
      }, '[SessionService] Cleaned up expired sessions');
    }
  }

  /**
   * Store session in Redis (for distributed session management)
   *
   * @param session - Session info
   */
  private async storeSessionInRedis(session: SessionInfo): Promise<void> {
    try {
      if (!redisClient) {
        return; // Redis not available
      }

      const key = `session:${session.sessionId}`;
      const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

      if (ttl > 0) {
        await redisClient.setEx(key, ttl, JSON.stringify(session));
      }
    } catch (error) {
      // Redis is optional, log error but don't throw
      logger.debug({ error }, '[SessionService] Redis storage failed');
    }
  }

  /**
   * Remove session from Redis
   *
   * @param sessionId - Session ID
   */
  private async removeSessionFromRedis(sessionId: string): Promise<void> {
    try {
      if (!redisClient) {
        return; // Redis not available
      }

      const key = `session:${sessionId}`;
      await redisClient.del(key);
    } catch (error) {
      // Redis is optional, log error but don't throw
      logger.debug({ error }, '[SessionService] Redis removal failed');
    }
  }

  /**
   * Set maximum sessions per user
   *
   * @param max - Maximum sessions allowed
   */
  setMaxSessionsPerUser(max: number): void {
    this.maxSessionsPerUser = max;
    logger.info({ max }, '[SessionService] Max sessions per user updated');
  }

  /**
   * Set session timeout
   *
   * @param minutes - Timeout in minutes
   */
  setSessionTimeout(minutes: number): void {
    this.sessionTimeout = minutes * 60 * 1000;
    logger.info({
      minutes,
      milliseconds: this.sessionTimeout,
    }, '[SessionService] Session timeout updated');
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default SessionService;
