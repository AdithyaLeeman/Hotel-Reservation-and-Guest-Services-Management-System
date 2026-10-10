create or replace view vw_top_services as
select
  sc.service_id,
  sc.service_name,
  sum(su.quantity) as total_quantity,
  sum(su.quantity * su.charged_price) as total_revenue,
  count(distinct su.reservation_id) as reservation_count,
  rank() over (order by sum(su.quantity) desc) as usage_rank
from service_usage su
join service_catalogue sc on sc.service_id = su.service_id
group by sc.service_id, sc.service_name
order by usage_rank;

comment on view vw_top_services is
  'Top services ranked by total quantity consumed. '
  'Includes total revenue (SUM of quantity * charged_price) and '
  'number of distinct reservations. Used by the top-services report.';
