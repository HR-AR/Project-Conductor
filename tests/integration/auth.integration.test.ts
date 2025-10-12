/**
 * Integration Tests for Authentication API
 *
 * Tests end-to-end authentication flows including registration, login, token refresh, and logout.
 * Tests actual HTTP endpoints and database interactions.
 * Coverage Target: Full API coverage
 */

import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../src/routes/auth.routes';
import userRoutes from '../../src/routes/user.routes';
import { authenticate } from '../../src/middleware/auth';
import { db } from '../../src/config/database';
import { clearBlacklist } from '../../src/utils/jwt.util';

// Mock database
jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', authenticate, userRoutes);
  return app;
}

describe('Auth API Integration - POST /api/v1/auth/register', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    clearBlacklist();
  });

  it('should register new user successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    // Mock findUserByEmail (user doesn't exist)
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    // Mock insert user
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
        firstName: 'John',
        lastName: 'Doe',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.message).toBe('Registration successful');
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'Test1234',
        firstName: 'John',
        lastName: 'Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        // Missing password, firstName, lastName
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 409 for duplicate email', async () => {
    const mockExistingUser = {
      id: 'user-456',
      email: 'existing@example.com',
      password_hash: 'hashed',
      first_name: 'Existing',
      last_name: 'User',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    // Mock findUserByEmail (user exists)
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockExistingUser] });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'Test1234',
        firstName: 'New',
        lastName: 'User',
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for weak password', async () => {
    // Mock findUserByEmail
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth API Integration - POST /api/v1/auth/login', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    clearBlacklist();
  });

  it('should login with valid credentials', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test1234', 10);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    // Mock findUserByEmail
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

    // Mock updateLastLogin
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.expiresIn).toBe(900);
  });

  it('should return 401 for invalid email', async () => {
    // Mock findUserByEmail (user doesn't exist)
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Test1234',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 401 for incorrect password', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

    const mockUser = {
      id: 'user-456',
      email: 'test@example.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    // Mock findUserByEmail
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword123',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 403 for inactive user', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test1234', 10);

    const mockUser = {
      id: 'user-inactive',
      email: 'inactive@example.com',
      password_hash: passwordHash,
      first_name: 'Inactive',
      last_name: 'User',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: false,
    };

    // Mock findUserByEmail
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'inactive@example.com',
        password: 'Test1234',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        // Missing password
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth API Integration - POST /api/v1/auth/refresh', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    clearBlacklist();
  });

  it('should refresh access token with valid refresh token', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test1234', 10);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    // First login to get tokens
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
      });

    const { refreshToken } = loginResponse.body.data;

    // Now test refresh
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.accessToken).toBeDefined();
    expect(refreshResponse.body.data.accessToken).not.toBe(
      loginResponse.body.data.accessToken
    );
    expect(refreshResponse.body.data.expiresIn).toBe(900);
  });

  it('should return 401 for invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: 'invalid.refresh.token',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing refresh token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth API Integration - POST /api/v1/auth/logout', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    clearBlacklist();
  });

  it('should logout user successfully', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test1234', 10);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    // First login to get tokens
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
      });

    const { accessToken, refreshToken } = loginResponse.body.data;

    // Logout
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refreshToken,
      });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.data.message).toBe('Logout successful');

    // Try to use the refresh token (should fail)
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      });

    expect(refreshResponse.status).toBe(401);
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth API Integration - GET /api/v1/users/me', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    clearBlacklist();
  });

  it('should get current user with valid token', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Test1234', 10);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: passwordHash,
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      last_login_at: new Date(),
    };

    // First login to get token
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
      });

    const { accessToken } = loginResponse.body.data;

    // Mock getUserById
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

    // Get current user
    const meResponse = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.email).toBe('test@example.com');
  });

  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/v1/users/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth API Integration - Full User Journey', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    clearBlacklist();
  });

  it('should complete full auth flow: register -> login -> refresh -> logout', async () => {
    // 1. Register
    const mockRegisteredUser = {
      id: 'user-journey',
      email: 'journey@example.com',
      first_name: 'Journey',
      last_name: 'User',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
    };

    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockRegisteredUser] });

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'journey@example.com',
        password: 'Journey1234',
        firstName: 'Journey',
        lastName: 'User',
      });

    expect(registerResponse.status).toBe(201);

    // 2. Login
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Journey1234', 10);

    const mockLoginUser = {
      ...mockRegisteredUser,
      password_hash: passwordHash,
    };

    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockLoginUser] });
    (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'journey@example.com',
        password: 'Journey1234',
      });

    expect(loginResponse.status).toBe(200);

    const { accessToken, refreshToken } = loginResponse.body.data;

    // 3. Refresh token
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).not.toBe(accessToken);

    // 4. Logout
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refreshToken,
      });

    expect(logoutResponse.status).toBe(200);

    // 5. Verify refresh token is blacklisted
    const refreshAfterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      });

    expect(refreshAfterLogout.status).toBe(401);
  });
});
