'use client';

/**
 * Staff Rooms Management Page — /staff/rooms
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T15
 * Type: 🟡 MOCK-FIRST — consumes GET /api/staff/rooms (currently mock data).
 *
 * Responsibilities:
 *   - List all rooms visible to the authenticated staff member.
 *   - Receptionist: scoped to their branch (enforced on server, reflected in UI).
 *   - Manager/Admin: can filter by any branch.
 *   - Filters: branch, status, room type.
 *   - Actions: open Create Room modal (Manager/Admin), open Update Status modal.
 *
 * UI Rules (context/07-ui-rules.md):
 *   - Dense, information-rich operational table with status badges.
 *   - Empty state shown explicitly.
 *   - Horizontal scroll on mobile; row hover highlight.
 *   - Loading spinner while fetching; error alert on failure.
 *   - Unique, descriptive id attributes on all interactive elements.
 */

import { useState, useEffect, useCallback } from 'react';
import StaffNav from '@/components/StaffNav';
import RoomForm from '@/components/RoomForm';
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

const STATUS_OPTIONS = ['Available', 'Occupied', 'Maintenance'] as const;
type RoomStatus = (typeof STATUS_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = 'room_number' | 'branch_id' | 'type_name' | 'status';
type SortDir = 'asc' | 'desc';

interface FilterState {
  branchId: string;
  status: string;
  typeId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function branchName(branchId: number): string {
  return BRANCHES.find((b) => b.id === branchId)?.name ?? `Branch ${branchId}`;
}

function formatRate(rate: string | undefined): string {
  if (!rate) return '\u2014';
  const n = parseFloat(rate);
  if (isNaN(n)) return '\u2014';
  return (
    'LKR ' +
    n.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_BADGE_CLASSES: Record<RoomStatus, string> = {
  Available:   'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Occupied:    'bg-blue-100 text-blue-800 border border-blue-200',
  Maintenance: 'bg-amber-100 text-amber-800 border border-amber-200',
};

const STATUS_ICONS: Record<RoomStatus, string> = {
  Available:   '\u2713',
  Occupied:    '\u25cf',
  Maintenance: '\u26a0',
};

function StatusBadge({ status }: { status: string }) {
  const s = status as RoomStatus;
  const cls = STATUS_BADGE_CLASSES[s] ?? 'bg-gray-100 text-gray-700 border border-gray-200';
  const icon = STATUS_ICONS[s] ?? '?';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
      aria-label={`Status: ${status}`}
    >
      <span aria-hidden="true">{icon}</span>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortRooms(
  rooms: RoomWithDetails[],
  key: SortKey,
  dir: SortDir
): RoomWithDetails[] {
  return [...rooms].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (key) {
      case 'type_name':
        aVal = a.room_type?.type_name ?? '';
        bVal = b.room_type?.type_name ?? '';
        break;
      case 'branch_id':
        aVal = branchName(a.branch_id);
        bVal = branchName(b.branch_id);
        break;
      default:
        aVal = (a[key] as string | number) ?? '';
        bVal = (b[key] as string | number) ?? '';
    }

    const cmp =
      typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));

    return dir === 'asc' ? cmp : -cmp;
  });
}

// ---------------------------------------------------------------------------
// SortHeader
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-gray-800 transition-colors"
      onClick={() => onSort(sortKey)}
      aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="flex items-center gap-1">
        {label}
        <span aria-hidden="true" className="text-gray-400">
          {isActive ? (dir === 'asc' ? '\u2191' : '\u2193') : '\u2195'}
        </span>
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type ModalMode = 'create' | 'update-status';

interface ModalState {
  mode: ModalMode;
  room?: RoomWithDetails;
}

export default function StaffRoomsPage() {
  const [rooms, setRooms]           = useState<RoomWithDetails[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filters, setFilters]       = useState<FilterState>({ branchId: '', status: '', typeId: '' });
  const [sortKey, setSortKey]       = useState<SortKey>('room_number');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [modal, setModal]           = useState<ModalState | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.set('branchId', filters.branchId);
      if (filters.status)   params.set('status', filters.status);
      if (filters.typeId)   params.set('typeId', filters.typeId);

      // TODO: replace with real API call once SP2.1 is executed (P06-M02-T01)
      const res = await fetch(`/api/staff/rooms?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to load rooms.');
        return;
      }

      setRooms(json.data ?? []);
    } catch {
      setError('Network error \u2014 could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () =>
    setFilters({ branchId: '', status: '', typeId: '' });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const openCreate = () => setModal({ mode: 'create' });

  const openUpdateStatus = (room: RoomWithDetails) =>
    setModal({ mode: 'update-status', room });

  const closeModal = () => setModal(null);

  const handleFormSuccess = async (msg: string) => {
    closeModal();
    setSuccessMsg(msg);
    await fetchRooms();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const sortedRooms = sortRooms(rooms, sortKey, sortDir);

  return (
    <>
      <StaffNav />

      <main id="main-content" className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">

          {/* Page header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Room Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage room inventory across all branches.
              </p>
            </div>
            <button
              id="btn-create-room"
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              aria-label="Create a new room"
            >
              <span aria-hidden="true">+</span> Add Room
            </button>
          </div>

          {/* Success toast */}
          {successMsg && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800"
            >
              <span aria-hidden="true" className="text-emerald-500 font-bold">&#10003;</span>
              {successMsg}
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
            >
              <span aria-hidden="true" className="text-red-500 font-bold mt-0.5">&#10005;</span>
              <div>
                <p className="font-semibold">Error loading rooms</p>
                <p>{error}</p>
                <button
                  id="btn-retry-fetch"
                  type="button"
                  onClick={fetchRooms}
                  className="mt-1 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label htmlFor="filter-branch" className="text-xs font-medium text-gray-600">
                  Branch
                </label>
                <select
                  id="filter-branch"
                  value={filters.branchId}
                  onChange={(e) => handleFilterChange('branchId', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Branches</option>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[150px]">
                <label htmlFor="filter-status" className="text-xs font-medium text-gray-600">
                  Status
                </label>
                <select
                  id="filter-status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[150px]">
                <label htmlFor="filter-type" className="text-xs font-medium text-gray-600">
                  Room Type
                </label>
                <select
                  id="filter-type"
                  value={filters.typeId}
                  onChange={(e) => handleFilterChange('typeId', e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Types</option>
                  {ROOM_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  id="btn-clear-filters"
                  type="button"
                  onClick={clearFilters}
                  className="self-end px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Clear filters
                </button>
              )}

              {!loading && !error && (
                <span className="self-end ml-auto text-xs text-gray-500">
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          </div>

          {/* Table panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div
                role="status"
                aria-label="Loading rooms"
                className="flex flex-col items-center justify-center py-20 gap-4"
              >
                <svg
                  className="w-8 h-8 text-indigo-500 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-500">Loading rooms&hellip;</p>
              </div>
            ) : sortedRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
                <div
                  aria-hidden="true"
                  className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-400"
                >
                  &#128682;
                </div>
                <p className="text-base font-semibold text-gray-700">No rooms found</p>
                <p className="text-sm text-gray-500 max-w-xs">
                  {hasActiveFilters
                    ? 'No rooms match the current filters. Try adjusting or clearing them.'
                    : 'No rooms have been added yet. Use "Add Room" to create one.'}
                </p>
                {hasActiveFilters && (
                  <button
                    id="btn-empty-clear-filters"
                    type="button"
                    onClick={clearFilters}
                    className="mt-1 text-sm text-indigo-600 underline hover:no-underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  id="rooms-table"
                  className="min-w-full divide-y divide-gray-200 text-sm"
                  aria-label="Rooms list"
                >
                  <thead className="bg-gray-50">
                    <tr>
                      <SortHeader label="Room #"  sortKey="room_number" current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Branch"  sortKey="branch_id"   current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Type"    sortKey="type_name"   current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Rate / Night
                      </th>
                      <SortHeader label="Status"  sortKey="status"      current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedRooms.map((room) => (
                      <tr
                        key={room.room_id}
                        id={`room-row-${room.room_id}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                          {room.room_number}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {branchName(room.branch_id)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {room.room_type?.type_name ?? `Type ${room.type_id}`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700 whitespace-nowrap tabular-nums">
                          {formatRate(room.room_type?.daily_rate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={room.status} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            id={`btn-update-status-${room.room_id}`}
                            type="button"
                            onClick={() => openUpdateStatus(room)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label={`Change status of room ${room.room_number}`}
                          >
                            &#9998; Update Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {modal && (
        <RoomForm
          mode={modal.mode}
          room={modal.room}
          onSuccess={handleFormSuccess}
          onClose={closeModal}
        />
      )}
    </>
  );
}
