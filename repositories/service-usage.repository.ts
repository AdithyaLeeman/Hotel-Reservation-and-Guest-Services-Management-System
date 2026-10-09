/**
 * Service Usage Repository - data access layer for service_catalogue and service_usage.
 * Owned by: Member 4 (M4) | Task: P04-M04-T09
 *
 * P06-M04-T01 - Mock store replaced with real parameterized pg Pool queries.
 * All SQL is parameterized (no string concatenation - AGENTS.md §8).
 * Money/NUMERIC columns returned as strings from pg (AGENTS.md §8).
 *
 * DB routines used:
 *   service_catalogue table        - P04-M04-T01 (DDL)
 *   service_usage table            - P04-M04-T03 (DDL)
 *   sp_log_service_usage()         - P04-M04-T05 (atomic, price-snapshot procedure)
 *   vw_service_usage_breakdown     - P04-M04-T08 (view; joined usage rows)
 *
 * DB-first rule: charged_price is NEVER computed in TypeScript.
 * sp_log_service_usage() snapshots service_catalogue.current_price into
 * service_usage.charged_price at the moment of logging.
 * See docs/08_business-rules-and-enforcement.md - Calculation Placement Matrix.
 */

import { pool } from '@/lib/db/pool';
import type { ServiceCatalogue, ServiceUsage } from '@/types/domain';
import type { ServiceCatalogueStatus } from '@/types/enums';

// ---------------------------------------------------------------------------
// Input / extended types
// ---------------------------------------------------------------------------

export interface LogServiceUsageInput {
  reservation_id: string;
  room_id?: number;
  service_id: number;
  quantity: number;
  logged_by_employee_id: number;
  request_channel?: string | null;
  channel?: string | null;
  usage_date?: string;
}

export interface CreateCatalogueItemInput {
  service_name: string;
  current_price: string; // NUMERIC(12,2) as string - never a JS float
  status?: ServiceCatalogueStatus;
}

export interface ServiceUsageBreakdownRow extends ServiceUsage {
  service_name: string; // joined from service_catalogue via vw_service_usage_breakdown
  line_total: string;   // charged_price * quantity - computed inside the view, never in TS
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const serviceUsageRepository = {
  /**
   * List all Active catalogue items, ordered alphabetically by name.
   *
   * SELECT * FROM service_catalogue WHERE status = 'Active' ORDER BY service_name
   */
  listCatalogue: async (): Promise<ServiceCatalogue[]> => {
    const result = await pool.query<ServiceCatalogue>(
      `SELECT
          service_id,
          service_name,
          current_price::text  AS current_price,
          status
       FROM service_catalogue
       WHERE status = 'Active'
       ORDER BY service_name`
    );
    return result.rows;
  },

  /**
   * Find a single catalogue item by its primary key.
   *
   * SELECT * FROM service_catalogue WHERE service_id = $1
   */
  findCatalogueById: async (serviceId: number): Promise<ServiceCatalogue | null> => {
    const result = await pool.query<ServiceCatalogue>(
      `SELECT
          service_id,
          service_name,
          current_price::text  AS current_price,
          status
       FROM service_catalogue
       WHERE service_id = $1`,
      [serviceId]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Insert a new service catalogue item.
   *
   * INSERT INTO service_catalogue (service_name, current_price, status)
   * VALUES ($1, $2, $3) RETURNING *
   *
   * PostgreSQL UNIQUE constraint on service_name raises SQLSTATE 23505
   * (unique_violation). The service layer maps this to DUPLICATE_SERVICE_NAME.
   */
  insertCatalogueItem: async (input: CreateCatalogueItemInput): Promise<ServiceCatalogue> => {
    const result = await pool.query<ServiceCatalogue>(
      `INSERT INTO service_catalogue (service_name, current_price, status)
       VALUES ($1, $2::numeric(12,2), $3::service_catalogue_status)
       RETURNING
           service_id,
           service_name,
           current_price::text  AS current_price,
           status`,
      [input.service_name, input.current_price, input.status ?? 'Active']
    );
    return result.rows[0];
  },

  /**
   * Log a service usage record against a reservation by calling sp_log_service_usage().
   *
   * IMPORTANT - DB-first price snapshot rule:
   * sp_log_service_usage() copies service_catalogue.current_price into
   * service_usage.charged_price at the moment of logging. That price is
   * NEVER recomputed later. TypeScript must NOT pass or compute charged_price.
   *
   * CALL sp_log_service_usage($1, $2, $3, $4, $5, $6)
   *
   * The procedure raises:
   *   SQLSTATE '22023' - quantity < 1
   *   SQLSTATE '23503' - reservation not found, or room not part of reservation,
   *                      or service_id not found (FK / record-missing codes)
   *   SQLSTATE '45011' - reservation not in CheckedIn status
   *   SQLSTATE '45012' - service is Inactive
   *
   * After the CALL we do a SELECT to return the inserted row, since the
   * procedure does not return data via INOUT.
   */
  callLogServiceUsage: async (params: LogServiceUsageInput): Promise<ServiceUsage> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Resolve room_id: the procedure requires a room that belongs to the
      // reservation. If the caller did not supply one, pick the first room
      // from reservation_rooms for this reservation.
      let roomId = params.room_id;
      if (roomId === undefined) {
        const roomRes = await client.query<{ room_id: number }>(
          `SELECT room_id FROM reservation_rooms WHERE reservation_id = $1 LIMIT 1`,
          [params.reservation_id]
        );
        if (roomRes.rows.length === 0) {
          throw Object.assign(
            new Error(`No rooms found for reservation ${params.reservation_id}`),
            { code: '23503' }
          );
        }
        roomId = roomRes.rows[0].room_id;
      }

      const channel   = params.request_channel ?? params.channel ?? null;

      await client.query(
        `CALL sp_log_service_usage(
            $1::uuid,    -- p_reservation_id
            $2::bigint,  -- p_room_id
            $3::bigint,  -- p_service_id
            $4::int,     -- p_quantity
            $5::bigint,  -- p_logged_by_employee_id
            $6::varchar  -- p_request_channel
         )`,
        [
          params.reservation_id,
          roomId,
          params.service_id,
          params.quantity,
          params.logged_by_employee_id,
          channel,
        ]
      );

      // Fetch the row we just inserted (most-recent usage for this reservation+service)
      const fetchRes = await client.query<ServiceUsage>(
        `SELECT
             usage_id,
             room_id,
             reservation_id::text,
             service_id,
             usage_date::text                       AS usage_date,
             quantity,
             charged_price::text                    AS charged_price,
             logged_by_employee_id,
             request_channel
         FROM service_usage
         WHERE reservation_id = $1
           AND service_id      = $2
           AND logged_by_employee_id = $3
         ORDER BY usage_id DESC
         LIMIT 1`,
        [params.reservation_id, params.service_id, params.logged_by_employee_id]
      );

      await client.query('COMMIT');
      return fetchRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * List all service usage records for a reservation, enriched with catalogue details.
   * Reads from vw_service_usage_breakdown, ordered by usage_date then usage_id.
   *
   * SELECT * FROM vw_service_usage_breakdown WHERE reservation_id = $1
   *            ORDER BY usage_date, usage_id
   *
   * Note: line_total is computed inside vw_service_usage_breakdown in the DB.
   * The authoritative total is fn_calc_service_charges(reservation_id) - never
   * recomputed in TypeScript.
   */
  listUsageByReservation: async (reservationId: string): Promise<ServiceUsageBreakdownRow[]> => {
    const result = await pool.query<ServiceUsageBreakdownRow>(
      `SELECT
           usage_id,
           room_id,
           reservation_id::text,
           service_id,
           service_name,
           usage_date::text                         AS usage_date,
           quantity,
           charged_price::text                      AS charged_price,
           line_total::text                         AS line_total,
           request_channel,
           logged_by_employee_id
       FROM vw_service_usage_breakdown
       WHERE reservation_id = $1::uuid
       ORDER BY usage_date, usage_id`,
      [reservationId]
    );
    return result.rows;
  },

  /**
   * No-op mock store reset for test compatibility (docs/21_shared-contracts.md).
   * The mock store has been removed; this stub ensures existing test setups
   * that call _resetMockStore() continue to compile and run without error.
   */
  _resetMockStore: (): void => {},
};
