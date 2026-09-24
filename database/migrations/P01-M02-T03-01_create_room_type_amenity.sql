create table if not exists room_type_amenity (
  type_id bigint not null,
  amenity_id bigint not null,

  constraint pk_room_type_amenity primary key (type_id, amenity_id),
  constraint fk_rta_room_type foreign key (type_id) references room_type (type_id) on delete cascade,
  constraint fk_rta_amenity foreign key (amenity_id) references amenity (amenity_id) on delete cascade
);

comment on table room_type_amenity is
  'Junction table mapping standard amenities to room types.';
comment on column room_type_amenity.type_id is 'Foreign key referencing room_type';
comment on column room_type_amenity.amenity_id is 'Foreign key referencing amenity';
