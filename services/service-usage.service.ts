/**
 * Service Usage Service — calls sp_log_service_usage() with price snapshot.
 *
 * DB-first rule:
 * - sp_log_service_usage() snapshots the current catalogue price into charged_price
 * - This service never computes charged_price in TypeScript
 *
 * Constraint: May only log usage for CheckedIn reservations.
 * Enforced by the stored procedure (SQLSTATE '45011').
 *
 * Owned by: Member 4 (M4)
 * Implemented in: P04-M04-T05
 */

export const serviceUsageService = {
  logUsage: async (_input: unknown, _employeeId: number): Promise<void> => {
    throw new Error('serviceUsageService.logUsage not yet implemented — P04-M04-T05');
  },
  listCatalogue: async (): Promise<void> => {
    throw new Error('serviceUsageService.listCatalogue not yet implemented — P04-M04-T06');
  },
};
