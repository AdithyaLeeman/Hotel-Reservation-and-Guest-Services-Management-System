create or replace view vw_room_occupancy as
with
calendar_months as (
  select date_trunc('month', d)::date as month_start
  from generate_series(
    date_trunc('month', now() - interval '36 months'),
    date_trunc('month', now() + interval '12 months'),
    interval '1 month'
  ) as d
),
room_months as (
  select
    r.room_id,
    r.room_number,
    r.branch_id,
    r.type_id,
    r.status as room_status,
    cm.month_start as period_date,
    (cm.month_start + interval '1 month - 1 day')::date as month_end,
    extract(day from cm.month_start + interval '1 month - 1 day')::int as days_in_month
  from room r
  cross join calendar_months cm
),
occupied_nights as (
  select
    rr.room_id,
    date_trunc('month', r.check_in_date)::date as month_start,
    sum(
      greatest(
        0,
        (
          least(r.check_out_date, date_trunc('month', r.check_in_date)::date + interval '1 month')::date
          - greatest(r.check_in_date, date_trunc('month', r.check_in_date)::date)
        )
      )
    ) as nights_this_room_this_month,
    sum(
      greatest(
        0,
        (
          least(r.check_out_date, date_trunc('month', r.check_in_date)::date + interval '1 month')::date
          - greatest(r.check_in_date, date_trunc('month', r.check_in_date)::date)
        )
      )
    ) * rr.rate_per_night as revenue_this_room_this_month
  from reservation_rooms rr
  join reservation r on r.reservation_id = rr.reservation_id
  where r.reservation_status in ('CheckedIn', 'CheckedOut')
  group by rr.room_id, date_trunc('month', r.check_in_date)::date, rr.rate_per_night
),
room_month_stats as (
  select
    rm.room_id,
    rm.room_number,
    rm.branch_id,
    rm.type_id,
    rm.room_status,
    rm.period_date,
    rm.days_in_month,
    coalesce(sum(on2.nights_this_room_this_month), 0)::int as total_nights_occupied,
    coalesce(sum(on2.revenue_this_room_this_month), 0.00) as total_revenue
  from room_months rm
  left join occupied_nights on2
    on on2.room_id = rm.room_id
   and on2.month_start = rm.period_date
  group by
    rm.room_id,
    rm.room_number,
    rm.branch_id,
    rm.type_id,
    rm.room_status,
    rm.period_date,
    rm.days_in_month
)
select
  rms.branch_id,
  b.location_name as branch_name,
  rms.room_id,
  rms.room_number,
  rt.type_name as room_type_name,
  rms.room_status::text as room_status,
  rms.period_date,
  rms.total_nights_occupied,
  round(
    (rms.total_nights_occupied::numeric / rms.days_in_month) * 100,
    2
  ) as occupancy_rate,
  round(rms.total_revenue, 2) as total_revenue
from room_month_stats rms
join room_type rt on rt.type_id = rms.type_id
join branch b on b.branch_id = rms.branch_id
order by
  rms.period_date desc,
  rms.branch_id asc,
  rms.room_number asc;

comment on view vw_room_occupancy is
  'Room occupancy by calendar month. One row per room per month. '
  'Columns: branch_id, branch_name, room_id, room_number, room_type_name, room_status, '
  'period_date (first day of month), total_nights_occupied, occupancy_rate (%), total_revenue. '
  'Only CheckedIn and CheckedOut reservations contribute to occupancy. '
  'Rate uses the snapshotted rate_per_night from reservation_rooms. '
  'Consumers filter by period_date >= fromDate AND period_date <= toDate. '
  'Lecture alignment: L05 (view), L03 (GROUP BY month, SUM, generate_series).';
