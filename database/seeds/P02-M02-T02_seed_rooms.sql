-- Seed 15 rooms across 3 branches (P02-M02-T02)
-- Branch 1: Colombo (5 rooms)
-- Branch 2: Kandy (5 rooms, room 202 in Maintenance)
-- Branch 3: Galle (5 rooms)

with room_specs (room_number, branch_name, type_name, status) as (
  values
    -- Colombo (branch 1)
    ('101', 'Colombo', 'Single', 'Available'::room_status),
    ('102', 'Colombo', 'Single', 'Available'::room_status),
    ('103', 'Colombo', 'Double', 'Available'::room_status),
    ('104', 'Colombo', 'Double', 'Available'::room_status),
    ('201', 'Colombo', 'Suite',  'Available'::room_status),

    -- Kandy (branch 2)
    ('101', 'Kandy',   'Single', 'Available'::room_status),
    ('102', 'Kandy',   'Double', 'Available'::room_status),
    ('103', 'Kandy',   'Suite',  'Available'::room_status),
    ('201', 'Kandy',   'Single', 'Available'::room_status),
    ('202', 'Kandy',   'Double', 'Maintenance'::room_status),

    -- Galle (branch 3)
    ('101', 'Galle',   'Single', 'Available'::room_status),
    ('102', 'Galle',   'Double', 'Available'::room_status),
    ('103', 'Galle',   'Suite',  'Available'::room_status),
    ('201', 'Galle',   'Single', 'Available'::room_status),
    ('202', 'Galle',   'Double', 'Available'::room_status)
)
insert into room (room_number, branch_id, type_id, status)
select
  rs.room_number,
  b.branch_id,
  rt.type_id,
  rs.status
from room_specs rs
join branch b on b.location_name = rs.branch_name
join room_type rt on rt.type_name = rs.type_name
on conflict (branch_id, room_number) do nothing;
