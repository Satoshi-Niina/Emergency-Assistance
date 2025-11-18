-- =====================================================
-- Emergency Assistance - Production Admin User Seed
-- =====================================================
-- Usage:
-- psql $DATABASE_URL -f scripts/seed-admin-user.sql
-- =====================================================

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' NOT NULL,
    department TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Delete existing admin user to fix password mismatch
DELETE FROM users WHERE username = 'admin';

-- Create admin user
-- Username: admin
-- Password: admin
-- bcrypt hash (saltRounds=10): $2a$10$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m
INSERT INTO users (username, password, display_name, role, department, description)
VALUES (
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m',
    'Administrator',
    'admin',
    'System Administration',
    'Default admin account'
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    description = EXCLUDED.description;

-- Create test employee user (optional)
-- Username: testuser
-- Password: testuser
INSERT INTO users (username, password, display_name, role, department, description)
VALUES (
    'testuser',
    '$2a$10$rN.EHQqYOYdw3B7E6R7tM.7XGQZvZKxLZKZ0Z5Yq9YJQZvZKxLZKZ',
    'Test User',
    'employee',
    'Test Department',
    'Test account'
)
ON CONFLICT (username) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Verification
SELECT
    'Seed completed' AS status,
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE role = 'admin') AS admin_count,
    COUNT(*) FILTER (WHERE role = 'employee') AS employee_count
FROM users;

-- Display created users
SELECT
    id,
    username,
    display_name,
    role,
    department,
    created_at
FROM users
ORDER BY created_at DESC;
