# Jira OAuth 2.0 Integration Guide

Complete guide for setting up and using the Jira Cloud integration in Project Conductor.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [OAuth Flow Diagram](#oauth-flow-diagram)
5. [API Reference](#api-reference)
6. [Webhook Events](#webhook-events)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)
9. [Development Guide](#development-guide)

---

## Overview

Project Conductor's Jira integration provides seamless bidirectional sync between Project Conductor requirements and Jira issues using OAuth 2.0 for secure authentication.

### Features

- **OAuth 2.0 Authentication**: Secure 3-legged OAuth flow with automatic token refresh
- **Encrypted Token Storage**: AES-256-GCM encryption for access and refresh tokens
- **Real-time Webhooks**: Live updates when Jira issues change
- **Bidirectional Sync**: Export requirements to Jira or import issues from Jira
- **Rate Limiting**: Respects Jira Cloud API limits (100 requests/minute)
- **Automatic Reconnection**: Handles token expiry and refresh automatically

### Supported Operations

- Connect/disconnect Jira accounts
- Browse Jira projects and issue types
- Export requirements as Jira issues
- Import Jira issues as requirements
- Real-time webhook notifications
- Issue linking and mapping

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Project Conductor                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │ JiraController  │────▶│  JiraService     │               │
│  │  (HTTP Layer)   │     │  (API Client)    │               │
│  └─────────────────┘     └──────────────────┘               │
│                                   │                          │
│                          ┌────────┴────────┐                 │
│                          │                 │                 │
│                ┌─────────▼──────┐  ┌──────▼──────────┐      │
│                │ JiraOAuthService│  │JiraWebhookService│     │
│                │ (OAuth 2.0)     │  │ (Webhooks)       │     │
│                └─────────────────┘  └──────────────────┘     │
│                          │                 │                 │
└──────────────────────────┼─────────────────┼─────────────────┘
                           │                 │
                           │                 │
              ┌────────────▼─────────────────▼──────────────┐
              │         PostgreSQL Database                  │
              │  - jira_connections                          │
              │  - jira_webhooks                             │
              │  - jira_issue_mappings                       │
              │  - jira_sync_log                             │
              └──────────────────────────────────────────────┘
                           │                 │
                           │                 │
              ┌────────────▼─────────────────▼──────────────┐
              │            Jira Cloud API                    │
              │  - OAuth 2.0 Token Endpoint                  │
              │  - REST API v3                               │
              │  - Webhooks                                  │
              └──────────────────────────────────────────────┘
```

### Database Schema

#### jira_connections
Stores OAuth 2.0 connection details with encrypted tokens.

| Column           | Type        | Description                          |
|------------------|-------------|--------------------------------------|
| id               | VARCHAR     | Unique connection identifier         |
| user_id          | VARCHAR     | User who authorized connection       |
| cloud_id         | VARCHAR     | Atlassian cloud ID                   |
| site_url         | VARCHAR     | Jira site URL                        |
| site_name        | VARCHAR     | Display name                         |
| access_token     | TEXT        | Encrypted OAuth access token         |
| refresh_token    | TEXT        | Encrypted OAuth refresh token        |
| token_expires_at | TIMESTAMP   | Token expiry timestamp               |
| scopes           | TEXT[]      | Granted OAuth scopes                 |
| is_active        | BOOLEAN     | Whether connection is active         |
| last_sync_at     | TIMESTAMP   | Last successful sync                 |
| created_at       | TIMESTAMP   | Creation timestamp                   |
| updated_at       | TIMESTAMP   | Last update timestamp                |

#### jira_webhooks
Registered webhooks for event notifications.

| Column           | Type        | Description                          |
|------------------|-------------|--------------------------------------|
| id               | VARCHAR     | Unique webhook identifier            |
| connection_id    | VARCHAR     | Associated connection                |
| webhook_id       | VARCHAR     | Jira's webhook ID                    |
| name             | VARCHAR     | Webhook name                         |
| url              | VARCHAR     | Callback URL                         |
| events           | TEXT[]      | Subscribed event types               |
| secret           | VARCHAR     | HMAC signature secret                |
| is_active        | BOOLEAN     | Whether webhook is active            |
| last_triggered_at| TIMESTAMP   | Last trigger timestamp               |
| created_at       | TIMESTAMP   | Creation timestamp                   |
| updated_at       | TIMESTAMP   | Last update timestamp                |

#### jira_issue_mappings
Maps Jira issues to Project Conductor requirements.

| Column           | Type        | Description                          |
|------------------|-------------|--------------------------------------|
| id               | VARCHAR     | Unique mapping identifier            |
| connection_id    | VARCHAR     | Associated connection                |
| requirement_id   | VARCHAR     | Conductor requirement ID             |
| jira_issue_id    | VARCHAR     | Jira issue ID                        |
| jira_issue_key   | VARCHAR     | Jira issue key (e.g., PROJ-123)      |
| jira_project_key | VARCHAR     | Jira project key                     |
| sync_enabled     | BOOLEAN     | Whether auto-sync is enabled         |
| sync_direction   | VARCHAR     | to_jira, from_jira, bidirectional    |
| last_synced_at   | TIMESTAMP   | Last sync timestamp                  |
| created_at       | TIMESTAMP   | Creation timestamp                   |
| updated_at       | TIMESTAMP   | Last update timestamp                |

#### jira_sync_log
Audit log of all sync operations.

| Column           | Type        | Description                          |
|------------------|-------------|--------------------------------------|
| id               | VARCHAR     | Unique log entry identifier          |
| connection_id    | VARCHAR     | Associated connection                |
| requirement_id   | VARCHAR     | Conductor requirement ID             |
| jira_issue_key   | VARCHAR     | Jira issue key                       |
| operation        | VARCHAR     | import, export, update, sync         |
| status           | VARCHAR     | success, failed, partial             |
| direction        | VARCHAR     | to_jira, from_jira, bidirectional    |
| changes_applied  | TEXT[]      | List of changed fields               |
| error_message    | TEXT        | Error message if failed              |
| metadata         | JSONB       | Additional metadata                  |
| created_at       | TIMESTAMP   | Operation timestamp                  |

---

## Setup Instructions

### 1. Create Atlassian App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Click "Create" → "OAuth 2.0 integration"
3. Enter app details:
   - **App name**: Project Conductor
   - **Description**: Requirements management integration
4. Click "Create"

### 2. Configure OAuth 2.0

1. In your app, go to "Authorization" → "OAuth 2.0 (3LO)"
2. Add callback URL:
   ```
   http://localhost:3000/api/v1/integrations/jira/callback
   ```
3. Configure scopes:
   - `read:jira-work` - Read issues, projects, etc.
   - `write:jira-work` - Create and update issues
   - `read:jira-user` - Read user information
   - `offline_access` - Refresh token support
4. Click "Save changes"

### 3. Get Credentials

1. Copy **Client ID**
2. Generate **Client secret**
3. Save both values

### 4. Configure Environment Variables

Edit `.env` file:

```bash
# Jira OAuth 2.0 Credentials
JIRA_CLIENT_ID=your-client-id-from-step-3
JIRA_CLIENT_SECRET=your-client-secret-from-step-3

# Jira OAuth Redirect URI
JIRA_REDIRECT_URI=http://localhost:3000/api/v1/integrations/jira/callback

# Jira Webhook Configuration
JIRA_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JIRA_WEBHOOK_BASE_URL=http://localhost:3000

# Optional: Use ngrok for local webhook testing
# JIRA_WEBHOOK_BASE_URL=https://your-subdomain.ngrok.io

# Jira Integration Settings
JIRA_AUTO_REGISTER_WEBHOOKS=true
JIRA_RATE_LIMIT_PER_MINUTE=100
```

### 5. Run Database Migrations

```bash
# Apply Jira integration tables migration
psql $DATABASE_URL -f migrations/016_add_jira_integration_tables.sql
```

### 6. Start the Server

```bash
npm start
```

### 7. Test Connection

1. Open browser: `http://localhost:3000/api/v1/integrations/jira/auth`
2. You'll get authorization URL and state
3. Visit the authorization URL
4. Authorize the app in Jira
5. You'll be redirected to callback with success message

---

## OAuth Flow Diagram

```
┌──────────┐                                                     ┌─────────────┐
│  User    │                                                     │ Jira Cloud  │
└────┬─────┘                                                     └──────┬──────┘
     │                                                                  │
     │  1. Click "Connect to Jira"                                     │
     │ ─────────────────────────────▶                                  │
     │                               ┌──────────────────┐              │
     │                               │ Project Conductor │              │
     │                               └────────┬─────────┘              │
     │                                        │                         │
     │  2. Generate auth URL + state         │                         │
     │ ◀─────────────────────────────────────┤                         │
     │                                        │                         │
     │  3. Redirect to Jira auth             │                         │
     │ ──────────────────────────────────────┼────────────────────────▶│
     │                                        │                         │
     │  4. User logs in & authorizes         │                         │
     │ ◀──────────────────────────────────────┼─────────────────────────┤
     │                                        │                         │
     │  5. Redirect to callback with code    │                         │
     │ ────────────────────────────▶          │                         │
     │                               │        │                         │
     │                               │  6. Exchange code for tokens     │
     │                               │ ───────┼────────────────────────▶│
     │                               │        │                         │
     │                               │  7. Return access + refresh token│
     │                               │ ◀──────┼─────────────────────────┤
     │                               │        │                         │
     │                               │  8. Encrypt & store tokens       │
     │                               │ ───────┤                         │
     │                               │        │                         │
     │                               │  9. Register webhooks (optional) │
     │                               │ ───────┼────────────────────────▶│
     │                               │        │                         │
     │  10. Success page             │        │                         │
     │ ◀─────────────────────────────┤        │                         │
     │                               │        │                         │
     │                                                                  │
     │  Later: Token expires, auto-refresh                             │
     │                               │        │                         │
     │  API Request with expired token        │                         │
     │ ─────────────────────────────▶│        │                         │
     │                               │  11. Detect expiry               │
     │                               │ ───────┤                         │
     │                               │        │                         │
     │                               │  12. Refresh token request       │
     │                               │ ───────┼────────────────────────▶│
     │                               │        │                         │
     │                               │  13. New access + refresh token  │
     │                               │ ◀──────┼─────────────────────────┤
     │                               │        │                         │
     │                               │  14. Update stored tokens        │
     │                               │ ───────┤                         │
     │                               │        │                         │
     │                               │  15. Retry original request      │
     │  API Response                 │ ───────┼────────────────────────▶│
     │ ◀─────────────────────────────┤        │                         │
     │                                        │                         │
```

### OAuth State Flow

1. **User initiates**: Clicks "Connect to Jira" button
2. **Generate auth URL**: Server creates authorization URL with state token (CSRF protection)
3. **Redirect to Jira**: User redirected to Jira's authorization page
4. **User authorizes**: User logs in and grants permissions
5. **Callback**: Jira redirects back with authorization code
6. **Token exchange**: Server exchanges code for access + refresh tokens
7. **Encrypt & store**: Tokens encrypted (AES-256-GCM) and stored in database
8. **Register webhooks**: Optionally auto-register webhooks for real-time updates
9. **Success**: User sees success page
10. **Auto-refresh**: When token expires, automatically refresh using refresh token

---

## API Reference

### Authentication Endpoints

#### Start OAuth Flow

```http
GET /api/v1/integrations/jira/auth
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://auth.atlassian.com/authorize?...",
    "state": "abc123..."
  },
  "message": "Redirect user to authorizationUrl to complete OAuth flow"
}
```

#### OAuth Callback

```http
GET /api/v1/integrations/jira/callback?code=xxx&state=yyy
```

Returns HTML success/error page.

#### Get Connection Status

```http
GET /api/v1/integrations/jira/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "connection": {
      "id": "jira_conn_123",
      "siteName": "Your Site",
      "siteUrl": "https://yoursite.atlassian.net",
      "scopes": ["read:jira-work", "write:jira-work"],
      "tokenExpiresAt": "2025-10-13T12:00:00Z"
    }
  }
}
```

#### Test Connection

```http
POST /api/v1/integrations/jira/test
Content-Type: application/json

{
  "connectionId": "jira_conn_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Connected as John Doe (john@example.com)"
  }
}
```

#### Disconnect

```http
DELETE /api/v1/integrations/jira/disconnect
Content-Type: application/json

{
  "connectionId": "jira_conn_123"
}
```

### Resource Endpoints

#### Get Projects

```http
GET /api/v1/integrations/jira/projects?connectionId=jira_conn_123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "10000",
      "key": "PROJ",
      "name": "My Project",
      "projectTypeKey": "software",
      "lead": {
        "accountId": "abc123",
        "displayName": "John Doe"
      }
    }
  ]
}
```

#### Get Issue Types

```http
GET /api/v1/integrations/jira/projects/PROJ/issuetypes?connectionId=jira_conn_123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "10001",
      "name": "Story",
      "iconUrl": "https://...",
      "subtask": false
    },
    {
      "id": "10002",
      "name": "Task",
      "iconUrl": "https://...",
      "subtask": false
    }
  ]
}
```

### Import/Export Endpoints

#### Export Requirement to Jira

```http
POST /api/v1/integrations/jira/export
Content-Type: application/json

{
  "connectionId": "jira_conn_123",
  "requirementId": "REQ-001",
  "projectKey": "PROJ",
  "issueTypeId": "10001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "requirementId": "REQ-001",
    "jiraIssueKey": "PROJ-42",
    "operation": "export",
    "timestamp": "2025-10-12T10:00:00Z"
  },
  "message": "Requirement exported as PROJ-42"
}
```

#### Import Jira Issue

```http
POST /api/v1/integrations/jira/import
Content-Type: application/json

{
  "connectionId": "jira_conn_123",
  "issueKey": "PROJ-42"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "requirementId": "REQ-123",
    "jiraIssueKey": "PROJ-42",
    "operation": "import",
    "timestamp": "2025-10-12T10:00:00Z"
  },
  "message": "Issue imported as REQ-123"
}
```

### Webhook Endpoints

#### Register Webhook

```http
POST /api/v1/integrations/jira/webhooks
Content-Type: application/json

{
  "connectionId": "jira_conn_123",
  "events": [
    "jira:issue_created",
    "jira:issue_updated",
    "jira:issue_deleted"
  ],
  "jqlFilter": "project = PROJ"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "jira_webhook_456",
    "webhookId": "12345",
    "name": "Project Conductor - Your Site",
    "url": "https://yourdomain.com/api/v1/integrations/jira/webhooks/jira_conn_123",
    "events": ["jira:issue_created", "jira:issue_updated"],
    "isActive": true
  }
}
```

#### Get Webhooks

```http
GET /api/v1/integrations/jira/webhooks?connectionId=jira_conn_123
```

#### Deregister Webhook

```http
DELETE /api/v1/integrations/jira/webhooks/jira_webhook_456
```

---

## Webhook Events

### Supported Events

| Event                  | Description                              |
|------------------------|------------------------------------------|
| `jira:issue_created`   | New issue created                        |
| `jira:issue_updated`   | Issue fields updated                     |
| `jira:issue_deleted`   | Issue deleted                            |
| `comment_created`      | Comment added to issue                   |
| `comment_updated`      | Comment edited                           |
| `comment_deleted`      | Comment removed                          |
| `worklog_updated`      | Work log entry added/updated             |

### Webhook Payload Example

```json
{
  "timestamp": 1697123456789,
  "webhookEvent": "jira:issue_updated",
  "issue_event_type_name": "issue_generic",
  "user": {
    "accountId": "abc123",
    "displayName": "John Doe",
    "emailAddress": "john@example.com"
  },
  "issue": {
    "id": "10042",
    "key": "PROJ-42",
    "fields": {
      "summary": "Updated issue title",
      "status": {
        "name": "In Progress"
      }
    }
  },
  "changelog": {
    "id": "12345",
    "items": [
      {
        "field": "status",
        "fieldtype": "jira",
        "from": "10000",
        "fromString": "To Do",
        "to": "10001",
        "toString": "In Progress"
      }
    ]
  }
}
```

### Webhook Security

Webhooks are verified using HMAC-SHA256 signatures:

1. Jira sends `X-Hub-Signature` header: `sha256=<hash>`
2. Server computes expected signature using `JIRA_WEBHOOK_SECRET`
3. Signatures compared using timing-safe comparison
4. Invalid signatures result in 403 Forbidden

---

## Security Considerations

### Token Encryption

Access and refresh tokens are encrypted using **AES-256-GCM** before storage:

- **Encryption key**: Derived from `JIRA_ENCRYPTION_KEY` (or `JWT_SECRET`)
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **IV**: Random 16-byte initialization vector per encryption
- **Auth tag**: Ensures data integrity

**Storage format**: `<iv>:<auth_tag>:<encrypted_data>`

### OAuth State Protection

State tokens protect against CSRF attacks:

- **Generation**: Cryptographically secure random 32 bytes
- **Storage**: In-memory map (use Redis in production)
- **Expiration**: 10 minutes
- **One-time use**: Deleted after verification

### Rate Limiting

Respects Jira Cloud API limits:

- **Default**: 100 requests per minute per connection
- **Implementation**: Token bucket algorithm
- **Configurable**: `JIRA_RATE_LIMIT_PER_MINUTE`

### Webhook Verification

All webhook payloads verified using HMAC-SHA256:

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload, 'utf8')
  .digest('hex');

const expectedSignature = `sha256=${signature}`;
```

### Best Practices

1. **Use HTTPS** for production webhooks
2. **Rotate secrets** regularly (webhook secret, encryption key)
3. **Monitor logs** for failed auth attempts
4. **Validate input** from webhook payloads
5. **Limit scopes** to minimum required permissions

---

## Troubleshooting

### Common Issues

#### 1. OAuth Flow Fails

**Symptom**: Redirect to Jira fails or returns error

**Solutions**:
- Verify `JIRA_CLIENT_ID` and `JIRA_CLIENT_SECRET` are correct
- Check redirect URI matches exactly: `http://localhost:3000/api/v1/integrations/jira/callback`
- Ensure all required scopes are enabled in Atlassian app
- Check Atlassian app status (must be approved for production use)

#### 2. Token Refresh Fails

**Symptom**: API requests fail with 401 after token expires

**Solutions**:
- Check refresh token is valid and not expired
- Verify `JIRA_ENCRYPTION_KEY` hasn't changed (tokens can't be decrypted)
- Look for errors in logs: `Failed to refresh access token`
- Re-authenticate user if refresh token is permanently invalid

#### 3. Webhooks Not Received

**Symptom**: Jira events don't trigger updates

**Solutions**:
- For local dev, use ngrok: `ngrok http 3000`
- Update `JIRA_WEBHOOK_BASE_URL` to ngrok URL
- Re-register webhooks after URL change
- Check webhook signature verification isn't failing (check `JIRA_WEBHOOK_SECRET`)
- Verify webhook is active: `GET /api/v1/integrations/jira/webhooks`

#### 4. Rate Limit Exceeded

**Symptom**: API requests return 429 status

**Solutions**:
- Reduce request frequency
- Increase `JIRA_RATE_LIMIT_PER_MINUTE` (max 100 for Jira Cloud)
- Implement exponential backoff for retries
- Check for accidental request loops

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

View Jira-specific logs:

```bash
# In logs, look for:
# - [JiraOAuthService]
# - [JiraWebhookService]
# - [JiraService]
```

### Database Queries

Check connection status:

```sql
SELECT id, user_id, site_name, is_active, token_expires_at
FROM jira_connections
WHERE user_id = 'your-user-id';
```

Check sync logs:

```sql
SELECT * FROM jira_sync_log
WHERE connection_id = 'jira_conn_123'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Development Guide

### Project Structure

```
src/
├── models/
│   └── jira-integration.model.ts    # Type definitions
├── services/
│   └── integrations/
│       ├── jira-oauth.service.ts    # OAuth 2.0 flow
│       ├── jira-webhook.service.ts  # Webhook management
│       └── jira.service.ts          # Main API client
├── controllers/
│   └── integrations/
│       └── jira.controller.ts       # HTTP request handlers
└── routes/
    └── integrations/
        └── jira.routes.ts           # Route definitions

migrations/
└── 016_add_jira_integration_tables.sql
```

### Adding New Features

#### 1. Add New API Method

In `jira.service.ts`:

```typescript
async getIssueComments(
  connectionId: string,
  issueKey: string
): Promise<JiraComment[]> {
  const client = await this.createApiClient(connectionId);

  const response = await client.get(`/issue/${issueKey}/comment`);
  return response.data.comments;
}
```

#### 2. Add Controller Method

In `jira.controller.ts`:

```typescript
getIssueComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { issueKey } = req.params;
  const connectionId = req.query['connectionId'] as string;

  const comments = await this.jiraService.getIssueComments(connectionId, issueKey);

  res.json({
    success: true,
    data: comments,
  });
});
```

#### 3. Add Route

In `jira.routes.ts`:

```typescript
router.get('/issues/:issueKey/comments', controller.getIssueComments);
```

### Testing

#### Unit Tests

```bash
npm test -- src/services/integrations/jira.service.test.ts
```

#### Integration Tests

```bash
# Set test credentials in .env.test
JIRA_CLIENT_ID=test-client-id
JIRA_CLIENT_SECRET=test-client-secret

npm run test:integration
```

#### Manual Testing

1. Start server: `npm start`
2. Test OAuth flow: `http://localhost:3000/api/v1/integrations/jira/auth`
3. Use Postman collection (import from `/tests/jira-integration.postman.json`)

### Production Deployment

1. **Set environment variables** with production credentials
2. **Use HTTPS** for all endpoints
3. **Enable webhook verification** with strong secret
4. **Set up Redis** for OAuth state storage (replace in-memory map)
5. **Monitor logs** for errors and rate limits
6. **Set up alerts** for failed syncs
7. **Backup database** regularly (encrypted tokens!)

---

## Support

### Resources

- [Atlassian Developer Docs](https://developer.atlassian.com/cloud/jira/platform/)
- [Jira Cloud REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/)

### Getting Help

- Check [Troubleshooting](#troubleshooting) section
- Review logs with `LOG_LEVEL=debug`
- Open an issue on GitHub
- Contact support team

---

## License

Copyright 2025 Project Conductor. All rights reserved.
