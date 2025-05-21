-- Organizations Table Migration
-- This script creates the organizations table and related tables for multi-tenant support

-- Create Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR PRIMARY KEY NOT NULL,
  name VARCHAR NOT NULL,
  plan VARCHAR DEFAULT 'free',
  logo VARCHAR,
  website VARCHAR,
  industry VARCHAR,
  size INTEGER,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Organization Members Table
CREATE TABLE IF NOT EXISTS organization_members (
  id SERIAL PRIMARY KEY,
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  role VARCHAR DEFAULT 'member',
  invite_status VARCHAR DEFAULT 'pending',
  invite_token VARCHAR,
  invite_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id VARCHAR REFERENCES organizations(id);

-- Add missing column to analytics table
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS organization_id VARCHAR REFERENCES organizations(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_organization_id ON analytics(organization_id);

-- For backward compatibility with existing data in MemStorage
-- Create the admin organization
INSERT INTO organizations (id, name, plan, created_at, updated_at)
VALUES ('1', 'Dana AI', 'enterprise', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Link existing user to the admin organization
UPDATE users SET organization_id = '1' WHERE id = '1' AND organization_id IS NULL;

-- Add existing user as an admin in the organization
INSERT INTO organization_members (organization_id, user_id, role, invite_status, created_at, updated_at)
VALUES ('1', '1', 'admin', 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Update analytics table to add organization_id
UPDATE analytics SET organization_id = '1' WHERE user_id = '1' AND organization_id IS NULL;