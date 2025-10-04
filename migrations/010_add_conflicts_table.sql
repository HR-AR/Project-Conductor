-- Conflicts Resolution table
-- Represents conflicts, discussions, and resolutions in the project workflow

CREATE TABLE IF NOT EXISTS conflicts (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    raised_by VARCHAR(255) NOT NULL,
    raised_by_role VARCHAR(50),
    affected_documents JSONB,
    affected_items JSONB DEFAULT '[]'::jsonb,
    discussion JSONB DEFAULT '[]'::jsonb,
    options JSONB DEFAULT '[]'::jsonb,
    resolution JSONB,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT conflicts_type_check CHECK (type IN ('timeline', 'budget', 'scope', 'technical')),
    CONSTRAINT conflicts_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT conflicts_status_check CHECK (status IN ('open', 'discussing', 'resolved', 'closed')),
    CONSTRAINT conflicts_raised_by_role_check CHECK (raised_by_role IN ('business', 'product', 'engineering', 'tpm')),
    CONSTRAINT conflicts_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT conflicts_description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_conflicts_type ON conflicts(type);
CREATE INDEX idx_conflicts_status ON conflicts(status);
CREATE INDEX idx_conflicts_severity ON conflicts(severity);
CREATE INDEX idx_conflicts_raised_by ON conflicts(raised_by);
CREATE INDEX idx_conflicts_raised_by_role ON conflicts(raised_by_role);
CREATE INDEX idx_conflicts_created_at ON conflicts(created_at);
CREATE INDEX idx_conflicts_affected_documents ON conflicts USING GIN(affected_documents);
CREATE INDEX idx_conflicts_discussion ON conflicts USING GIN(discussion);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER conflicts_updated_at
    BEFORE UPDATE ON conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
