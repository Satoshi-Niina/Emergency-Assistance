INSERT INTO users (id, username, password, role, display_name, department, created_at) 
VALUES (
  gen_random_uuid(),
  'niina',
  '$2a$10$g7w8RG1vMlz14s2Ew2GNVeHJqhki5rqHsksBzE4djaO1usSPmd1jO',
  'admin',
  'Niina',
  'Operations',
  NOW()
);