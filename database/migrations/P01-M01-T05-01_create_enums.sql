create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum (
    'Guest',
    'Receptionist',
    'Manager',
    'Admin'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type account_status as enum (
    'Active',
    'Inactive',
    'Suspended'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type reservation_status as enum (
    'Booked',
    'CheckedIn',
    'CheckedOut',
    'Cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type room_status as enum (
    'Available',
    'Occupied',
    'Maintenance'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type booking_source as enum (
    'Online',
    'Reception',
    'Phone'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type service_catalogue_status as enum (
    'Active',
    'Inactive'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum (
    'Unpaid',
    'PartiallyPaid',
    'Paid'
  );
exception
  when duplicate_object then null;
end $$;
