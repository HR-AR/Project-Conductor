-- Demo Comments Seed Data
-- Note: Comments are typically stored in the comments table with foreign keys to requirements
-- For now, we'll create a simplified version as comments are already embedded in conflicts

-- This file is a placeholder for future requirement-level comments
-- Comments on conflicts are already included in the conflicts seed file (005-demo-conflicts.sql)

-- If you need to add comments to specific requirements, follow this pattern:
-- INSERT INTO comments (id, requirement_id, user_id, content, parent_id, created_at, updated_at)
-- VALUES (...)

SELECT 'Demo comments are embedded in conflicts. See 005-demo-conflicts.sql' as note;

-- Summary
SELECT
  'Comments System' as component,
  'Comments embedded in conflicts via discussion JSONB field' as implementation,
  'Ready for investor demo' as status;
