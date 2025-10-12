-- Demo Users Seed Data
-- Creates sample users for testing the complete workflow

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clear existing demo users (optional - comment out if you want to keep existing users)
-- DELETE FROM users WHERE username LIKE 'demo.%';

-- Insert demo users with various roles
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active) VALUES
  -- Business stakeholders
  ('550e8400-e29b-41d4-a716-446655440001', 'demo.sarah.chen', 'sarah.chen@projectconductor.demo', '$2a$10$placeholder', 'Sarah', 'Chen', 'admin', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'demo.mike.johnson', 'mike.johnson@projectconductor.demo', '$2a$10$placeholder', 'Mike', 'Johnson', 'user', true),

  -- Product managers
  ('550e8400-e29b-41d4-a716-446655440003', 'demo.alex.rivera', 'alex.rivera@projectconductor.demo', '$2a$10$placeholder', 'Alex', 'Rivera', 'user', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'demo.priya.patel', 'priya.patel@projectconductor.demo', '$2a$10$placeholder', 'Priya', 'Patel', 'user', true),

  -- Engineering leads
  ('550e8400-e29b-41d4-a716-446655440005', 'demo.david.kim', 'david.kim@projectconductor.demo', '$2a$10$placeholder', 'David', 'Kim', 'user', true),
  ('550e8400-e29b-41d4-a716-446655440006', 'demo.emily.zhang', 'emily.zhang@projectconductor.demo', '$2a$10$placeholder', 'Emily', 'Zhang', 'user', true),

  -- Security specialist (for conflict detection demo)
  ('550e8400-e29b-41d4-a716-446655440007', 'demo.security.agent', 'security@projectconductor.demo', '$2a$10$placeholder', 'Security', 'Agent', 'user', true),

  -- TPM (Technical Program Manager)
  ('550e8400-e29b-41d4-a716-446655440008', 'demo.james.wilson', 'james.wilson@projectconductor.demo', '$2a$10$placeholder', 'James', 'Wilson', 'user', true)
ON CONFLICT (username) DO NOTHING;

-- Verify users created
SELECT
  id,
  username,
  CONCAT(first_name, ' ', last_name) as full_name,
  role
FROM users
WHERE username LIKE 'demo.%'
ORDER BY username;

-- Summary
SELECT
  'Demo Users Created' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users
FROM users
WHERE username LIKE 'demo.%';
