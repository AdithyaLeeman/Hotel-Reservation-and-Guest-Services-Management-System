create table if not exists amenity (
  amenity_id bigint generated always as identity,
  amenity_name varchar(100) not null,

  constraint pk_amenity primary key (amenity_id),
  constraint uq_amenity_name unique (amenity_name),
  constraint ck_amenity_name_len check (length(trim(amenity_name)) >= 2)
);

comment on table amenity is
  'Hotel room amenities (e.g., Wi-Fi, Air Conditioning, Mini Bar, Ocean View, Jacuzzi).';
comment on column amenity.amenity_id is 'Auto-generated bigint surrogate key';
comment on column amenity.amenity_name is 'Unique name of the amenity';
