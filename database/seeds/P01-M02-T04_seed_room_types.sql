-- Seed room types (P01-M02-T04)
insert into room_type (type_name, capacity, daily_rate) values
  ('Single', 1, 5000.00),
  ('Double', 2, 8000.00),
  ('Suite', 4, 15000.00)
on conflict (type_name) do nothing;

-- Seed amenities (P01-M02-T04)
insert into amenity (amenity_name) values
  ('Wi-Fi'),
  ('Air Conditioning'),
  ('Mini Bar'),
  ('Ocean View'),
  ('Jacuzzi')
on conflict (amenity_name) do nothing;

-- Seed room_type_amenity junction (P01-M02-T04)
insert into room_type_amenity (type_id, amenity_id)
select rt.type_id, a.amenity_id
from room_type rt
cross join amenity a
where (rt.type_name = 'Single' and a.amenity_name in ('Wi-Fi', 'Air Conditioning'))
   or (rt.type_name = 'Double' and a.amenity_name in ('Wi-Fi', 'Air Conditioning', 'Mini Bar'))
   or (rt.type_name = 'Suite' and a.amenity_name in ('Wi-Fi', 'Air Conditioning', 'Mini Bar', 'Ocean View', 'Jacuzzi'))
on conflict (type_id, amenity_id) do nothing;
