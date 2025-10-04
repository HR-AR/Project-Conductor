-- Product Requirements Document (PRD) table
-- Represents the product requirements phase generated from approved BRDs

CREATE TABLE IF NOT EXISTS prds (
    id VARCHAR(255) PRIMARY KEY,
    brd_id VARCHAR(255) REFERENCES brds(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    user_stories JSONB DEFAULT '[]'::jsonb,
    technical_requirements JSONB DEFAULT '[]'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    alignments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT prds_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT prds_status_check CHECK (status IN ('draft', 'under_review', 'aligned', 'locked')),
    CONSTRAINT prds_version_positive CHECK (version > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_prds_brd_id ON prds(brd_id);
CREATE INDEX idx_prds_status ON prds(status);
CREATE INDEX idx_prds_created_at ON prds(created_at);
CREATE INDEX idx_prds_created_by ON prds(created_by);
CREATE INDEX idx_prds_features ON prds USING GIN(features);
CREATE INDEX idx_prds_user_stories ON prds USING GIN(user_stories);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER prds_updated_at
    BEFORE UPDATE ON prds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
