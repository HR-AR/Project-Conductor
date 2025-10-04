-- Change Log table
-- Tracks all changes, their reasons, and impacts throughout the project lifecycle

CREATE TABLE IF NOT EXISTS change_log (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255),
    item VARCHAR(500) NOT NULL,
    change TEXT NOT NULL,
    reason TEXT NOT NULL,
    impact TEXT,
    category VARCHAR(50),
    phase VARCHAR(100),
    approved_by JSONB DEFAULT '[]'::jsonb,
    related_conflict_id VARCHAR(255) REFERENCES conflicts(id) ON DELETE SET NULL,
    documents_before JSONB DEFAULT '[]'::jsonb,
    documents_after JSONB DEFAULT '[]'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT change_log_category_check CHECK (category IN ('scope', 'timeline', 'budget', 'technical', 'process')),
    CONSTRAINT change_log_phase_check CHECK (phase IN ('pushed_to_phase_2', 'simplified', 'removed', 'added', 'modified')),
    CONSTRAINT change_log_item_not_empty CHECK (LENGTH(TRIM(item)) > 0),
    CONSTRAINT change_log_change_not_empty CHECK (LENGTH(TRIM(change)) > 0),
    CONSTRAINT change_log_reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_change_log_project_id ON change_log(project_id);
CREATE INDEX idx_change_log_category ON change_log(category);
CREATE INDEX idx_change_log_phase ON change_log(phase);
CREATE INDEX idx_change_log_timestamp ON change_log(timestamp);
CREATE INDEX idx_change_log_created_by ON change_log(created_by);
CREATE INDEX idx_change_log_related_conflict_id ON change_log(related_conflict_id);
CREATE INDEX idx_change_log_approved_by ON change_log USING GIN(approved_by);
CREATE INDEX idx_change_log_documents_before ON change_log USING GIN(documents_before);
CREATE INDEX idx_change_log_documents_after ON change_log USING GIN(documents_after);
