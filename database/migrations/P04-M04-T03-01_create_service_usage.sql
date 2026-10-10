create table if not exists service_usage(
  usage_id bigint generated always as identity primary key,
  room_id bigint not null,
  reservation_id uuid not null,
  service_id bigint not null,
  usage_date timestamp with time zone not null default current_timestamp,
  quantity int not null check (quantity > 0),
  charged_price numeric(12,2) not null check (charged_price >= 0),
  logged_by_employee_id bigint not null,
  request_channel varchar(20) not null,

  constraint fk_service_usage_reservation_room foreign key (reservation_id, room_id) references reservation_rooms (reservation_id, room_id) on delete cascade,
  constraint fk_service_usage_service foreign key (service_id) references service_catalogue (service_id) on delete restrict,
  constraint fk_service_usage_employee foreign key (logged_by_employee_id) references employee (employee_id) on delete restrict
);

create index if not exists idx_service_usage_reservation on service_usage (reservation_id);
create index if not exists idx_service_usage_date on service_usage (usage_date);
