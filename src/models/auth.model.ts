/**
 * OAuth Authentication Models
 */

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'jira' | 'slack';

// OAuth scopes
export interface OAuthScope {
  provider: OAuthProvider;
  scopes: string[];
  required: boolean;
}

// OAuth token types
export type TokenType = 'Bearer' | 'Basic';

// OAuth tokens
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: TokenType;
  expiresIn?: number;
  expiresAt?: Date;
  scope?: string;
}

// OAuth user profile
export interface OAuthProfile {
  provider: OAuthProvider;
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  verified: boolean;
}

// OAuth configuration
export interface OAuthConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scopes: string[];
  state?: string;
  responseType: 'code' | 'token';
  grantType: 'authorization_code' | 'refresh_token' | 'client_credentials';
}

// OAuth session
export interface OAuthSession {
  sessionId: string;
  userId: string;
  provider: OAuthProvider;
  tokens: OAuthTokens;
  profile: OAuthProfile;
  createdAt: Date;
  lastRefreshed?: Date;
  active: boolean;
}

// API key model
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: string[];
  rateLimit?: number;
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
  active: boolean;
}

// Auth request
export interface AuthRequest {
  provider?: OAuthProvider;
  apiKey?: string;
  bearerToken?: string;
}

// Auth response
export interface AuthResponse {
  success: boolean;
  userId?: string;
  tokens?: OAuthTokens;
  profile?: OAuthProfile;
  permissions?: string[];
  error?: string;
}

// Permission model
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

// Role model
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  priority: number;
}

// User auth model
export interface UserAuth {
  userId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  apiKeys: ApiKey[];
  oauthSessions: OAuthSession[];
  mfaEnabled: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  locked: boolean;
  lockedUntil?: Date;
}

// Auth middleware config
export interface AuthMiddlewareConfig {
  requireAuth: boolean;
  requireApiKey?: boolean;
  requireOAuth?: boolean;
  providers?: OAuthProvider[];
  permissions?: string[];
  roles?: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

// Rate limit config
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

// JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  provider?: OAuthProvider;
  sessionId?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
  aud?: string;
}

// Token validation result
export interface TokenValidationResult {
  valid: boolean;
  expired?: boolean;
  payload?: JWTPayload;
  error?: string;
}

// MFA types
export type MFAType = 'totp' | 'sms' | 'email' | 'backup';

// MFA configuration
export interface MFAConfig {
  type: MFAType;
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  email?: string;
  verified: boolean;
  lastUsed?: Date;
}

// Auth audit log
export interface AuthAuditLog {
  id: string;
  userId?: string;
  action: 'login' | 'logout' | 'token_refresh' | 'api_key_created' | 'api_key_revoked' | 'mfa_enabled' | 'mfa_disabled' | 'permission_changed';
  provider?: OAuthProvider;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}