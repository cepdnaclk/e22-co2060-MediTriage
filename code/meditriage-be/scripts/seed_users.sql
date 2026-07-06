-- PostgreSQL seed script for doctor and nurse accounts
-- All accounts use password: (bcrypt hash: $2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K)

-- Insert into users
INSERT INTO users (id, role, license_number, full_name, created_at, updated_at) VALUES
('40751a02-5e60-4b71-b0e6-76479b1836c8', 'NURSE', 'NUR-001', 'Nurse Sarah Jenkins', NOW(), NOW()),
('be6922ca-3cf1-4560-98ee-629dfce45c7d', 'NURSE', 'NUR-002', 'Nurse Michael Chang', NOW(), NOW()),
('17498c8c-1e82-4217-91a5-8be4fbfeeb6c', 'NURSE', 'NUR-003', 'Nurse Elena Rostova', NOW(), NOW()),
('b903e1e9-4e78-433b-a193-9c869ea0b18f', 'NURSE', 'NUR-004', 'Nurse David Kojo', NOW(), NOW()),
('2b737190-252f-48d0-9d04-1bbf19177a7f', 'NURSE', 'NUR-005', 'Nurse Aisha Patel', NOW(), NOW()),
('7279c6fa-502a-436d-97e3-cc62e15779c1', 'DOCTOR', 'DOC-001', 'Dr. Thomas Wayne', NOW(), NOW()),
('12d99db4-4062-432d-8b01-ee44cb68019a', 'DOCTOR', 'DOC-002', 'Dr. Lisa Cuddy', NOW(), NOW()),
('6d65f577-3e5e-473d-82d2-28682e0e0ab7', 'DOCTOR', 'DOC-003', 'Dr. Gregory House', NOW(), NOW()),
('933b9b47-38e4-4c48-b4b7-b08e3328e1d6', 'DOCTOR', 'DOC-004', 'Dr. Allison Cameron', NOW(), NOW()),
('8264ad7f-947b-401d-91b5-12cf51d9bb20', 'DOCTOR', 'DOC-005', 'Dr. Robert Chase', NOW(), NOW());

-- Insert into auths
INSERT INTO auths (id, user_id, username, email, hashed_password, is_active, last_login, created_at, updated_at) VALUES
('b388b1cc-1a13-4c9b-b6fb-ea7d23d8c119', '40751a02-5e60-4b71-b0e6-76479b1836c8', 'nurse1', 'nurse1@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('cf42918b-59d4-4bb0-80be-7c9172bb192b', 'be6922ca-3cf1-4560-98ee-629dfce45c7d', 'nurse2', 'nurse2@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('5142a787-8d02-4b21-827c-fb8dc48c08ec', '17498c8c-1e82-4217-91a5-8be4fbfeeb6c', 'nurse3', 'nurse3@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('914d45be-047f-4424-9b5a-ec77ef62cb5c', 'b903e1e9-4e78-433b-a193-9c869ea0b18f', 'nurse4', 'nurse4@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('727d11ec-3323-4fae-9d29-619fcdbe4523', '2b737190-252f-48d0-9d04-1bbf19177a7f', 'nurse5', 'nurse5@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('497c27cc-5dfb-4029-bb11-47701460d3d5', '7279c6fa-502a-436d-97e3-cc62e15779c1', 'doctor1', 'doctor1@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('d9bf872b-87b6-455b-9d4f-37656911c479', '12d99db4-4062-432d-8b01-ee44cb68019a', 'doctor2', 'doctor2@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('2127ef67-17cb-4977-bc6d-a19c5c24e658', '6d65f577-3e5e-473d-82d2-28682e0e0ab7', 'doctor3', 'doctor3@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('9286d3d6-444f-4d91-87ab-ee9fb23d8c11', '933b9b47-38e4-4c48-b4b7-b08e3328e1d6', 'doctor4', 'doctor4@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW()),
('e12739fa-5178-43d9-95cb-64908fb2e71f', '8264ad7f-947b-401d-91b5-12cf51d9bb20', 'doctor5', 'doctor5@meditriage.com', '$2b$12$vKgjB/asgjwCZ5WV.6RC7u/1PH8IV2jPRJvQADVgJo15qAxkRWI6K', TRUE, NULL, NOW(), NOW());
