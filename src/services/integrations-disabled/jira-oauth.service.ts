/**
 * Jira OAuth 2.0 Service
 *
 * Handles OAuth 2.0 authorization flow, token management, and secure storage
 * for Jira Cloud integration using the 3-legged OAuth flow.
 */

import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { db } from '../../config/database';
import logger from '../../utils/logger';
import {
  JiraOAuthAuthorizationParams,
  JiraOAuthTokenRequest,
  JiraOAuthTokenResponse,
  JiraConnection,
  JiraCloudResource,
  JIRA_OAUTH_SCOPES,
  JiraIntegrationError,
  JiraIntegrationErrorCode,
} from '../../models/jira-integration.model';

/**
 * OAuth state management for CSRF protection
 */
interface OAuthState {
  state: string;
  userId: string;
  timestamp: number;
  expiresAt: number;
}

export class JiraOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly encryptionKey: Buffer;
  private readonly authUrl = 'https://auth.atlassian.com/authorize';
  private readonly tokenUrl = 'https://auth.atlassian.com/oauth/token';
  private readonly resourcesUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';

  // In-memory state store (in production, use Redis)
  private stateStore = new Map<string, OAuthState>();

  constructor() {
    // Load configuration from environment
    this.clientId = process.env['JIRA_CLIENT_ID'] || '';
    this.clientSecret = process.env['JIRA_CLIENT_SECRET'] || '';
    this.redirectUri = process.env['JIRA_REDIRECT_URI'] || 'http://localhost:3000/api/v1/integrations/jira/callback';

    // Encryption key for token storage (must be 32 bytes for AES-256)
    const encryptionKeyEnv = process.env['JIRA_ENCRYPTION_KEY'] || process.env['JWT_SECRET'] || 'default-encryption-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(encryptionKeyEnv, 'salt', 32);

    if (!this.clientId || !this.clientSecret) {
      logger.warn('Jira OAuth credentials not configured. Integration will not work.');
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   *
   * @param userId - User initiating the OAuth flow
   * @returns Authorization URL and state token
   */
  generateAuthorizationUrl(userId: string): { url: string; state: string } {
    if (!this.clientId) {
      throw new JiraIntegrationError(
        JiraIntegrationErrorCode.INVALID_CONFIGURATION,
        'Jira OAuth client ID is not configured'
      );
    }

    // Generate secure state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const expiresAt = timestamp + 10 * 60 * 1000; // 10 minutes

    // Store state for verification
    this.stateStore.set(state, {
      state,
      userId,
      timestamp,
      expiresAt,
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    // Build authorization parameters
    const params: JiraOAuthAuthorizationParams = {
      audience: 'api.atlassian.com',
      client_id: this.clientId,
      scope: JIRA_OAUTH_SCOPES.join(' '),
      redirect_uri: this.redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    };

    // Construct authorization URL
    const url = new URL(this.authUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    logger.info({ userId, state }, 'Generated Jira OAuth authorization URL');

    return {
      url: url.toString(),
      state,
    };
  }

  /**
   * Verify OAuth state token
   *
   * @param state - State token from callback
   * @returns User ID if valid, null otherwise
   */
  verifyState(state: string): string | null {
    const stored = this.stateStore.get(state);

    if (!stored) {
      logger.warn({ state }, 'Invalid OAuth state: not found');
      return null;
    }

    if (Date.now() > stored.expiresAt) {
      logger.warn({ state }, 'OAuth state expired');
      this.stateStore.delete(state);
      return null;
    }

    // State is valid, remove it (one-time use)
    this.stateStore.delete(state);
    return stored.userId;
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code - Authorization code from callback
   * @param userId - User ID from verified state
   * @returns Jira connection details
   */
  async exchangeCodeForToken(code: string, userId: string): Promise<JiraConnection> {
    logger.info({ userId }, 'Exchanging authorization code for access token');

    try {
      // Exchange code for tokens
      const tokenRequest: JiraOAuthTokenRequest = {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      };

      const tokenResponse = await axios.post<JiraOAuthTokenResponse>(
        this.tokenUrl,
        tokenRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const {
        access_token,
        refresh_token,
        expires_in,
        scope,
      } = tokenResponse.data;

      logger.info({ userId, scopes: scope }, 'Successfully obtained access token');

      // Get accessible resources (Jira sites)
      const resources = await this.getAccessibleResources(access_token);

      if (resources.length === 0) {
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.OAUTH_FAILED,
          'No accessible Jira sites found for this account'
        );
      }

      // Use the first resource (site)
      const resource = resources[0];

      logger.info(
        { userId, cloudId: resource.id, siteName: resource.name },
        'Retrieved accessible Jira site'
      );

      // Calculate token expiry
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      // Encrypt tokens before storage
      const encryptedAccessToken = this.encrypt(access_token);
      const encryptedRefreshToken = this.encrypt(refresh_token);

      // Store connection in database
      const connection = await this.storeConnection({
        userId,
        cloudId: resource.id,
        siteUrl: resource.url,
        siteName: resource.name,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        scopes: scope.split(' '),
      });

      logger.info(
        { userId, connectionId: connection.id, cloudId: resource.id },
        'Jira connection stored successfully'
      );

      return connection;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to exchange code for token');

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.OAUTH_FAILED,
          `OAuth token exchange failed: ${axiosError.response?.data || axiosError.message}`,
          axiosError.response?.data
        );
      }

      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param connectionId - Connection ID to refresh
   * @returns Updated connection with new tokens
   */
  async refreshAccessToken(connectionId: string): Promise<JiraConnection> {
    logger.info({ connectionId }, 'Refreshing access token');

    try {
      // Get existing connection
      const connection = await this.getConnection(connectionId);

      if (!connection) {
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
          `Connection not found: ${connectionId}`
        );
      }

      // Decrypt refresh token
      const refreshToken = this.decrypt(connection.refreshToken);

      // Request new access token
      const tokenRequest: JiraOAuthTokenRequest = {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      };

      const tokenResponse = await axios.post<JiraOAuthTokenResponse>(
        this.tokenUrl,
        tokenRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const {
        access_token,
        refresh_token: new_refresh_token,
        expires_in,
        scope,
      } = tokenResponse.data;

      logger.info({ connectionId, scopes: scope }, 'Successfully refreshed access token');

      // Calculate new token expiry
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      // Encrypt new tokens
      const encryptedAccessToken = this.encrypt(access_token);
      const encryptedRefreshToken = this.encrypt(new_refresh_token);

      // Update connection in database
      const updatedConnection = await this.updateConnectionTokens(
        connectionId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        scope.split(' ')
      );

      logger.info({ connectionId }, 'Access token refreshed successfully');

      return updatedConnection;
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to refresh access token');

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new JiraIntegrationError(
          JiraIntegrationErrorCode.TOKEN_REFRESH_FAILED,
          `Token refresh failed: ${axiosError.response?.data || axiosError.message}`,
          axiosError.response?.data
        );
      }

      throw error;
    }
  }

  /**
   * Get decrypted access token for API requests
   * Automatically refreshes if expired
   *
   * @param connectionId - Connection ID
   * @returns Valid access token
   */
  async getValidAccessToken(connectionId: string): Promise<string> {
    const connection = await this.getConnection(connectionId);

    if (!connection) {
      throw new JiraIntegrationError(
        JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
        `Connection not found: ${connectionId}`
      );
    }

    // Check if token is expired or will expire in next 5 minutes
    const now = new Date();
    const expiryBuffer = new Date(connection.tokenExpiresAt.getTime() - 5 * 60 * 1000);

    if (now >= expiryBuffer) {
      logger.info({ connectionId }, 'Access token expired, refreshing...');
      const refreshedConnection = await this.refreshAccessToken(connectionId);
      return this.decrypt(refreshedConnection.accessToken);
    }

    return this.decrypt(connection.accessToken);
  }

  /**
   * Get accessible Jira resources (sites) for a token
   *
   * @param accessToken - OAuth access token
   * @returns List of accessible Jira sites
   */
  private async getAccessibleResources(accessToken: string): Promise<JiraCloudResource[]> {
    const response = await axios.get<JiraCloudResource[]>(
      this.resourcesUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    return response.data;
  }

  /**
   * Store new connection in database
   */
  private async storeConnection(
    data: Omit<JiraConnection, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>
  ): Promise<JiraConnection> {
    const now = new Date();
    const id = `jira_conn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const query = `
      INSERT INTO jira_connections (
        id, user_id, cloud_id, site_url, site_name,
        access_token, refresh_token, token_expires_at,
        scopes, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      data.userId,
      data.cloudId,
      data.siteUrl,
      data.siteName,
      data.accessToken,
      data.refreshToken,
      data.tokenExpiresAt,
      data.scopes,
      true,
      now,
      now,
    ]);

    return this.mapRowToConnection(result.rows[0]);
  }

  /**
   * Update connection tokens after refresh
   */
  private async updateConnectionTokens(
    connectionId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiresAt: Date,
    scopes: string[]
  ): Promise<JiraConnection> {
    const query = `
      UPDATE jira_connections
      SET access_token = $2,
          refresh_token = $3,
          token_expires_at = $4,
          scopes = $5,
          updated_at = $6
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      connectionId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
      new Date(),
    ]);

    if (result.rows.length === 0) {
      throw new JiraIntegrationError(
        JiraIntegrationErrorCode.CONNECTION_NOT_FOUND,
        `Connection not found: ${connectionId}`
      );
    }

    return this.mapRowToConnection(result.rows[0]);
  }

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string): Promise<JiraConnection | null> {
    const query = 'SELECT * FROM jira_connections WHERE id = $1';
    const result = await db.query(query, [connectionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConnection(result.rows[0]);
  }

  /**
   * Get connection by user ID
   */
  async getConnectionByUserId(userId: string): Promise<JiraConnection | null> {
    const query = 'SELECT * FROM jira_connections WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConnection(result.rows[0]);
  }

  /**
   * Revoke connection and deactivate
   */
  async revokeConnection(connectionId: string): Promise<void> {
    logger.info({ connectionId }, 'Revoking Jira connection');

    const query = `
      UPDATE jira_connections
      SET is_active = false,
          updated_at = $2
      WHERE id = $1
    `;

    await db.query(query, [connectionId, new Date()]);

    logger.info({ connectionId }, 'Connection revoked successfully');
  }

  /**
   * Encrypt token using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token using AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Map database row to JiraConnection
   */
  private mapRowToConnection(row: any): JiraConnection {
    return {
      id: row.id,
      userId: row.user_id,
      cloudId: row.cloud_id,
      siteUrl: row.site_url,
      siteName: row.site_name,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiresAt: new Date(row.token_expires_at),
      scopes: row.scopes,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
    };
  }

  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();

    for (const [state, data] of this.stateStore.entries()) {
      if (now > data.expiresAt) {
        this.stateStore.delete(state);
      }
    }
  }
}

export default JiraOAuthService;
