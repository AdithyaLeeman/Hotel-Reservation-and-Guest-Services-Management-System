-- database/seeds/P04-M04-T02_seed_services.sql

-- Depends on: P04-M04-T01

INSERT INTO service_catalogue (service_name, current_price, status)
VALUES 
    ('Room Service', 1200.00, 'Active'),
    ('Spa Treatment', 5000.00, 'Active'),
    ('Laundry', 800.00, 'Active'),
    ('Minibar Usage', 250.00, 'Active'),
    ('Airport Transfer', 3500.00, 'Active'),
    ('Late Checkout', 4500.00, 'Active')
ON CONFLICT (service_name) DO NOTHING;
