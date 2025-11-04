CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "unaccent";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted', 'pending_verification');

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE role_type AS ENUM ('tenant', 'landlord', 'agent', 'admin', 'super_admin');

CREATE TYPE otp_channel AS ENUM ('email','phone');

CREATE TYPE rental_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

CREATE TYPE property_status AS ENUM ('draft', 'active', 'rented', 'maintenance', 'deleted', 'pending_approval');

CREATE TYPE media_type AS ENUM ('photo', 'video', '360_photo', 'floorplan', 'document');

CREATE TYPE availability_status AS ENUM ('available', 'booked', 'blocked', 'maintenance');

CREATE TYPE cancellation_policy AS ENUM ('strict', 'moderate', 'flexible', 'super_strict');

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'expired');

CREATE TYPE contract_status AS ENUM ('draft', 'active', 'terminated', 'expired', 'cancelled');

CREATE TYPE payment_type AS ENUM ('mobile_money', 'bank_card', 'bank_transfer', 'cash', 'crypto');

CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');

CREATE TYPE transaction_type AS ENUM (
    'rent_payment', 'deposit_payment', 'commission', 'refund', 
    'withdrawal', 'deposit', 'fee', 'penalty', 'bonus'
);

CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'blocked', 'closed');

CREATE TYPE participant_role AS ENUM ('participant', 'moderator', 'admin');

CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system', 'booking_request');

CREATE TYPE review_type AS ENUM ('property_review', 'user_review', 'mutual_review');

CREATE TYPE review_status AS ENUM ('pending', 'published', 'rejected', 'hidden');

CREATE TYPE notification_type AS ENUM (
    'message', 'booking', 'payment', 'review', 'system', 
    'property_update', 'verification', 'promotion'
);

CREATE TYPE alert_frequency AS ENUM ('immediate', 'daily', 'weekly', 'monthly');

CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(50) UNIQUE NOT NULL,
  role_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permission (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permission (
  role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permission(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    status user_status DEFAULT 'pending_verification',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    phone_verification_code VARCHAR(10),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    role_id UUID NOT NULL REFERENCES roles(role_id)
);


CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    date_of_birth DATE,
    gender gender_type,
    profession VARCHAR(100),
    bio TEXT,
    preferred_language VARCHAR(5) DEFAULT 'fr',
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(2) DEFAULT 'TG',
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "sms": false,
        "push": true,
        "marketing": false
    }'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "show_phone": true,
        "show_email": false,
        "show_profile": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  channel otp_channel NOT NULL DEFAULT 'email'::otp_channel,
  target VARCHAR(255) NOT NULL,          -- email (minuscules) ou phone (E.164)
  code VARCHAR(64) NOT NULL,             -- OTP (6 chiffres ou token jusqu'à 64 chars)
  purpose VARCHAR(64) DEFAULT 'verification', -- 'email_verification', 'phone_reset', etc.
  attempts SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_target_channel ON otp_codes (lower(target), channel);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON otp_codes (code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);


CREATE TABLE IF NOT EXISTS login_history (
  login_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45), -- Compatible IPv4 et IPv6
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO roles (role_name, role_description)
VALUES ('super_admin', 'Administrateur principal with all permissions')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO permission (permission_name)
VALUES
('properties:create'),
('properties:read:all'),
('properties:update:own'),
('properties:update:any'),
('properties:delete'),
('properties:moderate'),
('users:read:own'),
('users:update:own'),
('users:read:all'),
('users:update:any'),
('users:delete'),
('bookings:create'),
('bookings:read:own'),
('bookings:read:all'),
('bookings:cancel'),
('admin:access'),
('admin:moderate'),
('admin:settings')
ON CONFLICT (permission_name) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permission p
WHERE r.role_name = 'super_admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permission rp 
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
);

INSERT INTO users (email, password_hash, status, email_verified, role_id)
VALUES (
    'esseyjoseph17@gmail.com',
    '$2b$10$yvOg5ghQJ2xGnHBAUSnD/OBeHz8y2trwSRcssO7WOr5S04Rof1yR2',
    'active',
    TRUE,
    (SELECT role_id FROM roles WHERE role_name = 'super_admin')
)