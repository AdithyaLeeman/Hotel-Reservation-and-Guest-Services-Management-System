create table if not exists service_catalogue(
  service_id bigint generated always as identity primary key,
  service_name varchar(100) not null unique,
  current_price numeric(12,2) not null check (current_price >= 0),
  status service_catalogue_status not null default 'Active'
);

create index if not exists idx_service_catalogue_name on service_catalogue (service_name);
