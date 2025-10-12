-- Migration: Add orchestrator execution history and learning system
-- Purpose: Enable self-learning capabilities for the orchestrator to optimize workflows
-- Author: System
-- Date: 2025-10-12

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create orchestrator_execution_history table
-- Tracks every task execution for pattern analysis
CREATE TABLE orchestrator_execution_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Goal and task information
  goal TEXT NOT NULL,
  goal_hash VARCHAR(64), -- Hash of goal for grouping similar executions
  agent_type VARCHAR(50) NOT NULL,
  task_description TEXT NOT NULL,
  task_type VARCHAR(50), -- e.g., 'api_implementation', 'database_migration', 'testing'

  -- Timing information
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Execution status
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'retried', 'conflict', 'timeout', 'cancelled')),
  retry_count INTEGER DEFAULT 0,

  -- Error tracking
  error_type VARCHAR(50),
  error_message TEXT,
  error_stack TEXT,

  -- Context and metadata
  context JSONB, -- Task inputs, environment variables, dependencies, etc.
  dependencies JSONB, -- Array of dependent task IDs
  parallel_execution BOOLEAN DEFAULT false,

  -- Performance metrics
  cpu_usage_percent FLOAT,
  memory_usage_mb FLOAT,

  -- Versioning
  orchestrator_version VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orchestrator_lessons table
-- Stores learned patterns and optimization recommendations
CREATE TABLE orchestrator_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Lesson categorization
  lesson_type VARCHAR(50) NOT NULL CHECK (lesson_type IN (
    'agent_selection',
    'task_ordering',
    'time_estimation',
    'error_prevention',
    'parallel_execution',
    'dependency_optimization',
    'resource_allocation'
  )),

  -- Pattern recognition
  pattern JSONB NOT NULL, -- Structured pattern data (agent_type, task_type, conditions, etc.)
  pattern_hash VARCHAR(64) UNIQUE, -- Hash for quick lookup

  -- Recommendation
  recommendation TEXT NOT NULL,
  alternative_agent VARCHAR(50), -- Suggested alternative agent
  optimal_order INTEGER, -- Suggested execution order

  -- Confidence and effectiveness
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  effectiveness_score FLOAT CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),

  -- Usage tracking
  times_applied INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  times_failed INTEGER DEFAULT 0,

  -- Sample executions
  sample_execution_ids JSONB, -- Array of execution IDs that led to this lesson

  -- Temporal tracking
  first_observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_applied_at TIMESTAMP,
  last_successful_at TIMESTAMP,

  -- Metadata
  created_by VARCHAR(50) DEFAULT 'system', -- 'system' or 'manual'
  tags JSONB, -- Array of tags for categorization

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orchestrator_agent_performance table
-- Aggregated performance metrics per agent type
CREATE TABLE orchestrator_agent_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type VARCHAR(50) NOT NULL,
  task_type VARCHAR(50) NOT NULL,

  -- Aggregated metrics (last 30 days)
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  avg_duration_ms INTEGER,
  min_duration_ms INTEGER,
  max_duration_ms INTEGER,
  p50_duration_ms INTEGER, -- Median
  p95_duration_ms INTEGER,
  p99_duration_ms INTEGER,

  -- Success rate
  success_rate FLOAT,

  -- Error patterns
  common_errors JSONB, -- Array of {error_type, count, last_occurrence}

  -- Resource usage
  avg_cpu_usage_percent FLOAT,
  avg_memory_usage_mb FLOAT,

  -- Last updated
  last_execution_at TIMESTAMP,
  metrics_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(agent_type, task_type)
);

-- Create orchestrator_workflow_patterns table
-- Tracks successful workflow execution paths
CREATE TABLE orchestrator_workflow_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pattern identification
  goal_hash VARCHAR(64) NOT NULL,
  goal_description TEXT NOT NULL,

  -- Execution sequence
  task_sequence JSONB NOT NULL, -- Ordered array of {agent_type, task_type, duration_ms}
  total_duration_ms INTEGER NOT NULL,
  parallel_segments JSONB, -- Array of task groups that ran in parallel

  -- Performance
  execution_count INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER,

  -- Optimization metrics
  optimization_score FLOAT, -- How optimal this pattern is (0-1)
  bottleneck_tasks JSONB, -- Array of tasks that slow down the workflow

  -- First and last execution
  first_execution_id UUID REFERENCES orchestrator_execution_history(id),
  last_execution_id UUID REFERENCES orchestrator_execution_history(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_execution_history_goal_hash ON orchestrator_execution_history(goal_hash);
CREATE INDEX idx_execution_history_agent_type ON orchestrator_execution_history(agent_type);
CREATE INDEX idx_execution_history_task_type ON orchestrator_execution_history(task_type);
CREATE INDEX idx_execution_history_status ON orchestrator_execution_history(status);
CREATE INDEX idx_execution_history_started_at ON orchestrator_execution_history(started_at DESC);
CREATE INDEX idx_execution_history_agent_task ON orchestrator_execution_history(agent_type, task_type);

CREATE INDEX idx_lessons_lesson_type ON orchestrator_lessons(lesson_type);
CREATE INDEX idx_lessons_pattern_hash ON orchestrator_lessons(pattern_hash);
CREATE INDEX idx_lessons_confidence ON orchestrator_lessons(confidence_score DESC);
CREATE INDEX idx_lessons_effectiveness ON orchestrator_lessons(effectiveness_score DESC);
CREATE INDEX idx_lessons_times_applied ON orchestrator_lessons(times_applied DESC);

CREATE INDEX idx_agent_performance_agent_type ON orchestrator_agent_performance(agent_type);
CREATE INDEX idx_agent_performance_task_type ON orchestrator_agent_performance(task_type);
CREATE INDEX idx_agent_performance_success_rate ON orchestrator_agent_performance(success_rate DESC);

CREATE INDEX idx_workflow_patterns_goal_hash ON orchestrator_workflow_patterns(goal_hash);
CREATE INDEX idx_workflow_patterns_optimization_score ON orchestrator_workflow_patterns(optimization_score DESC);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_orchestrator_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_execution_history_updated_at
  BEFORE UPDATE ON orchestrator_execution_history
  FOR EACH ROW
  EXECUTE FUNCTION update_orchestrator_updated_at();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON orchestrator_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_orchestrator_updated_at();

CREATE TRIGGER update_agent_performance_updated_at
  BEFORE UPDATE ON orchestrator_agent_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_orchestrator_updated_at();

CREATE TRIGGER update_workflow_patterns_updated_at
  BEFORE UPDATE ON orchestrator_workflow_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_orchestrator_updated_at();

-- Add comments for documentation
COMMENT ON TABLE orchestrator_execution_history IS 'Records every orchestrator task execution for learning and optimization';
COMMENT ON TABLE orchestrator_lessons IS 'Stores learned patterns and optimization recommendations from execution history';
COMMENT ON TABLE orchestrator_agent_performance IS 'Aggregated performance metrics per agent type and task type';
COMMENT ON TABLE orchestrator_workflow_patterns IS 'Tracks successful workflow execution paths for optimization';

COMMENT ON COLUMN orchestrator_execution_history.goal_hash IS 'MD5 hash of goal text for grouping similar executions';
COMMENT ON COLUMN orchestrator_execution_history.context IS 'JSON containing task inputs, environment, and dependencies';
COMMENT ON COLUMN orchestrator_lessons.pattern IS 'JSON structure describing the recognized pattern';
COMMENT ON COLUMN orchestrator_lessons.confidence_score IS 'How confident we are in this lesson (0-1)';
COMMENT ON COLUMN orchestrator_lessons.effectiveness_score IS 'How effective this lesson has been when applied (0-1)';
COMMENT ON COLUMN orchestrator_workflow_patterns.optimization_score IS 'How optimal this workflow pattern is compared to alternatives (0-1)';
