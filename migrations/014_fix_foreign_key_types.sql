-- Migration: Fix foreign key type mismatches
-- Issue: users.id is UUID but BRDs/PRDs/Conflicts/etc use VARCHAR for foreign keys
-- This causes "operator does not exist: character varying = uuid" errors
-- Solution: Convert all foreign key columns to UUID type

-- Step 1: Add new UUID columns
ALTER TABLE brds ADD COLUMN created_by_uuid UUID;
ALTER TABLE prds ADD COLUMN created_by_uuid UUID;
ALTER TABLE engineering_designs ADD COLUMN created_by_uuid UUID;
ALTER TABLE conflicts ADD COLUMN raised_by_uuid UUID;
ALTER TABLE change_log ADD COLUMN changed_by_uuid UUID;

-- Step 2: Migrate existing data (assuming VARCHAR values are valid UUIDs)
-- If data doesn't exist yet, this will just leave NULLs
UPDATE brds SET created_by_uuid = created_by::UUID WHERE created_by IS NOT NULL AND created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE prds SET created_by_uuid = created_by::UUID WHERE created_by IS NOT NULL AND created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE engineering_designs SET created_by_uuid = created_by::UUID WHERE created_by IS NOT NULL AND created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE conflicts SET raised_by_uuid = raised_by::UUID WHERE raised_by IS NOT NULL AND raised_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE change_log SET changed_by_uuid = changed_by::UUID WHERE changed_by IS NOT NULL AND changed_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Drop old VARCHAR columns
ALTER TABLE brds DROP COLUMN created_by;
ALTER TABLE prds DROP COLUMN created_by;
ALTER TABLE engineering_designs DROP COLUMN created_by;
ALTER TABLE conflicts DROP COLUMN raised_by;
ALTER TABLE change_log DROP COLUMN changed_by;

-- Step 4: Rename UUID columns to original names
ALTER TABLE brds RENAME COLUMN created_by_uuid TO created_by;
ALTER TABLE prds RENAME COLUMN created_by_uuid TO created_by;
ALTER TABLE engineering_designs RENAME COLUMN created_by_uuid TO created_by;
ALTER TABLE conflicts RENAME COLUMN raised_by_uuid TO raised_by;
ALTER TABLE change_log RENAME COLUMN changed_by_uuid TO changed_by;

-- Step 5: Add foreign key constraints
ALTER TABLE brds ADD CONSTRAINT brds_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE prds ADD CONSTRAINT prds_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE engineering_designs ADD CONSTRAINT engineering_designs_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conflicts ADD CONSTRAINT conflicts_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE change_log ADD CONSTRAINT change_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 6: Recreate indexes on foreign key columns
CREATE INDEX idx_brds_created_by_uuid ON brds(created_by);
CREATE INDEX idx_prds_created_by_uuid ON prds(created_by);
CREATE INDEX idx_engineering_designs_created_by_uuid ON engineering_designs(created_by);
CREATE INDEX idx_conflicts_raised_by_uuid ON conflicts(raised_by);
CREATE INDEX idx_change_log_changed_by_uuid ON change_log(changed_by);

-- Step 7: Also fix timeline columns in BRDs (if needed)
-- BRDs have separate timeline_start_date and timeline_target_date columns instead of JSON
-- This was already correct in migration 007

COMMENT ON TABLE brds IS 'Business Requirements Documents with UUID foreign keys';
COMMENT ON TABLE prds IS 'Product Requirements Documents with UUID foreign keys';
COMMENT ON TABLE engineering_designs IS 'Engineering Design documents with UUID foreign keys';
COMMENT ON TABLE conflicts IS 'Conflict resolution tracking with UUID foreign keys';
COMMENT ON TABLE change_log IS 'Change log with UUID foreign keys';
