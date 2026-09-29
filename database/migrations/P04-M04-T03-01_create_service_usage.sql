-- database/migrations/P04-M04-T03-01_create_service_usage.sql

-- Depends on: 
-- P03-M03-T02 (reservation_rooms)
-- P04-M04-T01 (service_catalogue)
-- P01-M01-T08 (employee)

CREATE TABLE IF NOT EXISTS service_usage (
    usage_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id BIGINT NOT NULL,
    reservation_id UUID NOT NULL,
    service_id BIGINT NOT NULL,
    usage_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quantity INT NOT NULL CHECK (quantity > 0),
    charged_price DECIMAL(12, 2) NOT NULL CHECK (charged_price >= 0),
    logged_by_employee_id BIGINT NOT NULL,
    request_channel VARCHAR(20) NOT NULL,

    -- FK to reservation_rooms (composite)
    CONSTRAINT fk_service_usage_reservation_room
        FOREIGN KEY (reservation_id, room_id)
        REFERENCES reservation_rooms (reservation_id, room_id)
        ON DELETE CASCADE,

    -- FK to service_catalogue
    CONSTRAINT fk_service_usage_service
        FOREIGN KEY (service_id)
        REFERENCES service_catalogue (service_id)
        ON DELETE RESTRICT,

    -- FK to employee
    CONSTRAINT fk_service_usage_employee
        FOREIGN KEY (logged_by_employee_id)
        REFERENCES employee (employee_id)
        ON DELETE RESTRICT
);

-- Indexes for frequent queries (e.g. reporting by reservation or date)
CREATE INDEX IF NOT EXISTS idx_service_usage_reservation ON service_usage(reservation_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_date ON service_usage(usage_date);
