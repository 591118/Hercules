-- Hercules V1 - Database init
-- Roller: admin (alle tilganger, kan bytte view), kunde, kunde_og_coach (3 stk)

CREATE TYPE user_role AS ENUM ('admin', 'kunde', 'kunde_og_coach');

CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    passord_hash   VARCHAR(255) NOT NULL,
    rolle          user_role NOT NULL DEFAULT 'kunde',
    navn           VARCHAR(255),
    coach_sokt     BOOLEAN NOT NULL DEFAULT FALSE,
    coach_godkjent  BOOLEAN NOT NULL DEFAULT FALSE,
    opprettet      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    oppdatert      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_rolle ON users (rolle);

-- Admin-bruker som skal fungere ved innlogging:
--   E-post:   admin@hercules.no
--   Passord:  admin123
INSERT INTO users (email, passord_hash, rolle, navn)
VALUES (
    'admin@hercules.no',
    '$2b$12$8/AfEv4goECgDWvcOeEXl.aDVLUXrD9hJ2ghsefGpIK/396axaFai',
    'admin',
    'Admin Bruker'
);

COMMENT ON TABLE users IS 'Brukere med rolle: admin (alle tilganger, kan bytte view), kunde, kunde_og_coach';
