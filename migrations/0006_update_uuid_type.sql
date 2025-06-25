-- Update emergency_flows table to use UUID type
ALTER TABLE emergency_flows
  ALTER COLUMN id TYPE uuid USING id::uuid;

-- Update users table to use UUID type
ALTER TABLE users
  ALTER COLUMN id TYPE uuid USING id::uuid;

-- Add UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update default value for UUID columns
ALTER TABLE emergency_flows
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE users
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(); 