-- Activity Log table
-- Tracks all agent activity events for orchestration visibility and audit trail

CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    task_description TEXT NOT NULL,
    project_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT activity_log_event_type_check CHECK (event_type IN (
        'agent.started',
        'agent.progress',
        'agent.completed',
        'agent.conflict_detected',
        'agent.paused',
        'agent.error'
    )),
    CONSTRAINT activity_log_status_check CHECK (status IN (
        'started',
        'in_progress',
        'completed',
        'paused',
        'failed',
        'conflict'
    )),
    CONSTRAINT activity_log_severity_check CHECK (severity IN (
        'info',
        'success',
        'warning',
        'error',
        'critical'
    )),
    CONSTRAINT activity_log_agent_type_not_empty CHECK (LENGTH(TRIM(agent_type)) > 0),
    CONSTRAINT activity_log_task_id_not_empty CHECK (LENGTH(TRIM(task_id)) > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_activity_log_event_type ON activity_log(event_type);
CREATE INDEX idx_activity_log_agent_type ON activity_log(agent_type);
CREATE INDEX idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_log_status ON activity_log(status);
CREATE INDEX idx_activity_log_severity ON activity_log(severity);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX idx_activity_log_project_timestamp ON activity_log(project_id, timestamp DESC);
CREATE INDEX idx_activity_log_agent_timestamp ON activity_log(agent_type, timestamp DESC);
CREATE INDEX idx_activity_log_status_timestamp ON activity_log(status, timestamp DESC);

-- GIN index for JSONB payload queries
CREATE INDEX idx_activity_log_payload ON activity_log USING GIN(payload);

-- Add comment for documentation
COMMENT ON TABLE activity_log IS 'Stores all agent activity events for orchestration visibility, real-time updates, and audit trail';
COMMENT ON COLUMN activity_log.event_type IS 'Type of agent event: started, progress, completed, conflict_detected, paused, error';
COMMENT ON COLUMN activity_log.agent_type IS 'Type/category of the agent (e.g., agent-api, agent-quality, agent-security)';
COMMENT ON COLUMN activity_log.agent_name IS 'Human-readable name of the agent';
COMMENT ON COLUMN activity_log.task_id IS 'Unique identifier for the task being executed';
COMMENT ON COLUMN activity_log.task_description IS 'Description of the task being executed';
COMMENT ON COLUMN activity_log.project_id IS 'Optional project ID if activity is associated with a specific project';
COMMENT ON COLUMN activity_log.status IS 'Current status of the agent task';
COMMENT ON COLUMN activity_log.severity IS 'Severity level for UI display and filtering';
COMMENT ON COLUMN activity_log.payload IS 'Complete event payload as JSON for full context and replay';
COMMENT ON COLUMN activity_log.timestamp IS 'When the event occurred';
COMMENT ON COLUMN activity_log.created_at IS 'When the record was created in the database';
