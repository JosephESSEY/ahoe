CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Status utilisateur
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted', 'pending_verification');

-- Genre
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Types de rôles utilisateur
CREATE TYPE role_type AS ENUM ('tenant', 'landlord', 'agent', 'admin', 'super_admin');

CREATE TYPE otp_channel AS ENUM ('email','phone');

-- Types de propriété
CREATE TYPE rental_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- Status propriété
CREATE TYPE property_status AS ENUM ('draft', 'active', 'rented', 'maintenance', 'deleted', 'pending_approval');

-- Types de médias
CREATE TYPE media_type AS ENUM ('photo', 'video', '360_photo', 'floorplan', 'document');

-- Status disponibilité
CREATE TYPE availability_status AS ENUM ('available', 'booked', 'blocked', 'maintenance');

-- Politique d'annulation
CREATE TYPE cancellation_policy AS ENUM ('strict', 'moderate', 'flexible', 'super_strict');

-- Status demande de réservation
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'expired');

-- Status contrat
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'terminated', 'expired', 'cancelled');

-- Types de paiement
CREATE TYPE payment_type AS ENUM ('mobile_money', 'bank_card', 'bank_transfer', 'cash', 'crypto');

-- Status transaction
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'refunded');

-- Types de transaction
CREATE TYPE transaction_type AS ENUM (
    'rent_payment', 'deposit_payment', 'commission', 'refund', 
    'withdrawal', 'deposit', 'fee', 'penalty', 'bonus'
);

-- Status conversation
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'blocked', 'closed');

-- Rôle participant
CREATE TYPE participant_role AS ENUM ('participant', 'moderator', 'admin');

-- Types de message
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system', 'booking_request');

-- Types d'avis
CREATE TYPE review_type AS ENUM ('property_review', 'user_review', 'mutual_review');

-- Status avis
CREATE TYPE review_status AS ENUM ('pending', 'published', 'rejected', 'hidden');

-- Types de notification
CREATE TYPE notification_type AS ENUM (
    'message', 'booking', 'payment', 'review', 'system', 
    'property_update', 'verification', 'promotion'
);

-- Fréquence alertes
CREATE TYPE alert_frequency AS ENUM ('immediate', 'daily', 'weekly', 'monthly');

-- ===========================================
-- TABLES PRINCIPALES
-- ===========================================

CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(50) UNIQUE NOT NULL,
  role_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Table PERMISSION
CREATE TABLE IF NOT EXISTS permission (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table ROLEPERMISSION
CREATE TABLE IF NOT EXISTS role_permission (
  role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permission(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Table des utilisateurs
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

-- Profils utilisateur
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

-- Indexes utiles
CREATE INDEX IF NOT EXISTS idx_otp_codes_target_channel ON otp_codes (lower(target), channel);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON otp_codes (code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);



-- Catégories de propriété
CREATE TABLE property_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    name_fr VARCHAR(50) NOT NULL,
    name_ee VARCHAR(50),
    name_kbp VARCHAR(50),
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Propriétés
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES property_categories(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Localisation
    country VARCHAR(2) DEFAULT 'TG',
    city VARCHAR(50) NOT NULL,
    district VARCHAR(100),
    street_address TEXT,
    postal_code VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    landmarks TEXT[] DEFAULT '{}',
    
    -- Caractéristiques physiques
    surface_area INTEGER CHECK (surface_area > 0),
    bedrooms INTEGER DEFAULT 0 CHECK (bedrooms >= 0),
    bathrooms INTEGER DEFAULT 0 CHECK (bathrooms >= 0),
    living_rooms INTEGER DEFAULT 0 CHECK (living_rooms >= 0),
    kitchens INTEGER DEFAULT 0 CHECK (kitchens >= 0),
    total_rooms INTEGER CHECK (total_rooms > 0),
    floor_number INTEGER,
    total_floors INTEGER,
    
    -- Équipements boolean
    has_elevator BOOLEAN DEFAULT FALSE,
    has_parking BOOLEAN DEFAULT FALSE,
    parking_spaces INTEGER DEFAULT 0 CHECK (parking_spaces >= 0),
    has_garden BOOLEAN DEFAULT FALSE,
    has_pool BOOLEAN DEFAULT FALSE,
    has_security BOOLEAN DEFAULT FALSE,
    has_generator BOOLEAN DEFAULT FALSE,
    has_cash_power BOOLEAN DEFAULT FALSE,
    has_solar BOOLEAN DEFAULT FALSE,
    
    -- Équipements et services (flexible)
    amenities JSONB DEFAULT '[]'::jsonb,
    utilities_included JSONB DEFAULT '[]'::jsonb,
    house_rules JSONB DEFAULT '[]'::jsonb,
    
    -- Métadonnées
    status property_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    
    -- SEO et recherche
    slug VARCHAR(255) UNIQUE,
    search_keywords TEXT,
    meta_title VARCHAR(200),
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT valid_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
);

-- Médias des propriétés
CREATE TABLE property_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    media_type media_type NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(100),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    file_size BIGINT,
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- Pour vidéos en secondes
    is_primary BOOLEAN DEFAULT FALSE,
    alt_text VARCHAR(255), -- Pour accessibilité
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_dimensions CHECK (
        (width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)
    ),
    CONSTRAINT valid_duration CHECK (duration IS NULL OR duration > 0)
);

-- Tarification des propriétés
CREATE TABLE property_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    rental_type rental_type NOT NULL,
    base_price INTEGER NOT NULL CHECK (base_price > 0),
    currency VARCHAR(3) DEFAULT 'XOF',
    
    -- Coûts additionnels
    security_deposit INTEGER DEFAULT 0 CHECK (security_deposit >= 0),
    agency_fees INTEGER DEFAULT 0 CHECK (agency_fees >= 0),
    cleaning_fees INTEGER DEFAULT 0 CHECK (cleaning_fees >= 0),
    utilities_cap INTEGER DEFAULT 0 CHECK (utilities_cap >= 0),
    
    -- Tarification avancée
    seasonal_pricing JSONB DEFAULT '{}'::jsonb,
    weekend_multiplier DECIMAL(3,2) DEFAULT 1.00,
    
    -- Conditions
    minimum_stay INTEGER DEFAULT 1 CHECK (minimum_stay > 0),
    maximum_stay INTEGER CHECK (maximum_stay IS NULL OR maximum_stay >= minimum_stay),
    advance_notice_hours INTEGER DEFAULT 24 CHECK (advance_notice_hours >= 0),
    cancellation_policy cancellation_policy DEFAULT 'moderate',
    
    -- Options
    is_negotiable BOOLEAN DEFAULT FALSE,
    instant_booking BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un type de location par propriété
    UNIQUE(property_id, rental_type)
);

-- Disponibilités des propriétés
CREATE TABLE property_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    availability_status availability_status NOT NULL,
    price_override INTEGER CHECK (price_override IS NULL OR price_override > 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    
    -- Éviter les chevauchements pour même propriété
    EXCLUDE USING GIST (
        property_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    )
);

-- Demandes de réservation
CREATE TABLE booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Détails de la demande
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rental_type rental_type NOT NULL,
    guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0),
    
    -- Calcul tarifaire
    base_amount INTEGER NOT NULL CHECK (base_amount > 0),
    fees_amount INTEGER DEFAULT 0 CHECK (fees_amount >= 0),
    total_amount INTEGER NOT NULL CHECK (total_amount > 0),
    security_deposit INTEGER DEFAULT 0 CHECK (security_deposit >= 0),
    currency VARCHAR(3) DEFAULT 'XOF',
    
    -- Communication
    message TEXT,
    response_message TEXT,
    special_requests TEXT,
    
    -- Status et timing
    request_status request_status DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_total CHECK (total_amount = base_amount + fees_amount),
    CONSTRAINT different_users CHECK (tenant_id != landlord_id)
);

-- Contrats de location
CREATE TABLE rental_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_request_id UUID REFERENCES booking_requests(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    tenant_id UUID NOT NULL REFERENCES users(id),
    landlord_id UUID NOT NULL REFERENCES users(id),
    
    -- Détails du contrat
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent INTEGER NOT NULL CHECK (monthly_rent > 0),
    security_deposit INTEGER NOT NULL CHECK (security_deposit >= 0),
    
    -- Documents et signatures
    contract_document_url TEXT,
    signed_by_tenant BOOLEAN DEFAULT FALSE,
    signed_by_landlord BOOLEAN DEFAULT FALSE,
    tenant_signature_url TEXT,
    landlord_signature_url TEXT,
    tenant_signed_at TIMESTAMP WITH TIME ZONE,
    landlord_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Conditions
    terms_and_conditions TEXT,
    special_clauses TEXT[] DEFAULT '{}',
    
    -- État du contrat
    contract_status contract_status DEFAULT 'draft',
    termination_reason TEXT,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT different_users CHECK (tenant_id != landlord_id)
);

-- Méthodes de paiement
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type payment_type NOT NULL,
    provider VARCHAR(20) NOT NULL,
    
    -- Données cryptées
    account_number_encrypted TEXT,
    account_name VARCHAR(100),
    bank_name VARCHAR(100),
    card_last_four VARCHAR(4),
    
    -- Métadonnées
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Comptes portefeuille
CREATE TABLE wallet_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance BIGINT DEFAULT 0 CHECK (balance >= 0), -- En centimes FCFA
    frozen_balance BIGINT DEFAULT 0 CHECK (frozen_balance >= 0),
    total_received BIGINT DEFAULT 0 CHECK (total_received >= 0),
    total_sent BIGINT DEFAULT 0 CHECK (total_sent >= 0),
    currency VARCHAR(3) DEFAULT 'XOF',
    is_active BOOLEAN DEFAULT TRUE,
    daily_limit BIGINT DEFAULT 1000000, -- 10,000 FCFA en centimes
    monthly_limit BIGINT DEFAULT 50000000, -- 500,000 FCFA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    related_user_id UUID REFERENCES users(id),
    property_id UUID REFERENCES properties(id),
    contract_id UUID REFERENCES rental_contracts(id),
    booking_id UUID REFERENCES booking_requests(id),
    
    -- Détails transaction
    transaction_type transaction_type NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0), -- En centimes
    currency VARCHAR(3) DEFAULT 'XOF',
    fees BIGINT DEFAULT 0 CHECK (fees >= 0),
    net_amount BIGINT NOT NULL CHECK (net_amount > 0),
    
    -- Méthode de paiement
    payment_method VARCHAR(20),
    payment_provider VARCHAR(20),
    external_transaction_id VARCHAR(100),
    
    -- Status et métadonnées
    transaction_status transaction_status DEFAULT 'pending',
    failure_reason TEXT,
    admin_notes TEXT,
    
    -- Références
    description TEXT,
    reference_number VARCHAR(50) UNIQUE,
    receipt_url TEXT,
    
    -- Horodatage
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_amounts CHECK (net_amount = amount - fees),
    CONSTRAINT valid_users CHECK (
        (related_user_id IS NULL) OR (user_id != related_user_id)
    )
);

-- Frais de la plateforme
CREATE TABLE platform_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    fee_type VARCHAR(30) NOT NULL,
    percentage_rate DECIMAL(5,2) CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
    fixed_amount BIGINT CHECK (fixed_amount >= 0),
    calculated_amount BIGINT NOT NULL CHECK (calculated_amount >= 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES booking_requests(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(200),
    conversation_status conversation_status DEFAULT 'active',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants aux conversations
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    participant_role participant_role DEFAULT 'participant',
    is_muted BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    
    UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    
    -- Contenu du message
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Gestion des modifications
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    original_content TEXT,
    
    -- Réponses et références
    reply_to_message_id UUID REFERENCES messages(id),
    
    -- Suppression logique
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status de lecture des messages
CREATE TABLE message_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

-- Évaluations et avis
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    contract_id UUID REFERENCES rental_contracts(id),
    booking_id UUID REFERENCES booking_requests(id),
    
    -- Type et catégorie
    review_type review_type NOT NULL,
    
    -- Notes détaillées (1-5)
    overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    location_rating INTEGER CHECK (location_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
    checkin_rating INTEGER CHECK (checkin_rating BETWEEN 1 AND 5),
    
    -- Contenu de l'avis
    title VARCHAR(200),
    comment TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    
    -- Recommandations
    would_recommend BOOLEAN,
    would_rent_again BOOLEAN,
    
    -- Statut et modération
    review_status review_status DEFAULT 'pending',
    moderation_notes TEXT,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Réponse du destinataire
    response TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    
    -- Engagement
    helpful_votes INTEGER DEFAULT 0,
    unhelpful_votes INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT different_users CHECK (reviewer_id != reviewee_id),
    CONSTRAINT valid_ratings CHECK (
        overall_rating IS NOT NULL AND
        (cleanliness_rating IS NULL OR cleanliness_rating <= overall_rating + 1) AND
        (communication_rating IS NULL OR communication_rating <= overall_rating + 1)
    )
);

-- Votes d'utilité des avis
CREATE TABLE review_helpfulness_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Type et contenu
    notification_type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Données contextuelles
    related_entity_type VARCHAR(20),
    related_entity_id UUID,
    action_url TEXT,
    deep_link TEXT, -- Pour app mobile
    
    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Canaux de diffusion
    sent_push BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_sms BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Préférences de notification
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Préférences par type de notification
    booking_notifications JSONB DEFAULT '{"push": true, "email": true, "sms": false}'::jsonb,
    message_notifications JSONB DEFAULT '{"push": true, "email": false, "sms": false}'::jsonb,
    payment_notifications JSONB DEFAULT '{"push": true, "email": true, "sms": true}'::jsonb,
    review_notifications JSONB DEFAULT '{"push": true, "email": true, "sms": false}'::jsonb,
    property_notifications JSONB DEFAULT '{"push": true, "email": true, "sms": false}'::jsonb,
    system_notifications JSONB DEFAULT '{"push": true, "email": false, "sms": false}'::jsonb,
    marketing_notifications JSONB DEFAULT '{"push": false, "email": false, "sms": false}'::jsonb,
    
    -- Fréquence des résumés
    daily_digest BOOLEAN DEFAULT FALSE,
    weekly_digest BOOLEAN DEFAULT TRUE,
    monthly_digest BOOLEAN DEFAULT FALSE,
    
    -- Heures de silence
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'Africa/Lome',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recherches sauvegardées
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Paramètres de recherche
    name VARCHAR(100) NOT NULL,
    search_params JSONB NOT NULL,
    
    -- Alertes
    alert_enabled BOOLEAN DEFAULT TRUE,
    alert_frequency alert_frequency DEFAULT 'daily',
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    last_results_count INTEGER DEFAULT 0,
    
    -- Statistiques d'utilisation
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Propriétés favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, property_id)
);

-- Paramètres administrateur
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    is_editable BOOLEAN DEFAULT TRUE,
    validation_schema JSONB,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs d'activité
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    
    -- Action et contexte
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30),
    entity_id UUID,
    
    -- Métadonnées détaillées
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Informations techniques
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    device_info JSONB,
    
    -- Géolocalisation (approximative)
    country VARCHAR(2),
    city VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les signalements
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES users(id),
    reported_property_id UUID REFERENCES properties(id),
    reported_review_id UUID REFERENCES reviews(id),
    reported_message_id UUID REFERENCES messages(id),
    
    report_type VARCHAR(30) NOT NULL, -- fraud, inappropriate, spam, etc.
    reason TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, investigating, resolved, dismissed
    admin_notes TEXT,
    action_taken VARCHAR(100),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- VUES MATÉRIALISÉES POUR PERFORMANCES
-- ===========================================

-- Vue des statistiques des propriétés
CREATE MATERIALIZED VIEW property_stats AS
SELECT 
    p.id,
    p.title,
    p.city,
    p.district,
    p.status,
    p.owner_id,
    pc.name as category_name,
    pp.base_price,
    pp.rental_type,
    p.view_count,
    p.favorite_count,
    p.contact_count,
    
    -- Statistiques des avis
    COALESCE(r.avg_overall_rating, 0) as avg_overall_rating,
    COALESCE(r.avg_cleanliness_rating, 0) as avg_cleanliness_rating,
    COALESCE(r.avg_communication_rating, 0) as avg_communication_rating,
    COALESCE(r.avg_location_rating, 0) as avg_location_rating,
    COALESCE(r.avg_value_rating, 0) as avg_value_rating,
    COALESCE(r.review_count, 0) as review_count,
    
    -- Score de popularité combiné
    (
        COALESCE(r.avg_overall_rating, 0) * 0.4 +
        (p.view_count / 100.0) * 0.2 +
        (p.favorite_count / 10.0) * 0.2 +
        (COALESCE(r.review_count, 0) / 5.0) * 0.2
    ) as popularity_score,
    
    -- Statistiques temporelles
    p.created_at,
    p.updated_at,
    p.published_at,
    
    -- Coordonnées pour recherche géographique
    p.latitude,
    p.longitude

FROM properties p
LEFT JOIN property_categories pc ON p.id = pc.id
LEFT JOIN property_pricing pp ON p.id = pp.property_id AND pp.is_active = TRUE
LEFT JOIN (
    SELECT 
        property_id,
        AVG(overall_rating::decimal) as avg_overall_rating,
        AVG(NULLIF(cleanliness_rating, 0)::decimal) as avg_cleanliness_rating,
        AVG(NULLIF(communication_rating, 0)::decimal) as avg_communication_rating,
        AVG(NULLIF(location_rating, 0)::decimal) as avg_location_rating,
        AVG(NULLIF(value_rating, 0)::decimal) as avg_value_rating,
        COUNT(*) as review_count
    FROM reviews 
    WHERE review_status = 'published'
    GROUP BY property_id
) r ON p.id = r.property_id
WHERE p.status = 'active';

-- Index sur les vues matérialisées
CREATE INDEX idx_property_stats_location ON property_stats (city, district);
CREATE INDEX idx_property_stats_price ON property_stats (base_price, rental_type);
CREATE INDEX idx_property_stats_rating ON property_stats (avg_overall_rating DESC);
CREATE INDEX idx_property_stats_popularity ON property_stats (popularity_score DESC);
CREATE INDEX idx_property_stats_coords ON property_stats (latitude, longitude) WHERE latitude IS NOT NULL;

-- Vue des analytics utilisateur
CREATE MATERIALIZED VIEW user_analytics AS
SELECT 
    u.id as user_id,
    up.first_name,
    up.last_name,
    u.email,
    u.status,
    u.created_at as registration_date,
    u.last_login,
    
    -- Types de rôles
    COALESCE(
        array_agg(ur.role_type) FILTER (WHERE ur.role_type IS NOT NULL),
        '{}'::role_type[]
    ) as roles,
    
    -- Vérifications
    BOOL_OR(ur.is_verified) as is_any_role_verified,
    u.email_verified,
    u.phone_verified,
    
    -- Statistiques en tant que propriétaire
    COALESCE(landlord_stats.active_properties, 0) as active_properties,
    COALESCE(landlord_stats.total_bookings, 0) as total_bookings_as_landlord,
    COALESCE(landlord_stats.total_revenue, 0) as total_revenue,
    COALESCE(landlord_stats.avg_rating_received, 0) as avg_rating_as_landlord,
    
    -- Statistiques en tant que locataire
    COALESCE(tenant_stats.completed_bookings, 0) as completed_bookings_as_tenant,
    COALESCE(tenant_stats.avg_rating_given, 0) as avg_rating_given,
    
    -- Engagement général
    COALESCE(engagement.reviews_written, 0) as reviews_written,
    COALESCE(engagement.messages_sent, 0) as messages_sent,
    COALESCE(engagement.favorites_count, 0) as favorites_count,
    
    -- Activité récente (30 derniers jours)
    COALESCE(recent_activity.recent_logins, 0) as recent_logins,
    COALESCE(recent_activity.recent_views, 0) as recent_property_views

FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN (
    SELECT 
        p.owner_id,
        COUNT(*) FILTER (WHERE p.status = 'active') as active_properties,
        COUNT(DISTINCT br.id) FILTER (WHERE br.request_status = 'approved') as total_bookings,
        COALESCE(SUM(br.total_amount) FILTER (WHERE br.request_status = 'approved'), 0) as total_revenue,
        AVG(r.overall_rating) FILTER (WHERE r.review_status = 'published') as avg_rating_received
    FROM properties p
    LEFT JOIN booking_requests br ON p.id = br.property_id
    LEFT JOIN reviews r ON p.id = r.property_id
    GROUP BY p.owner_id
) landlord_stats ON u.id = landlord_stats.owner_id
LEFT JOIN (
    SELECT 
        br.tenant_id,
        COUNT(*) FILTER (WHERE br.request_status = 'approved') as completed_bookings,
        AVG(r.overall_rating) FILTER (WHERE r.review_status = 'published') as avg_rating_given
    FROM booking_requests br
    LEFT JOIN reviews r ON br.id = r.booking_id AND r.reviewer_id = br.tenant_id
    GROUP BY br.tenant_id
) tenant_stats ON u.id = tenant_stats.tenant_id
LEFT JOIN (
    SELECT 
        reviewer_id,
        COUNT(DISTINCT id) as reviews_written,
        COUNT(DISTINCT sender_id) as messages_sent,
        COUNT(DISTINCT f.id) as favorites_count
    FROM (
        SELECT reviewer_id, id FROM reviews
        UNION ALL
        SELECT sender_id as reviewer_id, id FROM messages
    ) combined
    LEFT JOIN favorites f ON f.user_id = combined.reviewer_id
    GROUP BY reviewer_id
) engagement ON u.id = engagement.reviewer_id
LEFT JOIN (
    SELECT 
        al.user_id,
        COUNT(*) FILTER (WHERE al.action = 'login' AND al.created_at > NOW() - INTERVAL '30 days') as recent_logins,
        COUNT(*) FILTER (WHERE al.action = 'view_property' AND al.created_at > NOW() - INTERVAL '30 days') as recent_views
    FROM activity_logs al
    GROUP BY al.user_id
) recent_activity ON u.id = recent_activity.user_id

GROUP BY 
    u.id, up.first_name, up.last_name, u.email, u.status, u.registration_date, 
    u.last_login, u.email_verified, u.phone_verified,
    landlord_stats.active_properties, landlord_stats.total_bookings, 
    landlord_stats.total_revenue, landlord_stats.avg_rating_received,
    tenant_stats.completed_bookings, tenant_stats.avg_rating_given,
    engagement.reviews_written, engagement.messages_sent, engagement.favorites_count,
    recent_activity.recent_logins, recent_activity.recent_views;

-- ===========================================
-- INDEX POUR PERFORMANCES
-- ===========================================

-- Index utilisateurs
CREATE INDEX CONCURRENTLY idx_users_email ON users USING HASH (email);
CREATE INDEX CONCURRENTLY idx_users_phone ON users USING HASH (phone);
CREATE INDEX CONCURRENTLY idx_users_status ON users (status) WHERE status != 'active';
CREATE INDEX CONCURRENTLY idx_users_created_at ON users (created_at DESC);

-- Index propriétés avec recherche textuelle
CREATE INDEX CONCURRENTLY idx_properties_search 
ON properties USING GIN(to_tsvector('french', title || ' ' || COALESCE(description, '')));

-- Index géospatial
CREATE INDEX CONCURRENTLY idx_properties_location 
ON properties USING GIST(ST_Point(longitude, latitude)) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index composites pour filtres fréquents
CREATE INDEX CONCURRENTLY idx_properties_filters 
ON properties (city, district, status, bedrooms) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_properties_price_type 
ON properties (id) 
INCLUDE (city, district, bedrooms, bathrooms);

-- Index pour recherche par prix
CREATE INDEX CONCURRENTLY idx_property_pricing_search 
ON property_pricing (rental_type, base_price, is_active) 
WHERE is_active = TRUE;

-- Index pour disponibilités
CREATE INDEX CONCURRENTLY idx_availability_property_dates 
ON property_availability (property_id, start_date, end_date, availability_status);

CREATE INDEX CONCURRENTLY idx_availability_dates 
ON property_availability USING GIST (daterange(start_date, end_date));

-- Index pour réservations
CREATE INDEX CONCURRENTLY idx_booking_requests_tenant 
ON booking_requests (tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_booking_requests_landlord 
ON booking_requests (landlord_id, request_status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_booking_requests_property 
ON booking_requests (property_id, start_date, end_date);

-- Index pour transactions
CREATE INDEX CONCURRENTLY idx_transactions_user_date 
ON transactions (user_id, created_at DESC, transaction_status);

CREATE INDEX CONCURRENTLY idx_transactions_reference 
ON transactions USING HASH (reference_number) 
WHERE reference_number IS NOT NULL;

-- Index pour conversations
CREATE INDEX CONCURRENTLY idx_conversations_user 
ON conversation_participants (user_id, joined_at DESC) 
WHERE left_at IS NULL;

CREATE INDEX CONCURRENTLY idx_messages_conversation_date 
ON messages (conversation_id, created_at DESC) 
WHERE is_deleted = FALSE;

-- Index pour notifications non lues
CREATE INDEX CONCURRENTLY idx_notifications_user_unread 
ON notifications (user_id, created_at DESC) 
WHERE is_read = FALSE;

-- Index pour avis
CREATE INDEX CONCURRENTLY idx_reviews_property_published 
ON reviews (property_id, created_at DESC) 
WHERE review_status = 'published';

CREATE INDEX CONCURRENTLY idx_reviews_user_received 
ON reviews (reviewee_id, review_status, created_at DESC);

-- Index pour logs d'activité (partitionné par date)
CREATE INDEX CONCURRENTLY idx_activity_logs_user_date 
ON activity_logs (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_activity_logs_action_date 
ON activity_logs (action, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '90 days';

-- ===========================================
-- TRIGGERS ET FONCTIONS
-- ===========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_pricing_updated_at 
    BEFORE UPDATE ON property_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at 
    BEFORE UPDATE ON booking_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_contracts_updated_at 
    BEFORE UPDATE ON rental_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_accounts_updated_at 
    BEFORE UPDATE ON wallet_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at 
    BEFORE UPDATE ON saved_searches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer des slugs uniques
CREATE OR REPLACE FUNCTION generate_property_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    IF NEW.slug IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Génération du slug de base
    base_slug := lower(regexp_replace(
        unaccent(NEW.title || '-' || NEW.city), 
        '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    base_slug := substring(base_slug from 1 for 200); -- Limiter la longueur
    
    final_slug := base_slug;
    
    -- Vérification d'unicité
    WHILE EXISTS(SELECT 1 FROM properties WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour génération de slug
CREATE TRIGGER generate_property_slug_trigger
    BEFORE INSERT OR UPDATE ON properties
    FOR EACH ROW
    WHEN (NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND (NEW.title != OLD.title OR NEW.city != OLD.city)))
    EXECUTE FUNCTION generate_property_slug();

-- Fonction pour générer des numéros de contrat
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    final_number TEXT;
BEGIN
    IF NEW.contract_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Générer un numéro séquentiel basé sur l'année
    SELECT LPAD(
        (COUNT(*) + 1)::TEXT, 
        6, 
        '0'
    ) INTO sequence_part
    FROM rental_contracts 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    final_number := 'TG' || year_part || sequence_part;
    
    -- Vérifier l'unicité (rare mais possible avec concurrence)
    WHILE EXISTS(SELECT 1 FROM rental_contracts WHERE contract_number = final_number) LOOP
        sequence_part := LPAD((sequence_part::INTEGER + 1)::TEXT, 6, '0');
        final_number := 'TG' || year_part || sequence_part;
    END LOOP;
    
    NEW.contract_number := final_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour génération du numéro de contrat
CREATE TRIGGER generate_contract_number_trigger
    BEFORE INSERT ON rental_contracts
    FOR EACH ROW
    WHEN (NEW.contract_number IS NULL)
    EXECUTE FUNCTION generate_contract_number();

-- Fonction pour générer des références de transaction
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    timestamp_part TEXT;
    random_part TEXT;
    final_reference TEXT;
BEGIN
    IF NEW.reference_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Préfixe basé sur le type de transaction
    prefix := CASE 
        WHEN NEW.transaction_type = 'rent_payment' THEN 'RENT'
        WHEN NEW.transaction_type = 'deposit_payment' THEN 'DEP'
        WHEN NEW.transaction_type = 'refund' THEN 'REF'
        WHEN NEW.transaction_type = 'withdrawal' THEN 'WDR'
        ELSE 'TXN'
    END;
    
    -- Timestamp en format compact
    timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    
    -- Partie aléatoire
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    final_reference := prefix || timestamp_part || random_part;
    
    -- Vérifier l'unicité
    WHILE EXISTS(SELECT 1 FROM transactions WHERE reference_number = final_reference) LOOP
        random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
        final_reference := prefix || timestamp_part || random_part;
    END LOOP;
    
    NEW.reference_number := final_reference;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour génération des références de transaction
CREATE TRIGGER generate_transaction_reference_trigger
    BEFORE INSERT ON transactions
    FOR EACH ROW
    WHEN (NEW.reference_number IS NULL)
    EXECUTE FUNCTION generate_transaction_reference();

-- Fonction pour compteur de favoris
CREATE OR REPLACE FUNCTION update_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE properties 
        SET favorite_count = favorite_count + 1 
        WHERE id = NEW.property_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE properties 
        SET favorite_count = GREATEST(favorite_count - 1, 0)
        WHERE id = OLD.property_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour compteurs de favoris
CREATE TRIGGER favorites_insert_trigger
    AFTER INSERT ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_favorite_count();

CREATE TRIGGER favorites_delete_trigger
    AFTER DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_favorite_count();

-- Fonction pour mise à jour du solde wallet
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
    wallet_user_id UUID;
    amount_change BIGINT;
BEGIN
    -- Déterminer l'utilisateur et le montant
    IF NEW.transaction_status = 'completed' AND 
       (OLD.transaction_status IS NULL OR OLD.transaction_status != 'completed') THEN
        
        IF NEW.transaction_type IN ('deposit', 'refund', 'payment_received') THEN
            -- Crédit
            wallet_user_id := NEW.user_id;
            amount_change := NEW.net_amount;
        ELSIF NEW.transaction_type IN ('withdrawal', 'payment', 'fee') THEN
            -- Débit
            wallet_user_id := NEW.user_id;
            amount_change := -NEW.net_amount;
        ELSE
            RETURN NEW;
        END IF;
        
        -- Mise à jour du solde
        UPDATE wallet_accounts 
        SET 
            balance = balance + amount_change,
            total_received = total_received + GREATEST(amount_change, 0),
            total_sent = total_sent + GREATEST(-amount_change, 0),
            updated_at = NOW()
        WHERE user_id = wallet_user_id;
        
        -- Créer le wallet s'il n'existe pas
        IF NOT FOUND THEN
            INSERT INTO wallet_accounts (user_id, balance, total_received, total_sent)
            VALUES (
                wallet_user_id, 
                GREATEST(amount_change, 0),
                GREATEST(amount_change, 0),
                GREATEST(-amount_change, 0)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mise à jour du wallet
CREATE TRIGGER update_wallet_balance_trigger
    AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

-- Fonction pour mettre à jour les compteurs de conversation
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Nouveau message
        UPDATE conversations 
        SET 
            last_message_at = NEW.created_at,
            message_count = message_count + 1
        WHERE id = NEW.conversation_id;
        
        -- Mettre à jour le compteur non lu pour tous les participants sauf l'expéditeur
        UPDATE conversation_participants 
        SET unread_count = unread_count + 1
        WHERE conversation_id = NEW.conversation_id 
        AND user_id != NEW.sender_id 
        AND left_at IS NULL;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Message lu
        IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
            UPDATE conversations 
            SET message_count = message_count - 1
            WHERE id = NEW.conversation_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour compteurs de conversation
CREATE TRIGGER update_conversation_counters_trigger
    AFTER INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_counters();

-- Fonction pour marquer les messages comme lus
CREATE OR REPLACE FUNCTION mark_messages_as_read()
RETURNS TRIGGER AS $$
BEGIN
    -- Réduire le compteur non lu
    UPDATE conversation_participants 
    SET 
        unread_count = GREATEST(unread_count - 1, 0),
        last_read_at = NEW.read_at
    WHERE conversation_id = (
        SELECT conversation_id FROM messages WHERE id = NEW.message_id
    ) AND user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour lecture des messages
CREATE TRIGGER mark_messages_read_trigger
    AFTER INSERT ON message_read_status
    FOR EACH ROW EXECUTE FUNCTION mark_messages_as_read();

-- Fonction pour logs d'activité automatiques
CREATE OR REPLACE FUNCTION log_property_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_name TEXT;
    user_id_val UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_name := 'property_created';
        user_id_val := NEW.owner_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status != OLD.status THEN
            action_name := 'property_status_changed';
            user_id_val := NEW.owner_id;
        ELSIF NEW.view_count > OLD.view_count THEN
            RETURN NEW; -- Ne pas logger chaque vue
        ELSE
            action_name := 'property_updated';
            user_id_val := NEW.owner_id;
        END IF;
    ELSE
        RETURN NULL;
    END IF;
    
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (
        user_id_val,
        action_name,
        'property',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'property_title', COALESCE(NEW.title, OLD.title)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour logs d'activité des propriétés
CREATE TRIGGER log_property_activity_trigger
    AFTER INSERT OR UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION log_property_activity();

-- ===========================================
-- DONNÉES INITIALES
-- ===========================================

-- Catégories de propriétés par défaut
INSERT INTO property_categories (name, name_fr, name_ee, name_kbp, description, icon_url, sort_order) VALUES
('apartment', 'Appartement', 'Aƒe', 'Sɔhɔ', 'Appartements modernes et spacieux', '/icons/apartment.svg', 1),
('villa', 'Villa', 'Villa', 'Aƒe gã', 'Villas avec jardin et espaces privés', '/icons/villa.svg', 2),
('studio', 'Studio', 'Studio', 'Xɔ ɖeka', 'Studios compacts et fonctionnels', '/icons/studio.svg', 3),
('room', 'Chambre', 'Xɔdó', 'Dakɔsɔ', 'Chambres individuelles à louer', '/icons/room.svg', 4),
('house', 'Maison', 'Aƒe', 'Yigbe', 'Maisons traditionnelles', '/icons/house.svg', 5),
('office', 'Bureau', 'Dɔwɔƒe', 'Dɔwɔsɔ', 'Espaces de bureaux professionnels', '/icons/office.svg', 6);

-- Paramètres administrateur par défaut
INSERT INTO admin_settings (key, value, description, category, is_public) VALUES
('platform_commission_rate', '{"percentage": 3.0, "minimum": 1000}', 'Taux de commission de la plateforme', 'financial', false),
('mobile_money_providers', '{
    "tmoney": {
        "name": "T-Money",
        "logo": "/logos/tmoney.png",
        "fees": 1.5,
        "min_amount": 100,
        "max_amount": 1000000,
        "is_active": true
    },
    "flooz": {
        "name": "Flooz",
        "logo": "/logos/flooz.png", 
        "fees": 1.2,
        "min_amount": 100,
        "max_amount": 500000,
        "is_active": true
    }
}', 'Fournisseurs Mobile Money disponibles', 'payment', true),
('default_currency', '"XOF"', 'Devise par défaut de la plateforme', 'general', true),
('supported_languages', '["fr", "en", "ee", "kbp"]', 'Langues supportées par la plateforme', 'localization', true),
('max_photos_per_property', '20', 'Nombre maximum de photos par propriété', 'property', false),
('booking_expiration_hours', '48', 'Heures avant expiration automatique des demandes', 'booking', false),
('review_moderation_required', 'true', 'Les avis nécessitent-ils une modération', 'content', false),
('maintenance_mode', 'false', 'Mode maintenance activé', 'system', false);

-- ===========================================
-- POLITIQUES DE SÉCURITÉ (RLS)
-- ===========================================

-- Activation RLS sur tables sensibles
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Politique pour les propriétés - lecture publique des propriétés actives
CREATE POLICY properties_public_read ON properties
    FOR SELECT
    USING (status = 'active');

-- Politique pour les propriétés - propriétaires peuvent gérer leurs biens
CREATE POLICY properties_owner_manage ON properties
    FOR ALL
    USING (owner_id = current_setting('app.current_user_id', true)::uuid)
    WITH CHECK (owner_id = current_setting('app.current_user_id', true)::uuid);

-- Politique pour les administrateurs - accès complet aux propriétés
CREATE POLICY properties_admin_access ON properties
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = current_setting('app.current_user_id', true)::uuid 
            AND ur.role_type IN ('admin', 'super_admin')
        )
    );

-- Politique pour les tarifs - suit les propriétés
CREATE POLICY property_pricing_follow_property ON property_pricing
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM properties 
            WHERE status = 'active' 
            OR owner_id = current_setting('app.current_user_id', true)::uuid
        )
    );

-- Politique pour les réservations - participants seulement
CREATE POLICY booking_requests_participants ON booking_requests
    FOR ALL
    USING (
        tenant_id = current_setting('app.current_user_id', true)::uuid OR
        landlord_id = current_setting('app.current_user_id', true)::uuid
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_user_id', true)::uuid OR
        landlord_id = current_setting('app.current_user_id', true)::uuid
    );

-- Politique pour les contrats - participants seulement
CREATE POLICY rental_contracts_participants ON rental_contracts
    FOR ALL
    USING (
        tenant_id = current_setting('app.current_user_id', true)::uuid OR
        landlord_id = current_setting('app.current_user_id', true)::uuid
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_user_id', true)::uuid OR
        landlord_id = current_setting('app.current_user_id', true)::uuid
    );

-- Politique pour les transactions - utilisateur concerné
CREATE POLICY transactions_user_access ON transactions
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', true)::uuid OR
        related_user_id = current_setting('app.current_user_id', true)::uuid
    );

-- Politique pour les messages - participants de la conversation
CREATE POLICY messages_conversation_participants ON messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::uuid
            AND left_at IS NULL
        )
    )
    WITH CHECK (
        sender_id = current_setting('app.current_user_id', true)::uuid AND
        conversation_id IN (
            SELECT conversation_id 
            FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::uuid
            AND left_at IS NULL
        )
    );

-- Politique pour les avis - lecture publique, écriture restreinte
CREATE POLICY reviews_public_read ON reviews
    FOR SELECT
    USING (review_status = 'published');

CREATE POLICY reviews_user_manage ON reviews
    FOR INSERT
    WITH CHECK (reviewer_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY reviews_user_update ON reviews
    FOR UPDATE
    USING (
        reviewer_id = current_setting('app.current_user_id', true)::uuid OR
        reviewee_id = current_setting('app.current_user_id', true)::uuid
    );

-- Politique pour les notifications - destinataire seulement
CREATE POLICY notifications_recipient_only ON notifications
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::uuid)
    WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- Politique pour les logs d'activité - utilisateur concerné + admins
CREATE POLICY activity_logs_user_access ON activity_logs
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', true)::uuid OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = current_setting('app.current_user_id', true)::uuid 
            AND ur.role_type IN ('admin', 'super_admin')
        )
    );

-- ===========================================
-- FONCTIONS UTILITAIRES
-- ===========================================

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY property_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics;
    
    -- Log du rafraîchissement
    INSERT INTO activity_logs (action, metadata)
    VALUES ('materialized_views_refreshed', jsonb_build_object('timestamp', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les données anciennes
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Supprimer les logs d'activité de plus de 1 an
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Supprimer les notifications lues de plus de 3 mois
    DELETE FROM notifications 
    WHERE is_read = TRUE AND read_at < NOW() - INTERVAL '3 months';
    
    -- Supprimer les tokens d'authentification expirés
    UPDATE users 
    SET 
        email_verification_token = NULL,
        phone_verification_code = NULL,
        password_reset_token = NULL
    WHERE 
        (password_reset_expires IS NOT NULL AND password_reset_expires < NOW()) OR
        (created_at < NOW() - INTERVAL '7 days' AND email_verified = FALSE);
    
    -- Log du nettoyage
    INSERT INTO activity_logs (action, metadata)
    VALUES ('data_cleanup_completed', jsonb_build_object(
        'timestamp', NOW(),
        'tables_cleaned', ARRAY['activity_logs', 'notifications', 'users']
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer la distance entre deux points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(
        ST_Point(lon1, lat1)::geography,
        ST_Point(lon2, lat2)::geography
    ) / 1000.0; -- Retourne en kilomètres
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour recherche textuelle avancée
CREATE OR REPLACE FUNCTION search_properties(
    search_query TEXT DEFAULT NULL,
    city_filter TEXT DEFAULT NULL,
    district_filter TEXT DEFAULT NULL,
    min_price INTEGER DEFAULT NULL,
    max_price INTEGER DEFAULT NULL,
    rental_type_filter rental_type DEFAULT NULL,
    min_bedrooms INTEGER DEFAULT NULL,
    amenities_filter TEXT[] DEFAULT NULL,
    lat DECIMAL DEFAULT NULL,
    lng DECIMAL DEFAULT NULL,
    max_distance_km DECIMAL DEFAULT NULL,
    sort_by TEXT DEFAULT 'relevance',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
) RETURNS TABLE (
    property_id UUID,
    title TEXT,
    description TEXT,
    city TEXT,
    district TEXT,
    base_price INTEGER,
    rental_type rental_type,
    bedrooms INTEGER,
    bathrooms INTEGER,
    average_rating DECIMAL,
    review_count INTEGER,
    relevance_score DECIMAL,
    distance_km DECIMAL,
    photos JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH property_search AS (
        SELECT 
            p.id,
            p.title,
            p.description,
            p.city,
            p.district,
            pp.base_price,
            pp.rental_type,
            p.bedrooms,
            p.bathrooms,
            ps.avg_overall_rating as average_rating,
            ps.review_count,
            
            -- Score de pertinence
            (
                CASE 
                    WHEN search_query IS NOT NULL THEN
                        ts_rank(to_tsvector('french', p.title || ' ' || p.description), plainto_tsquery('french', search_query))
                    ELSE 0.5
                END * 0.3 +
                COALESCE(ps.avg_overall_rating, 0) / 5.0 * 0.2 +
                LEAST(p.view_count / 1000.0, 1.0) * 0.1 +
                CASE 
                    WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1.0
                    WHEN p.created_at > NOW() - INTERVAL '30 days' THEN 0.7
                    WHEN p.created_at > NOW() - INTERVAL '90 days' THEN 0.4
                    ELSE 0.2
                END * 0.1 +
                (
                    CASE WHEN LENGTH(p.description) > 100 THEN 0.5 ELSE 0.0 END +
                    CASE WHEN (SELECT COUNT(*) FROM property_media pm WHERE pm.property_id = p.id) >= 3 THEN 0.5 ELSE 0.0 END
                ) * 0.3
            ) as relevance_score,
            
            -- Distance
            CASE 
                WHEN lat IS NOT NULL AND lng IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
                    calculate_distance(p.latitude, p.longitude, lat, lng)
                ELSE NULL
            END as distance_km
            
        FROM properties p
        JOIN property_stats ps ON p.id = ps.id
        JOIN property_pricing pp ON p.id = pp.property_id AND pp.is_active = TRUE
        WHERE 
            p.status = 'active'
            AND (search_query IS NULL OR to_tsvector('french', p.title || ' ' || p.description) @@ plainto_tsquery('french', search_query))
            AND (city_filter IS NULL OR p.city ILIKE city_filter)
            AND (district_filter IS NULL OR p.district ILIKE district_filter)
            AND (min_price IS NULL OR pp.base_price >= min_price)
            AND (max_price IS NULL OR pp.base_price <= max_price)
            AND (rental_type_filter IS NULL OR pp.rental_type = rental_type_filter)
            AND (min_bedrooms IS NULL OR p.bedrooms >= min_bedrooms)
            AND (amenities_filter IS NULL OR p.amenities ?| amenities_filter)
    )
    SELECT 
        ps.id,
        ps.title,
        ps.description,
        ps.city,
        ps.district,
        ps.base_price,
        ps.rental_type,
        ps.bedrooms,
        ps.bathrooms,
        ps.average_rating,
        ps.review_count,
        ps.relevance_score,
        ps.distance_km,
        (
            SELECT json_agg(
                json_build_object(
                    'url', pm.url,
                    'thumbnail_url', pm.thumbnail_url,
                    'type', pm.media_type,
                    'is_primary', pm.is_primary
                ) ORDER BY pm.is_primary DESC, pm.sort_order
            )
            FROM property_media pm
            WHERE pm.property_id = ps.id 
            LIMIT 5
        ) as photos
    FROM property_search ps
    WHERE (max_distance_km IS NULL OR ps.distance_km <= max_distance_km)
    ORDER BY 
        CASE WHEN sort_by = 'relevance' THEN ps.relevance_score END DESC,
        CASE WHEN sort_by = 'price_asc' THEN ps.base_price END ASC,
        CASE WHEN sort_by = 'price_desc' THEN ps.base_price END DESC,
        CASE WHEN sort_by = 'rating' THEN ps.average_rating END DESC,
        CASE WHEN sort_by = 'distance' THEN ps.distance_km END ASC,
        ps.relevance_score DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- COMMENTAIRES ET DOCUMENTATION
-- ===========================================

COMMENT ON DATABASE togo_rental_platform IS 'Base de données pour la plateforme de location de maisons au Togo';

COMMENT ON TABLE users IS 'Utilisateurs de la plateforme avec authentification';
COMMENT ON TABLE user_profiles IS 'Profils détaillés des utilisateurs';
COMMENT ON TABLE user_roles IS 'Rôles et vérifications des utilisateurs';
COMMENT ON TABLE properties IS 'Propriétés disponibles à la location';
COMMENT ON TABLE property_media IS 'Photos, vidéos et documents des propriétés';
COMMENT ON TABLE property_pricing IS 'Tarification et conditions de location';
COMMENT ON TABLE booking_requests IS 'Demandes de réservation des locataires';
COMMENT ON TABLE rental_contracts IS 'Contrats de location signés';
COMMENT ON TABLE transactions IS 'Transactions financières de la plateforme';
COMMENT ON TABLE conversations IS 'Conversations entre utilisateurs';
COMMENT ON TABLE messages IS 'Messages dans les conversations';
COMMENT ON TABLE reviews IS 'Avis et évaluations des utilisateurs';
COMMENT ON TABLE notifications IS 'Notifications envoyées aux utilisateurs';
COMMENT ON TABLE favorites IS 'Propriétés favorites des utilisateurs';
COMMENT ON TABLE saved_searches IS 'Recherches sauvegardées avec alertes';
COMMENT ON TABLE activity_logs IS 'Logs d''activité et d''audit de la plateforme';

-- ===========================================
-- PERMISSIONS ET SÉCURITÉ
-- ===========================================

-- Créer des rôles de base de données
CREATE ROLE togo_rental_app_user;
CREATE ROLE togo_rental_admin;

-- Permissions pour l'application
GRANT CONNECT ON DATABASE togo_rental_platform TO togo_rental_app_user;
GRANT USAGE ON SCHEMA public TO togo_rental_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO togo_rental_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO togo_rental_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO togo_rental_app_user;

-- Permissions pour l'administration
GRANT ALL PRIVILEGES ON DATABASE togo_rental_platform TO togo_rental_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO togo_rental_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO togo_rental_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO togo_rental_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO togo_rental_admin;

-- Assurer que les nouvelles tables héritent des permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO togo_rental_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO togo_rental_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO togo_rental_app_user;

COMMIT;