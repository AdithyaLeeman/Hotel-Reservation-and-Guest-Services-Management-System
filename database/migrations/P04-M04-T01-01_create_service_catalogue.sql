-- database/migrations/P04-M04-T01-01_create_service_catalogue.sql

-- Depends on: P01-M01-T05 (Enums)

CREATE TABLE IF NOT EXISTS service_catalogue (
    service_id    BIGINT                GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_name  VARCHAR(100)          NOT NULL UNIQUE,
    current_price NUMERIC(12, 2)        NOT NULL CHECK (current_price >= 0),
    status        ServiceCatalogueStatus NOT NULL DEFAULT 'Active'
);

-- Index for quick lookups by name
CREATE INDEX IF NOT EXISTS idx_service_catalogue_name ON service_catalogue(service_name);
