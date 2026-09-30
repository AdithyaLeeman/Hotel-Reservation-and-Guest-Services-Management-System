CREATE OR REPLACE VIEW vw_audit_log AS
SELECT
    al.audit_id,
    al.reservation_id,

    -- Guest details
    g.full_name                         AS guest_full_name,
    g.email                             AS guest_email,

    -- Branch context
    b.location_name                     AS branch_location_name,
    res.branch_id,

    -- Status transition
    al.old_status,
    al.new_status,
    al.changed_at,

    -- Actor: resolve to employee name if staff, else guest name
    COALESCE(emp.full_name, g_actor.full_name)  AS changed_by_name,
    ua.role                                      AS actor_role,
    emp.employee_number,                          -- NULL for guest-initiated actions

    -- Optional reason
    al.change_reason

FROM reservation_audit_log al

-- Reservation context
JOIN reservation    res ON res.reservation_id = al.reservation_id

-- Guest who owns the reservation
JOIN guest          g   ON g.guest_id         = res.guest_id

-- Branch of the reservation
JOIN branch         b   ON b.branch_id        = res.branch_id

-- Actor account (the user who triggered the change)
JOIN user_account   ua  ON ua.user_id         = al.changed_by_user_id

-- If the actor is a guest, resolve their profile for display name
LEFT JOIN guest     g_actor ON g_actor.user_id = al.changed_by_user_id

-- If the actor is an employee, resolve their profile
LEFT JOIN employee  emp     ON emp.employee_id = al.employee_id

ORDER BY al.changed_at DESC;

COMMENT ON VIEW vw_audit_log IS
    'Complete reservation status change audit trail. '
    'Shows who changed which reservation status and when, '
    'with guest, branch, and actor details. '
    'Apply branch_id filter at query level for Receptionist scope enforcement.';