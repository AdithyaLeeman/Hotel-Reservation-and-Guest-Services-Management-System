insert into branch (location_name) values
  ('Colombo'),
  ('Kandy'),
  ('Galle')
on conflict (location_name) do nothing;

