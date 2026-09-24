create extension if not exists pgcrypto;

do $$ begin
  create type user_role as ENUM (
    'Guest',
    'Receptionist',
    'Manager',  
    'Admin'
  );
exception
  when duplicate_object then NULL;
end $$;


do $$ begin
  create type account_status as ENUM(
    'Active',
    'Inactive',
    'Suspended'
  );
exception
  when duplicate_object then NULL;
end $$;


do $$ begin
  create type reservation_status as ENUM(
    'Booked',
    'CheckedIn',
    'CheckedOut',
    'Cancelled'
  );
exception
  when duplicate_object then NULL;
end $$;




do $$ begin
  create type room_status as ENUM(
    'Available',
    'Occupied',
    'Maintenance'
  );
exception
  when duplicate_object then NULL;
end $$;


do $$ begin
  create type booking_source as ENUM (
    'Online',
    'Reception', 
    'Phone'
  );git push -u origin create_enums
exception
  when duplicate_object then NULL;
end $$;


do $$ begin
  create type service_catalogue_status as ENUM(
    'Active',
    'Inactive'
  );
exception
  when duplicate_object then NULL;
end $$;



do $$ begin
  create type payment_status as ENUM(
    'Unpaid',
    'PartiallyPaid',
    'Paid'
  );
  exception 
    when duplicate_object then NULL;
end $$;

