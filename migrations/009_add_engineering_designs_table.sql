-- Engineering Design table
-- Represents engineering design documents, estimates, and technical planning

CREATE TABLE IF NOT EXISTS engineering_designs (
    id VARCHAR(255) PRIMARY KEY,
    prd_id VARCHAR(255) REFERENCES prds(id) ON DELETE CASCADE,
    team VARCHAR(50) NOT NULL,
    approach TEXT,
    architecture TEXT,
    estimates JSONB DEFAULT '[]'::jsonb,
    risks JSONB DEFAULT '[]'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    conflicts JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT eng_designs_team_check CHECK (team IN ('frontend', 'backend', 'mobile', 'devops', 'qa')),
    CONSTRAINT eng_designs_status_check CHECK (status IN ('draft', 'under_review', 'approved', 'rejected'))
);

-- Create indexes for better query performance
CREATE INDEX idx_eng_designs_prd_id ON engineering_designs(prd_id);
CREATE INDEX idx_eng_designs_team ON engineering_designs(team);
CREATE INDEX idx_eng_designs_status ON engineering_designs(status);
CREATE INDEX idx_eng_designs_created_at ON engineering_designs(created_at);
CREATE INDEX idx_eng_designs_created_by ON engineering_designs(created_by);
CREATE INDEX idx_eng_designs_estimates ON engineering_designs USING GIN(estimates);
CREATE INDEX idx_eng_designs_risks ON engineering_designs USING GIN(risks);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER engineering_designs_updated_at
    BEFORE UPDATE ON engineering_designs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
