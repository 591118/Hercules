-- Hercules V1 - Database init (alt i én fil)
-- Roller: admin (alle tilganger, kan bytte view), kunde, kunde_og_coach
-- Coach: coach_beskrivelse, coach_spesialiseringer på users; kunde_coach for 12 ukers tilgang

CREATE TYPE user_role AS ENUM ('admin', 'kunde', 'kunde_og_coach');

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) NOT NULL UNIQUE,
    passord_hash            VARCHAR(255) NOT NULL,
    rolle                   user_role NOT NULL DEFAULT 'kunde',
    navn                    VARCHAR(255),
    coach_sokt              BOOLEAN NOT NULL DEFAULT FALSE,
    coach_godkjent          BOOLEAN NOT NULL DEFAULT FALSE,
    coach_beskrivelse       TEXT,
    coach_spesialiseringer  TEXT,
    coach_bilde             TEXT,
    coach_program_lengder   TEXT,
    trial_ends_at           TIMESTAMPTZ,
    stripe_customer_id      TEXT,
    first_charge_done       BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method_type     VARCHAR(20),
    payment_failed_at       TIMESTAMPTZ,
    payment_retry_count     INT NOT NULL DEFAULT 0,
    next_payment_retry_at   TIMESTAMPTZ,
    account_blocked_at      TIMESTAMPTZ,
    opprettet               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    oppdatert               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_rolle ON users (rolle);
CREATE INDEX idx_users_next_payment_retry ON users(next_payment_retry_at)
  WHERE next_payment_retry_at IS NOT NULL AND account_blocked_at IS NULL;

COMMENT ON TABLE users IS 'Brukere med rolle: admin, kunde, kunde_og_coach. coach_* brukes for coach-profil og godkjenning.';
COMMENT ON COLUMN users.coach_beskrivelse IS 'Kort beskrivelse av coachen (vises i coach-liste)';
COMMENT ON COLUMN users.coach_spesialiseringer IS 'Komma-separert liste over hva coachen er god på, f.eks. Styrketrening, Løping';
COMMENT ON COLUMN users.coach_bilde IS 'URL til profilbilde for coach';
COMMENT ON COLUMN users.coach_program_lengder IS 'Komma-separert uketall coach tilbyr, f.eks. 4,8,12';
COMMENT ON COLUMN users.trial_ends_at IS 'Slutt på gratis uke; etter dette trekkes første betaling automatisk';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID for abonnementsbetaling';
COMMENT ON COLUMN users.first_charge_done IS 'Om første trekk (etter trial) er gjennomført';
COMMENT ON COLUMN users.payment_method_type IS 'Foretrukket metode: kort, vipps, paypal';
COMMENT ON COLUMN users.payment_failed_at IS 'Siste mislykkede betaling';
COMMENT ON COLUMN users.payment_retry_count IS 'Antall retries';
COMMENT ON COLUMN users.next_payment_retry_at IS 'Neste ukentlige retry';
COMMENT ON COLUMN users.account_blocked_at IS 'Konto sperret etter siste retry siste dag i måneden';

-- Kunde har valgt en coach: tilgang i 12 uker, deretter "mister tilgang" (program og data beholdes av kunden)
CREATE TABLE kunde_coach (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunde_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_dato     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    slutt_dato     TIMESTAMPTZ NOT NULL,
    opprettet      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(kunde_id, coach_id)
);

CREATE INDEX idx_kunde_coach_kunde ON kunde_coach(kunde_id);
CREATE INDEX idx_kunde_coach_coach ON kunde_coach(coach_id);
CREATE INDEX idx_kunde_coach_slutt ON kunde_coach(slutt_dato);

COMMENT ON TABLE kunde_coach IS 'Kundes valg av coach; tilgang i 12 uker. Program og logger tilhører kunden etter slutt_dato.';

-- Salgsdokumenter (5 år lagring, norsk lov)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE sales_documents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type           VARCHAR(20) NOT NULL,
    invoice_number          VARCHAR(32) UNIQUE,
    document_date           DATE NOT NULL,
    seller_name             VARCHAR(255) NOT NULL,
    seller_org_number       VARCHAR(32),
    customer_id             UUID REFERENCES users(id),
    customer_name           VARCHAR(255),
    customer_email          VARCHAR(255),
    customer_org_number     VARCHAR(32),
    description             TEXT NOT NULL,
    amount_ex_vat_ore       BIGINT NOT NULL,
    vat_ore                 BIGINT NOT NULL DEFAULT 0,
    total_ore               BIGINT NOT NULL,
    currency                VARCHAR(3) NOT NULL DEFAULT 'NOK',
    payment_status         VARCHAR(20) NOT NULL DEFAULT 'paid',
    stripe_invoice_id       VARCHAR(255),
    stripe_charge_id       VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    stripe_pdf_url         TEXT,
    poweroffice_sent_at    TIMESTAMPTZ,
    poweroffice_order_id   BIGINT,
    external_reference     VARCHAR(255) UNIQUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_documents_customer ON sales_documents(customer_id);
CREATE INDEX idx_sales_documents_date ON sales_documents(document_date);
CREATE INDEX idx_sales_documents_external ON sales_documents(external_reference);
CREATE INDEX idx_sales_documents_type ON sales_documents(document_type);

COMMENT ON TABLE sales_documents IS 'Salgsdokumenter – lovpålagt lagring 5 år. Synkroniseres til PowerOffice Go ved konfigurasjon.';

-- Ernæring: matdatabase, oppskrifter, måltider (samling av ingredienser)
-- Måltid = valgfri tid + valgfri navn + liste av enten produkter (gram) eller oppskrifter (porsjoner)

-- Matvarer: global cache + brukerens egne. Strekkode (EAN) for oppslag; source = hvor vi hentet data.
CREATE TABLE food_products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    barcode         VARCHAR(20),
    source          VARCHAR(30) NOT NULL DEFAULT 'local',
    brand           VARCHAR(255),
    image_url       TEXT,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    kcal_per_100    NUMERIC(10,2) NOT NULL DEFAULT 0,
    protein_per_100 NUMERIC(10,2) NOT NULL DEFAULT 0,
    carbs_per_100   NUMERIC(10,2) NOT NULL DEFAULT 0,
    fat_per_100     NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_food_products_barcode ON food_products(barcode) WHERE barcode IS NOT NULL AND barcode != '';
CREATE INDEX idx_food_products_name ON food_products(LOWER(name));
CREATE INDEX idx_food_products_user ON food_products(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN food_products.barcode IS 'EAN-13 eller annen strekkode; brukes for oppslag mot eksterne API én gang, deretter cachet lokalt.';
COMMENT ON COLUMN food_products.source IS 'local | openfoodfacts | nutritionix | edamam | user';
COMMENT ON COLUMN food_products.user_id IS 'NULL = global matvare (seed eller hentet fra API); satt = brukerens egen matvare.';

CREATE TABLE recipes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_user ON recipes(user_id);

CREATE TABLE recipe_ingredients (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id        UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_product_id  UUID NOT NULL REFERENCES food_products(id) ON DELETE CASCADE,
    grams            NUMERIC(10,2) NOT NULL DEFAULT 0,
    UNIQUE(recipe_id, food_product_id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

CREATE TABLE meals (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date  DATE NOT NULL,
    name      VARCHAR(255),
    time_slot TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meals_user_date ON meals(user_id, log_date);

CREATE TABLE meal_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id          UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    food_product_id  UUID REFERENCES food_products(id) ON DELETE CASCADE,
    recipe_id        UUID REFERENCES recipes(id) ON DELETE CASCADE,
    amount_gram      NUMERIC(10,2),
    portions         NUMERIC(6,2),
    CONSTRAINT meal_entry_source CHECK (
        (food_product_id IS NOT NULL AND recipe_id IS NULL AND amount_gram IS NOT NULL) OR
        (recipe_id IS NOT NULL AND food_product_id IS NULL AND portions IS NOT NULL)
    )
);

CREATE INDEX idx_meal_entries_meal ON meal_entries(meal_id);

-- Vekt: én registrering per bruker per dag (overskrives ved ny registrering samme dag)
CREATE TABLE weight_entries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date   DATE NOT NULL,
    weight_kg  NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

CREATE INDEX idx_weight_entries_user_date ON weight_entries(user_id, log_date);

COMMENT ON TABLE weight_entries IS 'Vekt registrert dag for dag; samme dag overskriver tidligere verdi.';

-- Noen vanlige matvarer (per 100 g)
INSERT INTO food_products (name, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100) VALUES
('Havregryn', 389, 16.9, 66.3, 6.9),
('Melk 1 %', 42, 3.4, 4.8, 1.0),
('Egg', 155, 12.6, 1.1, 10.6),
('Brød grovt', 246, 8.5, 45.2, 3.2),
('Smør', 717, 0.9, 0.1, 81.1),
('Kyllingbryst', 165, 31.0, 0.0, 3.6),
('Ris kokt', 130, 2.7, 28.2, 0.3),
('Laks', 208, 20.4, 0.0, 13.4),
('Banan', 89, 1.1, 22.8, 0.3),
('Eple', 52, 0.3, 13.8, 0.2),
('Yoghurt naturell', 66, 5.4, 7.0, 2.0),
('Ost gul', 350, 25.0, 1.5, 27.0),
('Tomater', 18, 0.9, 3.9, 0.2),
('Agurk', 15, 0.7, 3.6, 0.1),
('Pasta kokt', 131, 5.0, 25.0, 1.1),
('Potet kokt', 87, 1.9, 20.1, 0.1),
('Kjøttdeig 12 %', 186, 19.0, 0.0, 12.0),
('Bønner hermetiske', 92, 6.4, 16.5, 0.4),
('Mandel', 579, 21.2, 21.6, 49.9),
('Honning', 304, 0.0, 82.4, 0.0);

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
