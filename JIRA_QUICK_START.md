# Jira Integration - Quick Start Guide

5-minute setup guide for developers.

## Prerequisites

- Node.js 20+
- PostgreSQL 15
- Jira Cloud account
- Project Conductor running

## Setup (5 steps)

### 1. Create Atlassian App (2 minutes)

Visit: https://developer.atlassian.com/console/myapps/

```bash
1. Click "Create" → "OAuth 2.0 integration"
2. Name: "Project Conductor"
3. Authorization → OAuth 2.0 (3LO):
   - Callback: http://localhost:3000/api/v1/integrations/jira/callback
   - Scopes: read:jira-work, write:jira-work, read:jira-user, offline_access
4. Copy Client ID and Client Secret
```

### 2. Configure Environment (1 minute)

Edit `.env`:

```bash
# Paste your credentials
JIRA_CLIENT_ID=<your-client-id>
JIRA_CLIENT_SECRET=<your-client-secret>

# Generate secrets
JIRA_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JIRA_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# URLs (use defaults for local dev)
JIRA_REDIRECT_URI=http://localhost:3000/api/v1/integrations/jira/callback
JIRA_WEBHOOK_BASE_URL=http://localhost:3000

# Settings
JIRA_AUTO_REGISTER_WEBHOOKS=true
```

### 3. Run Migration (30 seconds)

```bash
psql $DATABASE_URL -f migrations/016_add_jira_integration_tables.sql
```

**Verify**:
```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'jira_%';
-- Should show: jira_connections, jira_webhooks, jira_issue_mappings, jira_sync_log
```

### 4. Start Server (10 seconds)

```bash
npm start
```

### 5. Test Connection (1 minute)

**Option A: Browser**
```
http://localhost:3000/api/v1/integrations/jira/auth
```
Click the authorization URL, log in to Jira, authorize.

**Option B: cURL**
```bash
# Get auth URL
curl http://localhost:3000/api/v1/integrations/jira/auth \
  -H "X-User-Id: test-user"

# Copy the authorizationUrl and open in browser
# After OAuth completes, check status:

curl http://localhost:3000/api/v1/integrations/jira/status \
  -H "X-User-Id: test-user"
```

**Success Response**:
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

## Quick API Reference

### Get Connection Status
```bash
GET /api/v1/integrations/jira/status
Header: X-User-Id: test-user
```

### Get Projects
```bash
GET /api/v1/integrations/jira/projects?connectionId=<id>
```

### Export Requirement
```bash
POST /api/v1/integrations/jira/export
Content-Type: application/json

{
  "connectionId": "jira_conn_123",
  "requirementId": "REQ-001",
  "projectKey": "PROJ",
  "issueTypeId": "10001"
}
```

### Import Issue
```bash
POST /api/v1/integrations/jira/import
Content-Type: application/json

{
  "connectionId": "jira_conn_123",
  "issueKey": "PROJ-42"
}
```

## Webhook Testing (Optional)

For local webhook testing, use ngrok:

```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start tunnel
ngrok http 3000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Update .env
JIRA_WEBHOOK_BASE_URL=https://abc123.ngrok.io

# Restart server
npm start

# Register webhook
curl -X POST http://localhost:3000/api/v1/integrations/jira/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "jira_conn_123",
    "events": ["jira:issue_created", "jira:issue_updated"]
  }'

# Test: Create/update issue in Jira, check logs
tail -f logs/app.log | grep "Received Jira webhook"
```

## Troubleshooting

### OAuth fails
- ✅ Check `JIRA_CLIENT_ID` and `JIRA_CLIENT_SECRET`
- ✅ Verify redirect URI matches exactly
- ✅ Ensure all scopes are enabled

### Webhooks not received
- ✅ Use ngrok for local testing
- ✅ Update `JIRA_WEBHOOK_BASE_URL` to ngrok URL
- ✅ Re-register webhooks after URL change

### Token expired
- ✅ Tokens auto-refresh, check logs for errors
- ✅ Re-authenticate if refresh fails

### Database errors
- ✅ Verify migration ran successfully
- ✅ Check PostgreSQL is running
- ✅ Verify `DATABASE_URL` is correct

## Debug Mode

```bash
LOG_LEVEL=debug npm start
```

Look for logs:
- `[JiraOAuthService]` - OAuth operations
- `[JiraWebhookService]` - Webhook events
- `[JiraService]` - API requests

## Database Queries

```sql
-- Check connections
SELECT id, user_id, site_name, is_active, token_expires_at
FROM jira_connections;

-- Check webhooks
SELECT id, connection_id, webhook_id, is_active, last_triggered_at
FROM jira_webhooks;

-- Check mappings
SELECT requirement_id, jira_issue_key, sync_enabled, last_synced_at
FROM jira_issue_mappings;

-- Check sync logs
SELECT operation, status, created_at, error_message
FROM jira_sync_log
ORDER BY created_at DESC
LIMIT 10;

-- Get sync statistics
SELECT * FROM get_jira_sync_statistics('jira_conn_123');
```

## Common Workflows

### Connect to Jira
1. GET `/auth` → Get authorization URL
2. User visits URL → Authorizes in Jira
3. Jira redirects to callback → Connection created
4. GET `/status` → Verify connection

### Export Requirement
1. GET `/projects` → List projects
2. GET `/projects/:key/issuetypes` → Get issue types
3. POST `/export` → Create Jira issue
4. Check `jira_issue_mappings` → Verify mapping

### Import Issue
1. POST `/import` with issue key → Create requirement
2. Check `jira_issue_mappings` → Verify mapping
3. Query `jira_sync_log` → View import log

### Sync via Webhook
1. POST `/webhooks` → Register webhook
2. Update issue in Jira → Webhook triggered
3. Check logs → Webhook received and processed
4. Query `jira_sync_log` → View webhook sync

## Production Checklist

Before deploying to production:

- [ ] Update `JIRA_REDIRECT_URI` to production URL
- [ ] Update `JIRA_WEBHOOK_BASE_URL` to production URL
- [ ] Generate secure `JIRA_WEBHOOK_SECRET` (32+ chars)
- [ ] Generate secure `JIRA_ENCRYPTION_KEY` (32+ chars)
- [ ] Enable HTTPS
- [ ] Configure Redis for OAuth state (replace in-memory)
- [ ] Set up monitoring and alerts
- [ ] Configure database backups
- [ ] Test complete OAuth flow in production
- [ ] Test webhook reception in production
- [ ] Verify rate limiting works

## Documentation

- **Complete Guide**: `JIRA_INTEGRATION_GUIDE.md` (6000+ words)
- **Testing Guide**: `JIRA_INTEGRATION_TESTING.md` (4000+ words)
- **Implementation Summary**: `JIRA_INTEGRATION_SUMMARY.md`
- **This Quick Start**: `JIRA_QUICK_START.md`

## Support

Questions? Check:
1. Troubleshooting section above
2. `JIRA_INTEGRATION_GUIDE.md` → Troubleshooting
3. Server logs with `LOG_LEVEL=debug`
4. Database state with SQL queries above

---

**Total Setup Time**: ~5 minutes

**Status**: ✅ Ready to use

**Next Steps**: Read `JIRA_INTEGRATION_GUIDE.md` for advanced features
