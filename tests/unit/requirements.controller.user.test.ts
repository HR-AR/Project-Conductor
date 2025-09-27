import type { Request } from 'express';
import { RequirementsController } from '../../src/controllers/requirements.controller';
import { BadRequestError } from '../../src/middleware/error-handler';

const ORIGINAL_USE_MOCK = process.env['USE_MOCK_DB'];
const ORIGINAL_SYSTEM_USER = process.env['SYSTEM_USER_ID'];

describe('RequirementsController resolveRequestUserId', () => {
  afterEach(() => {
    if (ORIGINAL_USE_MOCK === undefined) {
      delete process.env['USE_MOCK_DB'];
    } else {
      process.env['USE_MOCK_DB'] = ORIGINAL_USE_MOCK;
    }

    if (ORIGINAL_SYSTEM_USER === undefined) {
      delete process.env['SYSTEM_USER_ID'];
    } else {
      process.env['SYSTEM_USER_ID'] = ORIGINAL_SYSTEM_USER;
    }
  });

  it('throws when header is missing and no fallback configured', () => {
    process.env['USE_MOCK_DB'] = 'false';
    delete process.env['SYSTEM_USER_ID'];

    const controller = new RequirementsController();
    const req = { headers: {} } as unknown as Request;

    expect(() => (controller as any).resolveRequestUserId(req)).toThrow(BadRequestError);
  });

  it('uses SYSTEM_USER_ID fallback when header missing', () => {
    process.env['USE_MOCK_DB'] = 'false';
    process.env['SYSTEM_USER_ID'] = '00000000-0000-4000-a000-000000000000';

    const controller = new RequirementsController();
    const req = { headers: {} } as unknown as Request;

    const userId = (controller as any).resolveRequestUserId(req);
    expect(userId).toBe('00000000-0000-4000-a000-000000000000');
  });

  it('prefers header value when present', () => {
    process.env['USE_MOCK_DB'] = 'false';
    process.env['SYSTEM_USER_ID'] = 'fallback-user';

    const controller = new RequirementsController();
    const req = { headers: { 'x-user-id': 'header-user' } } as unknown as Request;

    const userId = (controller as any).resolveRequestUserId(req);
    expect(userId).toBe('header-user');
  });

  it('returns mock user placeholder when using mock services', () => {
    delete process.env['USE_MOCK_DB']; // defaults to mock mode
    delete process.env['SYSTEM_USER_ID'];

    const controller = new RequirementsController();
    const req = { headers: {} } as unknown as Request;

    const userId = (controller as any).resolveRequestUserId(req);
    expect(userId).toBe('mock-user');
  });
});
