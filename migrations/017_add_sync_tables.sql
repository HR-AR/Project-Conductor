-- Sync Tables Migration
-- Creates tables for bi-directional synchronization between Jira and BRDs

-- Sync Jobs Table
-- Tracks all sync operations (manual, scheduled, webhook-triggered)
CREATE TABLE IF NOT EXISTS sync_jobs (
    id VARCHAR(255) PRIMARY KEY,
    direction VARCHAR(50) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    brd_ids JSONB DEFAULT '[]'::jsonb,
    jira_keys JSONB DEFAULT '[]'::jsonb,
    epic_key VARCHAR(255),
    project_key VARCHAR(255),
    error TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT sync_jobs_direction_check CHECK (direction IN ('jira_to_brd', 'brd_to_jira', 'bidirectional')),
    CONSTRAINT sync_jobs_operation_check CHECK (operation_type IN ('create', 'update', 'delete', 'bulk_import', 'bulk_export', 'scheduled_sync', 'webhook_sync')),
    CONSTRAINT sync_jobs_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'retrying', 'cancelled')),
    CONSTRAINT sync_jobs_progress_check CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT sync_jobs_retry_check CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Create indexes for sync_jobs
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_direction ON sync_jobs(direction);
CREATE INDEX idx_sync_jobs_created_at ON sync_jobs(created_at);
CREATE INDEX idx_sync_jobs_created_by ON sync_jobs(created_by);
CREATE INDEX idx_sync_jobs_project_key ON sync_jobs(project_key);
CREATE INDEX idx_sync_jobs_epic_key ON sync_jobs(epic_key);

-- Sync Mappings Table
-- Maintains the relationship between BRDs and Jira Epics
CREATE TABLE IF NOT EXISTS sync_mappings (
    id VARCHAR(255) PRIMARY KEY,
    brd_id VARCHAR(255) NOT NULL,
    jira_key VARCHAR(255) NOT NULL UNIQUE,
    jira_id VARCHAR(255) NOT NULL,
    jira_epic_name VARCHAR(500),
    last_synced_at TIMESTAMP NOT NULL,
    last_modified_local TIMESTAMP NOT NULL,
    last_modified_remote TIMESTAMP NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    auto_sync BOOLEAN DEFAULT false,
    conflict_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT sync_mappings_brd_fk FOREIGN KEY (brd_id) REFERENCES brds(id) ON DELETE CASCADE,
    CONSTRAINT sync_mappings_conflict_count_check CHECK (conflict_count >= 0)
);

-- Create indexes for sync_mappings
CREATE INDEX idx_sync_mappings_brd_id ON sync_mappings(brd_id);
CREATE INDEX idx_sync_mappings_jira_key ON sync_mappings(jira_key);
CREATE INDEX idx_sync_mappings_jira_id ON sync_mappings(jira_id);
CREATE INDEX idx_sync_mappings_last_synced ON sync_mappings(last_synced_at);
CREATE INDEX idx_sync_mappings_sync_enabled ON sync_mappings(sync_enabled);
CREATE INDEX idx_sync_mappings_auto_sync ON sync_mappings(auto_sync);

-- Field Mappings Table
-- Configures how fields are mapped between BRD and Jira
CREATE TABLE IF NOT EXISTS field_mappings (
    id VARCHAR(255) PRIMARY KEY,
    source_field VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    direction VARCHAR(50) NOT NULL,
    transform_function VARCHAR(255),
    is_custom_field BOOLEAN DEFAULT false,
    jira_field_id VARCHAR(255),
    default_value JSONB,
    required BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT field_mappings_direction_check CHECK (direction IN ('jira_to_brd', 'brd_to_jira', 'bidirectional')),
    CONSTRAINT field_mappings_source_not_empty CHECK (LENGTH(TRIM(source_field)) > 0),
    CONSTRAINT field_mappings_target_not_empty CHECK (LENGTH(TRIM(target_field)) > 0)
);

-- Create indexes for field_mappings
CREATE INDEX idx_field_mappings_direction ON field_mappings(direction);
CREATE INDEX idx_field_mappings_active ON field_mappings(active);
CREATE INDEX idx_field_mappings_source ON field_mappings(source_field);
CREATE INDEX idx_field_mappings_target ON field_mappings(target_field);

-- Sync Conflicts Table
-- Records conflicts detected during synchronization
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id VARCHAR(255) PRIMARY KEY,
    sync_job_id VARCHAR(255),
    mapping_id VARCHAR(255) NOT NULL,
    brd_id VARCHAR(255) NOT NULL,
    jira_key VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    field VARCHAR(255) NOT NULL,
    base_value JSONB,
    local_value JSONB,
    remote_value JSONB,
    resolution_strategy VARCHAR(50),
    resolved_value JSONB,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT sync_conflicts_job_fk FOREIGN KEY (sync_job_id) REFERENCES sync_jobs(id) ON DELETE SET NULL,
    CONSTRAINT sync_conflicts_mapping_fk FOREIGN KEY (mapping_id) REFERENCES sync_mappings(id) ON DELETE CASCADE,
    CONSTRAINT sync_conflicts_brd_fk FOREIGN KEY (brd_id) REFERENCES brds(id) ON DELETE CASCADE,
    CONSTRAINT sync_conflicts_type_check CHECK (conflict_type IN ('field_change', 'status_mismatch', 'deletion', 'concurrent_modification')),
    CONSTRAINT sync_conflicts_strategy_check CHECK (resolution_strategy IS NULL OR resolution_strategy IN ('keep_local', 'keep_remote', 'merge', 'manual')),
    CONSTRAINT sync_conflicts_status_check CHECK (status IN ('pending', 'resolved', 'ignored'))
);

-- Create indexes for sync_conflicts
CREATE INDEX idx_sync_conflicts_job_id ON sync_conflicts(sync_job_id);
CREATE INDEX idx_sync_conflicts_mapping_id ON sync_conflicts(mapping_id);
CREATE INDEX idx_sync_conflicts_brd_id ON sync_conflicts(brd_id);
CREATE INDEX idx_sync_conflicts_jira_key ON sync_conflicts(jira_key);
CREATE INDEX idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX idx_sync_conflicts_type ON sync_conflicts(conflict_type);
CREATE INDEX idx_sync_conflicts_created_at ON sync_conflicts(created_at);

-- Sync History Table
-- Maintains an audit trail of all sync operations
CREATE TABLE IF NOT EXISTS sync_history (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    performed_by VARCHAR(255),

    CONSTRAINT sync_history_job_fk FOREIGN KEY (job_id) REFERENCES sync_jobs(id) ON DELETE CASCADE,
    CONSTRAINT sync_history_action_not_empty CHECK (LENGTH(TRIM(action)) > 0)
);

-- Create indexes for sync_history
CREATE INDEX idx_sync_history_job_id ON sync_history(job_id);
CREATE INDEX idx_sync_history_timestamp ON sync_history(timestamp);
CREATE INDEX idx_sync_history_action ON sync_history(action);
CREATE INDEX idx_sync_history_performed_by ON sync_history(performed_by);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER sync_mappings_updated_at
    BEFORE UPDATE ON sync_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER field_mappings_updated_at
    BEFORE UPDATE ON field_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert default field mappings
INSERT INTO field_mappings (id, source_field, target_field, direction, is_custom_field, required, active) VALUES
    ('map-title-summary', 'title', 'summary', 'bidirectional', false, true, true),
    ('map-problem-description', 'problemStatement', 'description', 'bidirectional', false, false, true),
    ('map-status', 'status', 'status', 'bidirectional', false, true, true),
    ('map-epicname', 'title', 'customfield_10011', 'brd_to_jira', true, false, true),
    ('map-storypoints', 'budget', 'customfield_10014', 'brd_to_jira', true, false, false),
    ('map-reporter', 'createdBy', 'reporter', 'brd_to_jira', false, false, true),
    ('map-created', 'createdAt', 'created', 'jira_to_brd', false, false, true),
    ('map-updated', 'updatedAt', 'updated', 'bidirectional', false, false, true)
ON CONFLICT (id) DO NOTHING;

-- Add comments to tables for documentation
COMMENT ON TABLE sync_jobs IS 'Tracks all synchronization jobs between Jira and BRDs';
COMMENT ON TABLE sync_mappings IS 'Maintains relationships between BRDs and Jira Epics';
COMMENT ON TABLE field_mappings IS 'Configures field mapping rules for synchronization';
COMMENT ON TABLE sync_conflicts IS 'Records conflicts detected during sync operations';
COMMENT ON TABLE sync_history IS 'Audit trail of all sync operations and changes';

-- Add comments to important columns
COMMENT ON COLUMN sync_jobs.direction IS 'Direction of sync: jira_to_brd, brd_to_jira, or bidirectional';
COMMENT ON COLUMN sync_jobs.operation_type IS 'Type of operation: create, update, delete, bulk_import, bulk_export, scheduled_sync, webhook_sync';
COMMENT ON COLUMN sync_jobs.retry_count IS 'Number of retry attempts for failed jobs';
COMMENT ON COLUMN sync_mappings.auto_sync IS 'Whether this mapping should be included in automatic sync operations';
COMMENT ON COLUMN sync_conflicts.conflict_type IS 'Type of conflict: field_change, status_mismatch, deletion, concurrent_modification';
COMMENT ON COLUMN sync_conflicts.resolution_strategy IS 'How the conflict was resolved: keep_local, keep_remote, merge, manual';
