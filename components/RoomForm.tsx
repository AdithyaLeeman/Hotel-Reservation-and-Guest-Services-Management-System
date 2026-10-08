'use client';

/**
 * RoomForm — modal dialog for creating a room or updating a room's status.
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T16
 * Type: PARALLEL — no DB dependency.
 *
 * Modes:
 *   'create'        — POST /api/staff/rooms     (Manager/Admin only; API enforces)
 *   'update-status' — PATCH /api/staff/rooms/[id] (Receptionist allowed except Maintenance)
 *
 * Business rules enforced in UI (server enforces authoritatively):
 *   - Maintenance status is flagged as Manager/Admin only in the UI label.
 *   - All money displayed as LKR — never recomputed here.
 *
 * UI Rules (context/07-ui-rules.md):
 *   - Every field has a visible label — never placeholder-only.
 *   - Required fields marked with *.
 *   - Validation errors shown inline below the field.
 *   - Disabled submit while request is in flight.
 *   - Backdrop click and Escape key close the dialog.
 *   - Unique, descriptive id attributes on all interactive elements.
 *
 * See context/07-ui-rules.md §Dialogs and §Forms.
 */

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import type { RoomWithDetails } from '@/repositories/room.repository';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCHES = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy' },
  { id: 3, name: 'Galle' },
];

const ROOM_TYPES = [
  { id: 1, name: 'Single' },
  { id: 2, name: 'Double' },
  { id: 3, name: 'Suite' },
];

const STATUS_OPTIONS = [
  { value: 'Available',   label: 'Available',         managerOnly: false },
  { value: 'Occupied',    label: 'Occupied',           managerOnly: false },
  { value: 'Maintenance', label: 'Maintenance (Manager/Admin only)', managerOnly: true },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type RoomFormMode = 'create' | 'update-status';

export interface RoomFormProps {
  mode: RoomFormMode;
  /** Required when mode === 'update-status' */
  room?: RoomWithDetails;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Create-mode form state
// ---------------------------------------------------------------------------

interface CreateFormState {
  room_number: string;
  branch_id: string;
  type_id: string;
  status: string;
}

interface CreateFormErrors {
  room_number?: string;
  branch_id?: string;
  type_id?: string;
  status?: string;
  form?: string;
}

// ---------------------------------------------------------------------------
// Update-status form state
// ---------------------------------------------------------------------------

interface UpdateFormState {
  status: string;
}

interface UpdateFormErrors {
  status?: string;
  form?: string;
}

// ---------------------------------------------------------------------------
// Shared field helpers
// ---------------------------------------------------------------------------

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoomForm({ mode, room, onSuccess, onClose }: RoomFormProps) {
  const dialogRef  = useRef<HTMLDivElement>(null);
  const firstFocus = useRef<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Create form state ──────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState<CreateFormState>({
    room_number: '',
    branch_id: '',
    type_id: '',
    status: 'Available',
  });
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});

  // ── Update-status form state ───────────────────────────────────────────
  const [updateForm, setUpdateForm] = useState<UpdateFormState>({
    status: room?.status ?? 'Available',
  });
  const [updateErrors, setUpdateErrors] = useState<UpdateFormErrors>({});

  // ── Focus trap / Escape key ────────────────────────────────────────────

  useEffect(() => {
    firstFocus.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // ── Create form validation ─────────────────────────────────────────────

  function validateCreate(form: CreateFormState): CreateFormErrors {
    const errors: CreateFormErrors = {};
    if (!form.room_number.trim()) {
      errors.room_number = 'Room number is required.';
    } else if (form.room_number.trim().length > 10) {
      errors.room_number = 'Room number must be 10 characters or fewer.';
    }
    if (!form.branch_id) {
      errors.branch_id = 'Branch is required.';
    }
    if (!form.type_id) {
      errors.type_id = 'Room type is required.';
    }
    return errors;
  }

  // ── Submit: create ─────────────────────────────────────────────────────

  async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validateCreate(createForm);
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    setCreateErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/staff/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: createForm.room_number.trim(),
          branch_id:  parseInt(createForm.branch_id, 10),
          type_id:    parseInt(createForm.type_id, 10),
          status:     createForm.status || 'Available',
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setCreateErrors({ form: json?.error?.message ?? 'Room number already exists in this branch.' });
        } else if (json?.error?.fields) {
          const fields = json.error.fields as Record<string, string>;
          setCreateErrors({
            room_number: fields['room_number'],
            branch_id:   fields['branch_id'],
            type_id:     fields['type_id'],
            status:      fields['status'],
            form:        !Object.keys(fields).length ? (json.error.message ?? 'Validation error.') : undefined,
          });
        } else {
          setCreateErrors({ form: json?.error?.message ?? 'Failed to create room.' });
        }
        return;
      }

      const newRoom = json.data;
      const branchLabel = BRANCHES.find((b) => b.id === newRoom.branch_id)?.name ?? `Branch ${newRoom.branch_id}`;
      onSuccess(`Room ${newRoom.room_number} at ${branchLabel} created successfully.`);
    } catch {
      setCreateErrors({ form: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit: update status ──────────────────────────────────────────────

  async function handleUpdateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!room) return;

    if (!updateForm.status) {
      setUpdateErrors({ status: 'Please select a status.' });
      return;
    }

    if (updateForm.status === room.status) {
      setUpdateErrors({ form: 'The selected status is already the current status. No change needed.' });
      return;
    }

    setUpdateErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(`/api/staff/rooms/${room.room_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updateForm.status }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setUpdateErrors({ form: json?.error?.message ?? 'You do not have permission to set this status.' });
        } else {
          setUpdateErrors({ form: json?.error?.message ?? 'Failed to update room status.' });
        }
        return;
      }

      onSuccess(`Room ${room.room_number} status updated to ${updateForm.status}.`);
    } catch {
      setUpdateErrors({ form: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const title      = mode === 'create' ? 'Add New Room' : `Update Status — Room ${room?.room_number ?? ''}`;
  const submitLabel = mode === 'create' ? (submitting ? 'Creating…' : 'Create Room') : (submitting ? 'Saving…' : 'Save Status');

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      {/* Overlay — click closes dialog */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md bg-[#1c1917] border border-[#2e2a27] rounded-xl shadow-2xl overflow-hidden text-[#f7f5f2]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2a27] bg-[#161514]">
          <h2
            id="room-form-title"
            className="font-serif text-lg font-semibold text-[#f7f5f2] tracking-wide"
          >
            {title}
          </h2>
          <button
            id="btn-close-room-form"
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-[#a8a29e] hover:text-[#f7f5f2] hover:bg-[#2e2a27] transition-colors focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
            aria-label="Close dialog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-[#1c1917]">

          {/* ── CREATE MODE ── */}
          {mode === 'create' && (
            <form
              id="form-create-room"
              onSubmit={handleCreateSubmit}
              noValidate
              aria-describedby={createErrors.form ? 'create-form-error' : undefined}
            >
              {/* Form-level error */}
              {createErrors.form && (
                <div
                  id="create-form-error"
                  role="alert"
                  className="mb-4 rounded-md bg-[#7f1d1d]/30 border border-[#991b1b]/50 px-4 py-3 text-sm text-[#fca5a5]"
                >
                  {createErrors.form}
                </div>
              )}

              {/* Room number */}
              <div className="mb-4">
                <label
                  htmlFor="create-room-number"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#a8a29e] mb-1.5"
                >
                  Room Number <span aria-label="required" className="text-red-400">*</span>
                </label>
                <input
                  id="create-room-number"
                  ref={(el) => { firstFocus.current = el; }}
                  type="text"
                  required
                  maxLength={10}
                  value={createForm.room_number}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, room_number: e.target.value }))
                  }
                  aria-describedby={createErrors.room_number ? 'error-room-number' : undefined}
                  aria-invalid={!!createErrors.room_number}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-[#f5f5f4] placeholder-[#78716c] focus:outline-none transition ${
                    createErrors.room_number
                      ? 'border-red-400 bg-red-950/20 focus:border-red-400'
                      : 'border-[#3b3631] bg-[#161514] focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]'
                  }`}
                  placeholder="e.g. 101, 201A"
                />
                <FieldError id="error-room-number" message={createErrors.room_number} />
              </div>

              {/* Branch */}
              <div className="mb-4">
                <label
                  htmlFor="create-branch"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#a8a29e] mb-1.5"
                >
                  Branch <span aria-label="required" className="text-red-400">*</span>
                </label>
                <select
                  id="create-branch"
                  required
                  value={createForm.branch_id}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, branch_id: e.target.value }))
                  }
                  aria-describedby={createErrors.branch_id ? 'error-branch' : undefined}
                  aria-invalid={!!createErrors.branch_id}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-[#f5f5f4] focus:outline-none transition ${
                    createErrors.branch_id
                      ? 'border-red-400 bg-red-950/20 focus:border-red-400'
                      : 'border-[#3b3631] bg-[#161514] focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]'
                  }`}
                >
                  <option value="" className="bg-[#161514] text-[#f5f5f4]">Select branch…</option>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#161514] text-[#f5f5f4]">{b.name}</option>
                  ))}
                </select>
                <FieldError id="error-branch" message={createErrors.branch_id} />
              </div>

              {/* Room type */}
              <div className="mb-4">
                <label
                  htmlFor="create-type"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#a8a29e] mb-1.5"
                >
                  Room Type <span aria-label="required" className="text-red-400">*</span>
                </label>
                <select
                  id="create-type"
                  required
                  value={createForm.type_id}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, type_id: e.target.value }))
                  }
                  aria-describedby={createErrors.type_id ? 'error-type' : undefined}
                  aria-invalid={!!createErrors.type_id}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-[#f5f5f4] focus:outline-none transition ${
                    createErrors.type_id
                      ? 'border-red-400 bg-red-950/20 focus:border-red-400'
                      : 'border-[#3b3631] bg-[#161514] focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]'
                  }`}
                >
                  <option value="" className="bg-[#161514] text-[#f5f5f4]">Select type…</option>
                  {ROOM_TYPES.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#161514] text-[#f5f5f4]">{t.name}</option>
                  ))}
                </select>
                <FieldError id="error-type" message={createErrors.type_id} />
              </div>

              {/* Initial status */}
              <div className="mb-6">
                <label
                  htmlFor="create-status"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#a8a29e] mb-1.5"
                >
                  Initial Status
                </label>
                <select
                  id="create-status"
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  style={{ colorScheme: 'dark' }}
                  className="w-full rounded-md border border-[#3b3631] bg-[#161514] px-3 py-2 text-sm text-[#f5f5f4] focus:outline-none focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880] transition"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#161514] text-[#f5f5f4]">{s.label}</option>
                  ))}
                </select>
                <FieldError id="error-create-status" message={createErrors.status} />
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="btn-cancel-create"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-sm border border-[#3b3631] bg-transparent text-xs uppercase tracking-wider font-semibold text-[#a8a29e] hover:text-[#f7f5f2] hover:border-[#c5a880] transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create"
                  type="submit"
                  disabled={submitting}
                  className="gold-btn py-2 px-5 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          )}

          {/* ── UPDATE STATUS MODE ── */}
          {mode === 'update-status' && room && (
            <form
              id="form-update-room-status"
              onSubmit={handleUpdateSubmit}
              noValidate
              aria-describedby={updateErrors.form ? 'update-form-error' : undefined}
            >
              {/* Room info summary */}
              <div className="mb-5 rounded-lg bg-[#161514] border border-[#2e2a27] px-4 py-3 text-sm text-[#d6d3d1] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#a8a29e]">Room</span>
                  <span className="font-semibold font-mono text-[#c5a880]">{room.room_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a8a29e]">Type</span>
                  <span className="font-medium text-[#f5f5f4]">{room.room_type?.type_name ?? `Type ${room.type_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a8a29e]">Current Status</span>
                  <span className="font-medium text-[#f5f5f4]">{room.status}</span>
                </div>
              </div>

              {/* Form-level error */}
              {updateErrors.form && (
                <div
                  id="update-form-error"
                  role="alert"
                  className="mb-4 rounded-md bg-[#7f1d1d]/30 border border-[#991b1b]/50 px-4 py-3 text-sm text-[#fca5a5]"
                >
                  {updateErrors.form}
                </div>
              )}

              {/* New status */}
              <div className="mb-6">
                <label
                  htmlFor="update-status"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#a8a29e] mb-1.5"
                >
                  New Status <span aria-label="required" className="text-red-400">*</span>
                </label>
                <select
                  id="update-status"
                  ref={(el) => { firstFocus.current = el; }}
                  required
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ status: e.target.value })}
                  aria-describedby={updateErrors.status ? 'error-update-status' : undefined}
                  aria-invalid={!!updateErrors.status}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-[#f5f5f4] focus:outline-none transition ${
                    updateErrors.status
                      ? 'border-red-400 bg-red-950/20 focus:border-red-400'
                      : 'border-[#3b3631] bg-[#161514] focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]'
                  }`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#161514] text-[#f5f5f4]">{s.label}</option>
                  ))}
                </select>
                <FieldError id="error-update-status" message={updateErrors.status} />
                {updateForm.status === 'Maintenance' && (
                  <p className="mt-2 text-xs text-amber-400 flex items-center gap-1.5">
                    <span aria-hidden="true">&#9888;</span>
                    Setting Maintenance requires Manager or Admin role. The server will reject unauthorized requests.
                  </p>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="btn-cancel-update"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-sm border border-[#3b3631] bg-transparent text-xs uppercase tracking-wider font-semibold text-[#a8a29e] hover:text-[#f7f5f2] hover:border-[#c5a880] transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-update"
                  type="submit"
                  disabled={submitting}
                  className="gold-btn py-2 px-5 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
