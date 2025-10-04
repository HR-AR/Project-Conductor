-- Business Requirements Document (BRD) table
-- Represents the initial business requirements phase of the project workflow

CREATE TABLE IF NOT EXISTS brds (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    problem_statement TEXT NOT NULL,
    business_impact TEXT,
    success_criteria JSONB DEFAULT '[]'::jsonb,
    timeline JSONB,
    budget DECIMAL(12, 2),
    stakeholders JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    approvals JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT brds_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT brds_problem_statement_not_empty CHECK (LENGTH(TRIM(problem_statement)) > 0),
    CONSTRAINT brds_status_check CHECK (status IN ('draft', 'under_review', 'approved', 'rejected')),
    CONSTRAINT brds_budget_positive CHECK (budget IS NULL OR budget > 0),
    CONSTRAINT brds_version_positive CHECK (version > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_brds_status ON brds(status);
CREATE INDEX idx_brds_created_at ON brds(created_at);
CREATE INDEX idx_brds_created_by ON brds(created_by);
CREATE INDEX idx_brds_stakeholders ON brds USING GIN(stakeholders);
CREATE INDEX idx_brds_timeline ON brds USING GIN(timeline);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER brds_updated_at
    BEFORE UPDATE ON brds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
