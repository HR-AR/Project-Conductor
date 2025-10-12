# Jira Integration Testing Guide

Comprehensive testing guide for the Jira OAuth 2.0 integration.

## Prerequisites

- Project Conductor running locally: `npm start`
- PostgreSQL database with migrations applied
- Valid Jira Cloud account
- Atlassian OAuth app configured (see JIRA_INTEGRATION_GUIDE.md)

## Test Scenarios

### 1. OAuth Flow Testing

#### Test 1.1: Successful Authorization

**Steps:**
1. Start OAuth flow:
   ```bash
   curl http://localhost:3000/api/v1/integrations/jira/auth \
     -H "X-User-Id: test-user-1"
   ```

2. Expected response:
   ```json
   {
     "success": true,
     "data": {
       "authorizationUrl": "https://auth.atlassian.com/authorize?...",
       "state": "abc123..."
     }
   }
   ```

3. Open `authorizationUrl` in browser
4. Log in to Jira and authorize
5. Should redirect to callback with success page
6. Verify connection in database:
   ```sql
   SELECT * FROM jira_connections WHERE user_id = 'test-user-1';
   ```

**Expected Result:** Connection stored with encrypted tokens, `is_active = true`

#### Test 1.2: Invalid State

**Steps:**
1. Visit callback with invalid state:
   ```
   http://localhost:3000/api/v1/integrations/jira/callback?code=xyz&state=invalid
   ```

**Expected Result:** Error page: "Invalid or expired OAuth state"

#### Test 1.3: Expired State

**Steps:**
1. Generate auth URL
2. Wait 11 minutes (state expires after 10 minutes)
3. Try to complete OAuth flow

**Expected Result:** Error page: "OAuth state expired"

### 2. Connection Management Testing

#### Test 2.1: Get Connection Status

**Steps:**
```bash
curl http://localhost:3000/api/v1/integrations/jira/status \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "connection": {
      "id": "jira_conn_...",
      "siteName": "Your Site",
      "siteUrl": "https://yoursite.atlassian.net"
    }
  }
}
```

#### Test 2.2: Test Connection

**Steps:**
```bash
curl -X POST http://localhost:3000/api/v1/integrations/jira/test \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "jira_conn_123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Connected as John Doe (john@example.com)"
  }
}
```

#### Test 2.3: Disconnect

**Steps:**
```bash
curl -X DELETE http://localhost:3000/api/v1/integrations/jira/disconnect \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "jira_conn_123"
  }'
```

**Verification:**
```sql
SELECT is_active FROM jira_connections WHERE id = 'jira_conn_123';
-- Should return false
```

### 3. Token Management Testing

#### Test 3.1: Token Encryption

**Steps:**
1. Create connection via OAuth
2. Query database:
   ```sql
   SELECT access_token FROM jira_connections LIMIT 1;
   ```

**Expected Result:** Token should be encrypted (format: `<iv>:<auth_tag>:<encrypted>`)

#### Test 3.2: Automatic Token Refresh

**Steps:**
1. Create connection
2. Update token expiry to past:
   ```sql
   UPDATE jira_connections
   SET token_expires_at = NOW() - INTERVAL '1 hour'
   WHERE id = 'jira_conn_123';
   ```
3. Make API request:
   ```bash
   curl http://localhost:3000/api/v1/integrations/jira/projects?connectionId=jira_conn_123
   ```

**Expected Result:**
- Token should be automatically refreshed
- Request succeeds
- New `token_expires_at` in future

**Verification:**
```sql
SELECT token_expires_at FROM jira_connections WHERE id = 'jira_conn_123';
-- Should be in the future
```

### 4. API Client Testing

#### Test 4.1: Get Projects

**Steps:**
```bash
curl "http://localhost:3000/api/v1/integrations/jira/projects?connectionId=jira_conn_123"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "10000",
      "key": "PROJ",
      "name": "My Project"
    }
  ]
}
```

#### Test 4.2: Get Issue Types

**Steps:**
```bash
curl "http://localhost:3000/api/v1/integrations/jira/projects/PROJ/issuetypes?connectionId=jira_conn_123"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "10001",
      "name": "Story",
      "subtask": false
    }
  ]
}
```

#### Test 4.3: Rate Limiting

**Steps:**
1. Make 101 requests rapidly:
   ```bash
   for i in {1..101}; do
     curl "http://localhost:3000/api/v1/integrations/jira/projects?connectionId=jira_conn_123" &
   done
   wait
   ```

**Expected Result:**
- First 100 requests succeed
- 101st request waits (rate limiter)
- No 429 errors from Jira

### 5. Export/Import Testing

#### Test 5.1: Export Requirement

**Steps:**
1. Create a requirement in Project Conductor (REQ-001)
2. Export to Jira:
   ```bash
   curl -X POST http://localhost:3000/api/v1/integrations/jira/export \
     -H "Content-Type: application/json" \
     -d '{
       "connectionId": "jira_conn_123",
       "requirementId": "REQ-001",
       "projectKey": "PROJ",
       "issueTypeId": "10001"
     }'
   ```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "requirementId": "REQ-001",
    "jiraIssueKey": "PROJ-42",
    "operation": "export"
  }
}
```

**Verification:**
- Check Jira UI: Issue PROJ-42 should exist
- Check database:
  ```sql
  SELECT * FROM jira_issue_mappings WHERE requirement_id = 'REQ-001';
  SELECT * FROM jira_sync_log WHERE operation = 'export';
  ```

#### Test 5.2: Import Issue

**Steps:**
```bash
curl -X POST http://localhost:3000/api/v1/integrations/jira/import \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "jira_conn_123",
    "issueKey": "PROJ-42"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "requirementId": "REQ-123",
    "jiraIssueKey": "PROJ-42",
    "operation": "import"
  }
}
```

**Verification:**
- Requirement REQ-123 created in Conductor
- Mapping exists in `jira_issue_mappings`
- Sync logged in `jira_sync_log`

### 6. Webhook Testing

#### Test 6.1: Register Webhook

**Prerequisites:** Set up ngrok for local testing:
```bash
ngrok http 3000
# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
```

Update `.env`:
```bash
JIRA_WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

**Steps:**
```bash
curl -X POST http://localhost:3000/api/v1/integrations/jira/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "jira_conn_123",
    "events": [
      "jira:issue_created",
      "jira:issue_updated"
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "jira_webhook_456",
    "webhookId": "12345",
    "name": "Project Conductor - Your Site",
    "isActive": true
  }
}
```

**Verification:**
```sql
SELECT * FROM jira_webhooks WHERE connection_id = 'jira_conn_123';
```

#### Test 6.2: Webhook Event Reception

**Steps:**
1. Ensure webhook is registered
2. In Jira UI, create or update an issue
3. Watch server logs:
   ```bash
   tail -f logs/app.log | grep "Received Jira webhook"
   ```

**Expected Result:**
- Webhook received and logged
- Signature verified
- Event processed
- `last_triggered_at` updated in database

#### Test 6.3: Webhook Signature Verification

**Steps:**
1. Send webhook with invalid signature:
   ```bash
   curl -X POST http://localhost:3000/api/v1/integrations/jira/webhooks/jira_conn_123 \
     -H "Content-Type: application/json" \
     -H "X-Hub-Signature: sha256=invalid" \
     -d '{
       "webhookEvent": "jira:issue_updated",
       "timestamp": 1697123456789
     }'
   ```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid webhook signature"
}
```

**Status Code:** 403 Forbidden

### 7. Error Handling Testing

#### Test 7.1: Invalid Connection ID

**Steps:**
```bash
curl "http://localhost:3000/api/v1/integrations/jira/projects?connectionId=invalid"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Connection not found: invalid"
}
```

#### Test 7.2: Missing Required Fields

**Steps:**
```bash
curl -X POST http://localhost:3000/api/v1/integrations/jira/export \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "jira_conn_123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "connectionId, requirementId, projectKey, and issueTypeId are required"
}
```

#### Test 7.3: Jira API Error

**Steps:**
1. Try to export to non-existent project:
   ```bash
   curl -X POST http://localhost:3000/api/v1/integrations/jira/export \
     -H "Content-Type: application/json" \
     -d '{
       "connectionId": "jira_conn_123",
       "requirementId": "REQ-001",
       "projectKey": "INVALID",
       "issueTypeId": "10001"
     }'
   ```

**Expected Response:**
```json
{
  "success": false,
  "data": {
    "success": false,
    "error": "Failed to create issue: ..."
  }
}
```

**Verification:**
```sql
SELECT * FROM jira_sync_log WHERE status = 'failed' ORDER BY created_at DESC LIMIT 1;
-- Should contain error message
```

### 8. Database Integrity Testing

#### Test 8.1: Foreign Key Constraints

**Steps:**
```sql
-- Try to insert webhook with invalid connection_id
INSERT INTO jira_webhooks (id, connection_id, webhook_id, name, url, events, secret, created_at, updated_at)
VALUES ('test', 'invalid', '123', 'Test', 'http://test', ARRAY['jira:issue_created'], 'secret', NOW(), NOW());
```

**Expected Result:** Foreign key constraint violation error

#### Test 8.2: Unique Constraints

**Steps:**
```sql
-- Try to insert duplicate mapping
INSERT INTO jira_issue_mappings (id, connection_id, requirement_id, jira_issue_id, jira_issue_key, jira_project_key, sync_direction, created_at, updated_at)
VALUES ('test1', 'jira_conn_123', 'REQ-001', '10042', 'PROJ-42', 'PROJ', 'bidirectional', NOW(), NOW());

INSERT INTO jira_issue_mappings (id, connection_id, requirement_id, jira_issue_id, jira_issue_key, jira_project_key, sync_direction, created_at, updated_at)
VALUES ('test2', 'jira_conn_123', 'REQ-001', '10043', 'PROJ-43', 'PROJ', 'bidirectional', NOW(), NOW());
```

**Expected Result:** Unique constraint violation (duplicate requirement_id for connection)

### 9. Performance Testing

#### Test 9.1: Token Encryption Performance

**Steps:**
```javascript
const { performance } = require('perf_hooks');
const JiraOAuthService = require('./src/services/integrations/jira-oauth.service').default;

const service = new JiraOAuthService();
const testToken = 'test-token-'.repeat(10);

const start = performance.now();
for (let i = 0; i < 1000; i++) {
  const encrypted = service.encrypt(testToken);
  const decrypted = service.decrypt(encrypted);
}
const end = performance.now();

console.log(`1000 encrypt/decrypt cycles: ${end - start}ms`);
```

**Expected Result:** < 100ms for 1000 cycles

#### Test 9.2: Rate Limiter Performance

**Steps:**
```javascript
const { performance } = require('perf_hooks');

const start = performance.now();
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(
    fetch('http://localhost:3000/api/v1/integrations/jira/projects?connectionId=jira_conn_123')
  );
}
await Promise.all(promises);
const end = performance.now();

console.log(`100 requests: ${end - start}ms`);
```

**Expected Result:** Requests complete within ~1 minute (rate limited to 100/min)

### 10. Security Testing

#### Test 10.1: SQL Injection

**Steps:**
```bash
curl "http://localhost:3000/api/v1/integrations/jira/projects?connectionId=jira_conn_123'; DROP TABLE jira_connections; --"
```

**Expected Result:** No SQL injection (parameterized queries prevent this)

#### Test 10.2: XSS in Callback

**Steps:**
1. Try to inject script in state parameter:
   ```
   http://localhost:3000/api/v1/integrations/jira/callback?code=xyz&state=<script>alert(1)</script>
   ```

**Expected Result:** Script not executed, state validation fails

## Automated Test Suite

### Unit Tests

```bash
npm test -- src/services/integrations/jira-oauth.service.test.ts
npm test -- src/services/integrations/jira-webhook.service.test.ts
npm test -- src/services/integrations/jira.service.test.ts
```

### Integration Tests

```bash
npm run test:integration -- jira
```

### End-to-End Tests

```bash
npm run test:e2e -- jira-oauth-flow
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Complete OAuth flow, export/import workflows

## Continuous Testing

### GitHub Actions Workflow

```yaml
name: Jira Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run migrate
      - run: npm test -- jira
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          JIRA_CLIENT_ID: ${{ secrets.JIRA_TEST_CLIENT_ID }}
          JIRA_CLIENT_SECRET: ${{ secrets.JIRA_TEST_CLIENT_SECRET }}
```

## Reporting Bugs

When reporting issues, include:

1. **Test scenario** being executed
2. **Expected behavior**
3. **Actual behavior**
4. **Error logs** (with sensitive data redacted)
5. **Database state** (relevant tables)
6. **Environment details** (Node version, OS, etc.)

---

## Next Steps

After completing all tests:

1. ✅ All OAuth flows working
2. ✅ Token encryption/refresh tested
3. ✅ API client methods verified
4. ✅ Webhooks receiving events
5. ✅ Export/import working
6. ✅ Error handling robust
7. ✅ Security measures validated

**Integration is ready for production deployment!**
