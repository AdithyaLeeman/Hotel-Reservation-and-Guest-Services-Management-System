insert into service_catalogue (service_name, current_price, status)
values
  ('Room Service', 1200.00, 'Active'),
  ('Spa Treatment', 5000.00, 'Active'),
  ('Laundry', 800.00, 'Active'),
  ('Minibar Usage', 250.00, 'Active'),
  ('Airport Transfer', 3500.00, 'Active'),
  ('Late Checkout', 4500.00, 'Active')
on conflict (service_name) do nothing;
