-- Project Conductor Database Initialization Script
-- This script creates the initial schema for the workflow orchestration system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timestamp functions
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'viewer');
CREATE TYPE requirement_status AS ENUM ('draft', 'active', 'completed', 'archived', 'cancelled');
CREATE TYPE requirement_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE link_type AS ENUM ('dependency', 'blocks', 'relates_to', 'parent_child', 'duplicate');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Requirements table (core workflow items)
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status requirement_status DEFAULT 'draft',
    priority requirement_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_effort INTEGER, -- in hours
    actual_effort INTEGER, -- in hours
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    tags TEXT[], -- array of tags for categorization
    metadata JSONB, -- flexible metadata storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT requirements_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT requirements_effort_positive CHECK (estimated_effort IS NULL OR estimated_effort > 0),
    CONSTRAINT requirements_actual_effort_positive CHECK (actual_effort IS NULL OR actual_effort > 0)
);

-- Links table (relationships between requirements)
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    link_type link_type NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent self-links
    CONSTRAINT links_no_self_reference CHECK (source_id != target_id),
    -- Prevent duplicate links
    CONSTRAINT links_unique_relationship UNIQUE (source_id, target_id, link_type)
);

-- Audit logs table (track all changes)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,

    CONSTRAINT audit_logs_operation_check CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Workflow executions table (track workflow runs)
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_by UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    execution_data JSONB,

    CONSTRAINT workflow_executions_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_priority ON requirements(priority);
CREATE INDEX idx_requirements_assigned_to ON requirements(assigned_to);
CREATE INDEX idx_requirements_created_by ON requirements(created_by);
CREATE INDEX idx_requirements_due_date ON requirements(due_date);
CREATE INDEX idx_requirements_tags ON requirements USING GIN(tags);
CREATE INDEX idx_requirements_metadata ON requirements USING GIN(metadata);
CREATE INDEX idx_requirements_created_at ON requirements(created_at);

CREATE INDEX idx_links_source_id ON links(source_id);
CREATE INDEX idx_links_target_id ON links(target_id);
CREATE INDEX idx_links_type ON links(link_type);
CREATE INDEX idx_links_created_by ON links(created_by);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_by ON workflow_executions(started_by);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER requirements_updated_at
    BEFORE UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW),
                COALESCE(NEW.updated_by, NEW.created_by));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, operation, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER requirements_audit
    AFTER INSERT OR UPDATE OR DELETE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER links_audit
    AFTER INSERT OR UPDATE OR DELETE ON links
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT INTO users (username, email, password_hash, first_name, last_name, role)
VALUES (
    'admin',
    'admin@conductor.local',
    '$2b$10$rQJ8JnJZJjQ8JjQ8JjQ8JjQ8JjQ8JjQ8JjQ8JjQ8JjQ8JjQ8Jjw', -- admin123 hashed
    'System',
    'Administrator',
    'admin'
);

-- Create a view for requirement relationships
CREATE VIEW requirement_relationships AS
SELECT
    r1.id as source_requirement_id,
    r1.title as source_title,
    l.link_type,
    r2.id as target_requirement_id,
    r2.title as target_title,
    l.description as relationship_description,
    l.created_at as linked_at
FROM requirements r1
JOIN links l ON r1.id = l.source_id
JOIN requirements r2 ON r2.id = l.target_id;

-- Create a view for user workload
CREATE VIEW user_workload AS
SELECT
    u.id as user_id,
    u.username,
    u.first_name,
    u.last_name,
    COUNT(r.id) as total_requirements,
    COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_requirements,
    SUM(COALESCE(r.estimated_effort, 0)) as total_estimated_effort,
    SUM(COALESCE(r.actual_effort, 0)) as total_actual_effort
FROM users u
LEFT JOIN requirements r ON u.id = r.assigned_to
GROUP BY u.id, u.username, u.first_name, u.last_name;

-- Grant permissions (adjust as needed for your application user)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO conductor;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO conductor;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO conductor;