/**
 * Route: POST /api/staff/admin
 *
 * Actions (dispatched by `action` field in body):
 *   - "create_staff"   — Create a new Receptionist or Manager account
 *   - "update_branch"  — Reassign an employee to a different branch
 *   - "toggle_status"  — Activate or suspend a staff account
 *
 * Security: Admin role only (enforced server-side).
 * Owned by: Admin panel (Member 1 territory, Admin-only access)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth/session';
import { pool } from '@/lib/db/pool';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const CreateStaffSchema = z.object({
  action: z.literal('create_staff'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Receptionist', 'Manager']),
  branch_id: z.coerce.number().int().positive(),
  employee_number: z.string().min(1).max(50),
  department: z.string().max(50).optional(),
  position: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
});

const UpdateBranchSchema = z.object({
  action: z.literal('update_branch'),
  employee_id: z.coerce.number().int().positive(),
  branch_id: z.coerce.number().int().positive(),
});

const ToggleStatusSchema = z.object({
  action: z.literal('toggle_status'),
  user_id: z.string().uuid(),
  new_status: z.enum(['Active', 'Inactive', 'Suspended']),
});

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth check — Admin only
  const session = await getSession();
  if (!session.userId || session.role !== 'Admin') {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const action = (body as Record<string, unknown>)?.action;

  // 2. Dispatch by action
  try {
    if (action === 'create_staff') {
      return await handleCreateStaff(body);
    } else if (action === 'update_branch') {
      return await handleUpdateBranch(body);
    } else if (action === 'toggle_status') {
      return await handleToggleStatus(body);
    } else {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: `Unknown action: ${String(action)}` } },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('[AdminAPI] Unhandled error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// ─── Action Handlers ─────────────────────────────────────────────────────────

async function handleCreateStaff(body: unknown): Promise<NextResponse> {
  const parse = CreateStaffSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: parse.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }
  const d = parse.data;

  // bcrypt hash — cost 12 as per AGENTS.md §10
  const password_hash = await bcrypt.hash(d.password, 12);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert user_account
    const uRes = await client.query<{ user_id: string }>(
      `INSERT INTO user_account (username, password_hash, role, status)
       VALUES ($1, $2, $3, 'Active')
       RETURNING user_id`,
      [d.username, password_hash, d.role]
    );
    const newUserId = uRes.rows[0].user_id;

    // Insert employee
    await client.query(
      `INSERT INTO employee (user_id, branch_id, employee_number, full_name, email, phone, department, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [newUserId, d.branch_id, d.employee_number, d.full_name, d.email,
       d.phone ?? null, d.department ?? null, d.position ?? null]
    );

    await client.query('COMMIT');
    return NextResponse.json({ data: { message: `Staff member "${d.full_name}" created successfully` } }, { status: 201 });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uq_user_account_username')) {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'Username already taken' } }, { status: 409 });
    }
    if (msg.includes('uq_employee_email')) {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'Email already in use' } }, { status: 409 });
    }
    if (msg.includes('uq_employee_number')) {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'Employee number already in use' } }, { status: 409 });
    }
    throw err;
  } finally {
    client.release();
  }
}

async function handleUpdateBranch(body: unknown): Promise<NextResponse> {
  const parse = UpdateBranchSchema.safeParse(body);
  if (!parse.success) {
    const firstErr = Object.values(parse.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: firstErr ?? 'Invalid input', fields: parse.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }
  const { employee_id, branch_id } = parse.data;

  const result = await pool.query(
    `UPDATE employee SET branch_id = $1 WHERE employee_id = $2 RETURNING employee_id`,
    [branch_id, employee_id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: { message: 'Branch updated successfully' } });
}

async function handleToggleStatus(body: unknown): Promise<NextResponse> {
  const parse = ToggleStatusSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: parse.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }
  const { user_id, new_status } = parse.data;

  const result = await pool.query(
    `UPDATE user_account SET status = $1 WHERE user_id = $2 RETURNING user_id`,
    [new_status, user_id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
  }
  return NextResponse.json({ data: { message: `Account status set to ${new_status}` } });
}
