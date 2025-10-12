-- Document Index Table for Fast Dashboard Queries
-- This table stores pre-parsed metadata from narratives for fast dashboard access

CREATE TABLE IF NOT EXISTS document_index (
    narrative_id INT PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'brd',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    health_score INT DEFAULT 85,
    blockers JSONB DEFAULT '[]'::jsonb,
    next_milestones JSONB DEFAULT '[]'::jsonb,
    approvers JSONB DEFAULT '[]'::jsonb,
    last_indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_document_index_status ON document_index(status);
CREATE INDEX IF NOT EXISTS idx_document_index_health ON document_index(health_score);
CREATE INDEX IF NOT EXISTS idx_document_index_type ON document_index(type);
CREATE INDEX IF NOT EXISTS idx_document_index_title ON document_index USING gin(to_tsvector('english', title));

-- Index for blocked projects (projects with blockers)
CREATE INDEX IF NOT EXISTS idx_document_index_blockers ON document_index USING gin(blockers);

-- Index for approvers
CREATE INDEX IF NOT EXISTS idx_document_index_approvers ON document_index USING gin(approvers);

-- Comments
COMMENT ON TABLE document_index IS 'Fast lookup index for dashboard queries, contains pre-parsed metadata from narratives';
COMMENT ON COLUMN document_index.narrative_id IS 'Foreign key to narrative_versions.narrative_id';
COMMENT ON COLUMN document_index.project_id IS 'Project identifier from YAML frontmatter';
COMMENT ON COLUMN document_index.title IS 'Extracted title from markdown content';
COMMENT ON COLUMN document_index.type IS 'Document type: brd, prd, design, etc';
COMMENT ON COLUMN document_index.status IS 'Document status: draft, in_review, approved, rejected';
COMMENT ON COLUMN document_index.health_score IS 'Project health score 0-100';
COMMENT ON COLUMN document_index.blockers IS 'JSON array of active blockers';
COMMENT ON COLUMN document_index.next_milestones IS 'JSON array of upcoming milestones';
COMMENT ON COLUMN document_index.approvers IS 'JSON array of approvers and their votes';
COMMENT ON COLUMN document_index.last_indexed_at IS 'When this document was last indexed';
