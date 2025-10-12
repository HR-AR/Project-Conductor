-- Migration: Add Jira Integration Tables
-- Description: Creates tables for OAuth connections, webhooks, issue mappings, and sync logs
-- Version: 016
-- Date: 2025-10-12

-- ===========================================================================
-- Table: jira_connections
-- Description: Stores OAuth 2.0 connections to Jira Cloud instances
-- ===========================================================================

CREATE TABLE IF NOT EXISTS jira_connections (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  cloud_id VARCHAR(255) NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  site_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_expires_at TIMESTAMP NOT NULL,
  scopes TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for jira_connections
CREATE INDEX IF NOT EXISTS idx_jira_connections_user_id ON jira_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_connections_cloud_id ON jira_connections(cloud_id);
CREATE INDEX IF NOT EXISTS idx_jira_connections_is_active ON jira_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_jira_connections_token_expires_at ON jira_connections(token_expires_at);

-- Comments
COMMENT ON TABLE jira_connections IS 'OAuth 2.0 connections to Jira Cloud instances';
COMMENT ON COLUMN jira_connections.id IS 'Unique connection identifier';
COMMENT ON COLUMN jira_connections.user_id IS 'User who authorized this connection';
COMMENT ON COLUMN jira_connections.cloud_id IS 'Atlassian cloud ID';
COMMENT ON COLUMN jira_connections.site_url IS 'Jira site URL (e.g., https://yoursite.atlassian.net)';
COMMENT ON COLUMN jira_connections.site_name IS 'Display name for the Jira site';
COMMENT ON COLUMN jira_connections.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN jira_connections.refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN jira_connections.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN jira_connections.scopes IS 'OAuth scopes granted';
COMMENT ON COLUMN jira_connections.is_active IS 'Whether connection is active';
COMMENT ON COLUMN jira_connections.last_sync_at IS 'Last successful sync timestamp';

-- ===========================================================================
-- Table: jira_webhooks
-- Description: Stores registered webhooks for Jira event notifications
-- ===========================================================================

CREATE TABLE IF NOT EXISTS jira_webhooks (
  id VARCHAR(255) PRIMARY KEY,
  connection_id VARCHAR(255) NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
  webhook_id VARCHAR(255) NOT NULL, -- Jira's webhook ID
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for jira_webhooks
CREATE INDEX IF NOT EXISTS idx_jira_webhooks_connection_id ON jira_webhooks(connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_webhooks_webhook_id ON jira_webhooks(webhook_id);
CREATE INDEX IF NOT EXISTS idx_jira_webhooks_is_active ON jira_webhooks(is_active);

-- Comments
COMMENT ON TABLE jira_webhooks IS 'Registered webhooks for Jira event notifications';
COMMENT ON COLUMN jira_webhooks.id IS 'Unique webhook configuration identifier';
COMMENT ON COLUMN jira_webhooks.connection_id IS 'Associated Jira connection';
COMMENT ON COLUMN jira_webhooks.webhook_id IS 'Jira webhook ID (returned by Jira API)';
COMMENT ON COLUMN jira_webhooks.name IS 'Webhook name';
COMMENT ON COLUMN jira_webhooks.url IS 'Webhook callback URL';
COMMENT ON COLUMN jira_webhooks.events IS 'Array of subscribed event types';
COMMENT ON COLUMN jira_webhooks.secret IS 'Webhook signature secret (for HMAC verification)';
COMMENT ON COLUMN jira_webhooks.is_active IS 'Whether webhook is active';
COMMENT ON COLUMN jira_webhooks.last_triggered_at IS 'Last time webhook was triggered';

-- ===========================================================================
-- Table: jira_issue_mappings
-- Description: Maps Jira issues to Project Conductor requirements
-- ===========================================================================

CREATE TABLE IF NOT EXISTS jira_issue_mappings (
  id VARCHAR(255) PRIMARY KEY,
  connection_id VARCHAR(255) NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
  requirement_id VARCHAR(255) NOT NULL,
  jira_issue_id VARCHAR(255) NOT NULL,
  jira_issue_key VARCHAR(255) NOT NULL,
  jira_project_key VARCHAR(255) NOT NULL,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction VARCHAR(50) NOT NULL, -- 'to_jira', 'from_jira', 'bidirectional'
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(connection_id, requirement_id),
  UNIQUE(connection_id, jira_issue_key)
);

-- Indexes for jira_issue_mappings
CREATE INDEX IF NOT EXISTS idx_jira_issue_mappings_connection_id ON jira_issue_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_issue_mappings_requirement_id ON jira_issue_mappings(requirement_id);
CREATE INDEX IF NOT EXISTS idx_jira_issue_mappings_jira_issue_key ON jira_issue_mappings(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_issue_mappings_jira_project_key ON jira_issue_mappings(jira_project_key);
CREATE INDEX IF NOT EXISTS idx_jira_issue_mappings_sync_enabled ON jira_issue_mappings(sync_enabled);

-- Comments
COMMENT ON TABLE jira_issue_mappings IS 'Maps Jira issues to Project Conductor requirements';
COMMENT ON COLUMN jira_issue_mappings.id IS 'Unique mapping identifier';
COMMENT ON COLUMN jira_issue_mappings.connection_id IS 'Associated Jira connection';
COMMENT ON COLUMN jira_issue_mappings.requirement_id IS 'Project Conductor requirement ID';
COMMENT ON COLUMN jira_issue_mappings.jira_issue_id IS 'Jira issue ID (numeric)';
COMMENT ON COLUMN jira_issue_mappings.jira_issue_key IS 'Jira issue key (e.g., PROJ-123)';
COMMENT ON COLUMN jira_issue_mappings.jira_project_key IS 'Jira project key';
COMMENT ON COLUMN jira_issue_mappings.sync_enabled IS 'Whether automatic sync is enabled';
COMMENT ON COLUMN jira_issue_mappings.sync_direction IS 'Direction of sync: to_jira, from_jira, or bidirectional';
COMMENT ON COLUMN jira_issue_mappings.last_synced_at IS 'Last successful sync timestamp';

-- ===========================================================================
-- Table: jira_sync_log
-- Description: Audit log of all sync operations between Jira and Conductor
-- ===========================================================================

CREATE TABLE IF NOT EXISTS jira_sync_log (
  id VARCHAR(255) PRIMARY KEY,
  connection_id VARCHAR(255) NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
  requirement_id VARCHAR(255),
  jira_issue_key VARCHAR(255),
  operation VARCHAR(50) NOT NULL, -- 'import', 'export', 'update', 'sync', 'webhook'
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'partial'
  direction VARCHAR(50) NOT NULL, -- 'to_jira', 'from_jira', 'bidirectional'
  changes_applied TEXT[],
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for jira_sync_log
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_connection_id ON jira_sync_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_requirement_id ON jira_sync_log(requirement_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_jira_issue_key ON jira_sync_log(jira_issue_key);
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_operation ON jira_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_status ON jira_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_created_at ON jira_sync_log(created_at DESC);

-- Comments
COMMENT ON TABLE jira_sync_log IS 'Audit log of all sync operations between Jira and Project Conductor';
COMMENT ON COLUMN jira_sync_log.id IS 'Unique log entry identifier';
COMMENT ON COLUMN jira_sync_log.connection_id IS 'Associated Jira connection';
COMMENT ON COLUMN jira_sync_log.requirement_id IS 'Project Conductor requirement ID (if applicable)';
COMMENT ON COLUMN jira_sync_log.jira_issue_key IS 'Jira issue key (if applicable)';
COMMENT ON COLUMN jira_sync_log.operation IS 'Type of sync operation performed';
COMMENT ON COLUMN jira_sync_log.status IS 'Result status of the operation';
COMMENT ON COLUMN jira_sync_log.direction IS 'Direction of data flow';
COMMENT ON COLUMN jira_sync_log.changes_applied IS 'List of fields that were changed';
COMMENT ON COLUMN jira_sync_log.error_message IS 'Error message if operation failed';
COMMENT ON COLUMN jira_sync_log.metadata IS 'Additional metadata about the sync operation';
COMMENT ON COLUMN jira_sync_log.created_at IS 'When the sync operation occurred';

-- ===========================================================================
-- Cleanup Functions
-- ===========================================================================

-- Function to clean up expired connections
CREATE OR REPLACE FUNCTION cleanup_expired_jira_connections()
RETURNS void AS $$
BEGIN
  UPDATE jira_connections
  SET is_active = false,
      updated_at = NOW()
  WHERE is_active = true
    AND token_expires_at < NOW() - INTERVAL '7 days'
    AND last_sync_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_jira_connections() IS 'Deactivates connections with expired tokens that haven''t synced in 30 days';

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_jira_sync_statistics(p_connection_id VARCHAR)
RETURNS TABLE (
  total_syncs BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT,
  last_sync_at TIMESTAMP,
  avg_syncs_per_day NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
    MAX(created_at) as last_sync_at,
    ROUND(
      COUNT(*)::numeric / GREATEST(
        EXTRACT(DAYS FROM (MAX(created_at) - MIN(created_at)))::numeric,
        1
      ),
      2
    ) as avg_syncs_per_day
  FROM jira_sync_log
  WHERE connection_id = p_connection_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_jira_sync_statistics(VARCHAR) IS 'Get sync statistics for a Jira connection';

-- ===========================================================================
-- Sample Data (Optional - for development/testing)
-- ===========================================================================

-- Uncomment to insert sample data for testing

/*
-- Sample connection (tokens are fake and encrypted)
INSERT INTO jira_connections (
  id, user_id, cloud_id, site_url, site_name,
  access_token, refresh_token, token_expires_at,
  scopes, is_active
) VALUES (
  'jira_conn_demo_001',
  'demo-user',
  'cloud-id-123',
  'https://yoursite.atlassian.net',
  'Your Site',
  'encrypted_access_token_here',
  'encrypted_refresh_token_here',
  NOW() + INTERVAL '1 hour',
  ARRAY['read:jira-work', 'write:jira-work', 'read:jira-user', 'offline_access'],
  true
) ON CONFLICT (id) DO NOTHING;
*/

-- ===========================================================================
-- Migration Complete
-- ===========================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 016: Jira integration tables created successfully';
END $$;
