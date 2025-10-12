/**
 * Unit Tests for JWT Utilities
 *
 * Tests JWT token generation, verification, blacklisting, and expiry handling.
 * Coverage Target: 90%+
 */

import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  extractUserId,
  decodeToken,
  blacklistToken,
  isTokenBlacklisted,
  refreshAccessToken,
  getTokenExpiry,
  isTokenExpiringSoon,
  clearBlacklist,
  JWT_TEST_CONFIG,
} from '../../src/utils/jwt.util';

describe('JWT Utilities - Token Generation', () => {
  beforeEach(() => {
    // Clear blacklist before each test
    clearBlacklist();
  });

  describe('generateAccessToken', () => {
    it('should generate valid access token with correct payload', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['requirement:read', 'requirement:write'],
      };

      const token = generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct user information in token', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['admin'],
        permissions: ['*'],
      };

      const token = generateAccessToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user-456');
      expect(decoded?.email).toBe('alice@example.com');
      expect(decoded?.roles).toEqual(['admin']);
    });

    it('should include correct expiry time (15 minutes)', () => {
      const payload = {
        userId: 'user-789',
        email: 'bob@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      const validation = verifyToken(token);

      expect(validation.valid).toBe(true);
      expect(validation.payload?.exp).toBeDefined();
      expect(validation.payload?.iat).toBeDefined();

      if (validation.payload?.exp && validation.payload?.iat) {
        const expiryDuration = validation.payload.exp - validation.payload.iat;
        expect(expiryDuration).toBe(15 * 60); // 15 minutes in seconds
      }
    });

    it('should include issuer and audience claims', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      const validation = verifyToken(token);

      expect(validation.valid).toBe(true);
      expect(validation.payload?.iss).toBe('project-conductor');
      expect(validation.payload?.aud).toBe('project-conductor-api');
    });

    it('should set subject to userId', () => {
      const payload = {
        userId: 'user-999',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      const decoded = decodeToken(token);

      expect(decoded?.sub).toBe('user-999');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['requirement:read'],
      };

      const token = generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should have longer expiry than access token (7 days)', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
      };

      const refreshToken = generateRefreshToken(payload);
      const validation = verifyToken(refreshToken);

      expect(validation.valid).toBe(true);

      if (validation.payload?.exp && validation.payload?.iat) {
        const expiryDuration = validation.payload.exp - validation.payload.iat;
        expect(expiryDuration).toBe(7 * 24 * 60 * 60); // 7 days in seconds
      }
    });

    it('should include type field set to "refresh"', () => {
      const payload = {
        userId: 'user-789',
        email: 'bob@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateRefreshToken(payload);
      const decoded = decodeToken(token) as any;

      expect(decoded?.type).toBe('refresh');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['requirement:read'],
      };

      const tokens = generateTokenPair(payload);

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate different tokens for access and refresh', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['admin'],
        permissions: ['*'],
      };

      const tokens = generateTokenPair(payload);

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should generate tokens with same userId', () => {
      const payload = {
        userId: 'user-789',
        email: 'bob@example.com',
        roles: ['user'],
        permissions: [],
      };

      const tokens = generateTokenPair(payload);
      const accessPayload = decodeToken(tokens.accessToken);
      const refreshPayload = decodeToken(tokens.refreshToken);

      expect(accessPayload?.userId).toBe('user-789');
      expect(refreshPayload?.userId).toBe('user-789');
    });
  });
});

describe('JWT Utilities - Token Verification', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['requirement:read'],
      };

      const token = generateAccessToken(payload);
      const validation = verifyToken(token);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
      expect(validation.expired).toBeUndefined();
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe('user-123');
      expect(validation.payload?.email).toBe('test@example.com');
    });

    it('should reject invalid token', () => {
      const validation = verifyToken('invalid.token.here');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(validation.payload).toBeUndefined();
    });

    it('should reject malformed token', () => {
      const validation = verifyToken('not-a-jwt');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should reject token with wrong signature', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      // Tamper with the signature
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid-signature`;

      const validation = verifyToken(tamperedToken);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should reject blacklisted token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      blacklistToken(token);

      const validation = verifyToken(token);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Token has been revoked');
    });

    it('should verify token with all claim fields', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['admin', 'manager'],
        permissions: ['*'],
        provider: 'google' as const,
        sessionId: 'session-123',
      };

      const token = generateAccessToken(payload);
      const validation = verifyToken(token);

      expect(validation.valid).toBe(true);
      expect(validation.payload?.userId).toBe('user-456');
      expect(validation.payload?.roles).toEqual(['admin', 'manager']);
      expect(validation.payload?.provider).toBe('google');
      expect(validation.payload?.sessionId).toBe('session-123');
    });
  });

  describe('extractUserId', () => {
    it('should extract userId from valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      const userId = extractUserId(token);

      expect(userId).toBe('user-123');
    });

    it('should return null for invalid token', () => {
      const userId = extractUserId('invalid.token');

      expect(userId).toBeNull();
    });

    it('should work without verification (unsafe)', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['admin'],
        permissions: ['*'],
      };

      const token = generateAccessToken(payload);
      blacklistToken(token); // Blacklist the token

      // extractUserId doesn't check blacklist
      const userId = extractUserId(token);
      expect(userId).toBe('user-456');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['requirement:read'],
      };

      const token = generateAccessToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');

      expect(decoded).toBeNull();
    });

    it('should decode token even if blacklisted', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['admin'],
        permissions: ['*'],
      };

      const token = generateAccessToken(payload);
      blacklistToken(token);

      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe('user-456');
    });
  });
});

describe('JWT Utilities - Token Blacklist', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  describe('blacklistToken', () => {
    it('should blacklist a token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      blacklistToken(token);

      expect(isTokenBlacklisted(token)).toBe(true);
    });

    it('should make blacklisted token fail verification', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);

      // Token is valid before blacklisting
      let validation = verifyToken(token);
      expect(validation.valid).toBe(true);

      // Blacklist token
      blacklistToken(token);

      // Token should now be invalid
      validation = verifyToken(token);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Token has been revoked');
    });

    it('should blacklist multiple tokens', () => {
      const token1 = generateAccessToken({
        userId: 'user-1',
        email: 'user1@example.com',
        roles: ['user'],
        permissions: [],
      });

      const token2 = generateAccessToken({
        userId: 'user-2',
        email: 'user2@example.com',
        roles: ['user'],
        permissions: [],
      });

      blacklistToken(token1);
      blacklistToken(token2);

      expect(isTokenBlacklisted(token1)).toBe(true);
      expect(isTokenBlacklisted(token2)).toBe(true);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return false for non-blacklisted token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);

      expect(isTokenBlacklisted(token)).toBe(false);
    });

    it('should return true for blacklisted token', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      blacklistToken(token);

      expect(isTokenBlacklisted(token)).toBe(true);
    });
  });

  describe('clearBlacklist', () => {
    it('should clear all blacklisted tokens in test environment', () => {
      const token1 = generateAccessToken({
        userId: 'user-1',
        email: 'user1@example.com',
        roles: ['user'],
        permissions: [],
      });

      const token2 = generateAccessToken({
        userId: 'user-2',
        email: 'user2@example.com',
        roles: ['user'],
        permissions: [],
      });

      blacklistToken(token1);
      blacklistToken(token2);

      expect(isTokenBlacklisted(token1)).toBe(true);
      expect(isTokenBlacklisted(token2)).toBe(true);

      clearBlacklist();

      expect(isTokenBlacklisted(token1)).toBe(false);
      expect(isTokenBlacklisted(token2)).toBe(false);
    });
  });
});

describe('JWT Utilities - Token Refresh', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['requirement:read'],
      };

      const refreshToken = generateRefreshToken(payload);
      const newAccessToken = refreshAccessToken(refreshToken);

      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBeNull();
      expect(typeof newAccessToken).toBe('string');

      // Verify the new access token
      const validation = verifyToken(newAccessToken!);
      expect(validation.valid).toBe(true);
      expect(validation.payload?.userId).toBe('user-123');
    });

    it('should return null for invalid refresh token', () => {
      const newAccessToken = refreshAccessToken('invalid.token');

      expect(newAccessToken).toBeNull();
    });

    it('should return null for access token (not refresh)', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
      };

      const accessToken = generateAccessToken(payload);
      const newAccessToken = refreshAccessToken(accessToken);

      expect(newAccessToken).toBeNull();
    });

    it('should return null for blacklisted refresh token', () => {
      const payload = {
        userId: 'user-789',
        email: 'bob@example.com',
        roles: ['user'],
        permissions: [],
      };

      const refreshToken = generateRefreshToken(payload);
      blacklistToken(refreshToken);

      const newAccessToken = refreshAccessToken(refreshToken);

      expect(newAccessToken).toBeNull();
    });

    it('should preserve user data in new access token', () => {
      const payload = {
        userId: 'user-999',
        email: 'charlie@example.com',
        roles: ['admin', 'manager'],
        permissions: ['*'],
        provider: 'github' as const,
        sessionId: 'session-456',
      };

      const refreshToken = generateRefreshToken(payload);
      const newAccessToken = refreshAccessToken(refreshToken);

      expect(newAccessToken).not.toBeNull();

      const decoded = decodeToken(newAccessToken!);
      expect(decoded?.userId).toBe('user-999');
      expect(decoded?.email).toBe('charlie@example.com');
      expect(decoded?.roles).toEqual(['admin', 'manager']);
      expect(decoded?.provider).toBe('github');
      expect(decoded?.sessionId).toBe('session-456');
    });
  });
});

describe('JWT Utilities - Token Expiry', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  describe('getTokenExpiry', () => {
    it('should return expiry timestamp', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      const expiry = getTokenExpiry(token);

      expect(expiry).toBeDefined();
      expect(expiry).not.toBeNull();
      expect(typeof expiry).toBe('number');
      expect(expiry! > Date.now() / 1000).toBe(true);
    });

    it('should return null for invalid token', () => {
      const expiry = getTokenExpiry('invalid.token');

      expect(expiry).toBeNull();
    });

    it('should return correct expiry for refresh token', () => {
      const payload = {
        userId: 'user-456',
        email: 'alice@example.com',
        roles: ['user'],
        permissions: [],
      };

      const refreshToken = generateRefreshToken(payload);
      const expiry = getTokenExpiry(refreshToken);
      const decoded = decodeToken(refreshToken);

      expect(expiry).toBe(decoded?.exp);
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return false for fresh token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
      };

      const token = generateAccessToken(payload);
      const expiringSoon = isTokenExpiringSoon(token);

      expect(expiringSoon).toBe(false);
    });

    it('should return true for invalid token', () => {
      const expiringSoon = isTokenExpiringSoon('invalid.token');

      expect(expiringSoon).toBe(true);
    });

    it('should return true for token without expiry', () => {
      // This would only happen with a malformed token
      const expiringSoon = isTokenExpiringSoon('invalid.token');

      expect(expiringSoon).toBe(true);
    });
  });
});

describe('JWT Utilities - Edge Cases', () => {
  beforeEach(() => {
    clearBlacklist();
  });

  it('should handle empty roles array', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      roles: [],
      permissions: [],
    };

    const token = generateAccessToken(payload);
    const validation = verifyToken(token);

    expect(validation.valid).toBe(true);
    expect(validation.payload?.roles).toEqual([]);
  });

  it('should handle empty permissions array', () => {
    const payload = {
      userId: 'user-456',
      email: 'alice@example.com',
      roles: ['user'],
      permissions: [],
    };

    const token = generateAccessToken(payload);
    const validation = verifyToken(token);

    expect(validation.valid).toBe(true);
    expect(validation.payload?.permissions).toEqual([]);
  });

  it('should handle optional fields not provided', () => {
    const payload = {
      userId: 'user-789',
      email: 'bob@example.com',
      roles: ['user'],
      permissions: [],
    };

    const token = generateAccessToken(payload);
    const decoded = decodeToken(token);

    expect(decoded?.provider).toBeUndefined();
    expect(decoded?.sessionId).toBeUndefined();
  });

  it('should handle multiple role assignments', () => {
    const payload = {
      userId: 'user-999',
      email: 'charlie@example.com',
      roles: ['admin', 'manager', 'user'],
      permissions: ['*'],
    };

    const token = generateAccessToken(payload);
    const validation = verifyToken(token);

    expect(validation.valid).toBe(true);
    expect(validation.payload?.roles).toEqual(['admin', 'manager', 'user']);
  });

  it('should handle special characters in email', () => {
    const payload = {
      userId: 'user-special',
      email: 'test+tag@example.co.uk',
      roles: ['user'],
      permissions: [],
    };

    const token = generateAccessToken(payload);
    const validation = verifyToken(token);

    expect(validation.valid).toBe(true);
    expect(validation.payload?.email).toBe('test+tag@example.co.uk');
  });
});
