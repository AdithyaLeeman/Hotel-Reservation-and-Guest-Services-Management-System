'use client';

/**
 * Staff Rooms Management Page - /staff/rooms
 *
 * Owned by: Member 2 (M2) | Task: P02-M02-T15
 * Type: 🟡 MOCK-FIRST - consumes GET /api/staff/rooms (currently mock data).
 *
 * Responsibilities:
 *   - List all rooms visible to the authenticated staff member.
 *   - Receptionist: scoped to their branch (enforced on server, reflected in UI).
 *   - Manager/Admin: can filter by any branch.
 *   - Filters: branch, status, room type (all sent as query params → server filters).
 *   - Actions: open Create Room modal (Manager/Admin), open Update Status modal.
 *
 * Theme: dark (#0a0a0a) matching reservations / admin pages.
 */

import { useState, useEffect, useCallback } from 'react';
import RoomForm from '@/components/RoomForm';
import type { RoomWithDetails } from '@/repositories/room.repository';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export interface BranchOption {
  id: number;
  name: string;
}

export interface RoomTypeOption {
  id: number;
  name: string;
}

export const DEFAULT_BRANCHES: BranchOption[] = [
  { id: 1, name: 'Colombo' },
  { id: 2, name: 'Kandy' },
  { id: 3, name: 'Galle' },
];

export const DEFAULT_ROOM_TYPES: RoomTypeOption[] = [
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

/** pg returns numeric columns as strings - compare as strings */
function branchName(branchId: number | string, branchList: BranchOption[] = DEFAULT_BRANCHES): string {
  return branchList.find((b) => String(b.id) === String(branchId))?.name ?? `Branch ${branchId}`;
}

function formatRate(rate: string | undefined): string {
  if (!rate) return '-';
  const n = parseFloat(rate);
  if (isNaN(n)) return '-';
  return (
    'LKR ' +
    n.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ---------------------------------------------------------------------------
// Status badge - dark theme variants
// ---------------------------------------------------------------------------

function statusBadgeStyle(status: string): React.CSSProperties {
  const map: Record<RoomStatus, React.CSSProperties> = {
    Available:   { background: 'rgba(197, 168, 128, 0.15)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.4)' },
    Occupied:    { background: 'rgba(168, 162, 158, 0.12)', color: '#d6d3d1', border: '1px solid rgba(168, 162, 158, 0.3)' },
    Maintenance: { background: 'rgba(180, 83, 9, 0.15)', color: '#fcd34d', border: '1px solid rgba(180, 83, 9, 0.35)' },
  };
  return map[status as RoomStatus] ?? { background: '#262626', color: '#9ca3af', border: '1px solid #3b3631' };
}

function statusIcon(status: string): string {
  if (status === 'Available')   return '✓';
  if (status === 'Occupied')    return '●';
  if (status === 'Maintenance') return '⚠';
  return '?';
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortRooms(
  rooms: RoomWithDetails[],
  key: SortKey,
  dir: SortDir,
  branchList: BranchOption[] = DEFAULT_BRANCHES,
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
        aVal = branchName(a.branch_id, branchList);
        bVal = branchName(b.branch_id, branchList);
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
// Shared dark-theme styles
// ---------------------------------------------------------------------------

const TH: React.CSSProperties = {
  padding: '0.875rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#a8a29e',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  borderBottom: '1px solid #2e2a27',
  background: '#161514',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '0.95rem 1rem',
  fontSize: '0.875rem',
  color: '#f5f5f4',
  borderBottom: '1px solid #262320',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

const SELECT: React.CSSProperties = {
  background: '#161514',
  border: '1px solid #3b3631',
  borderRadius: 6,
  padding: '0.55rem 0.85rem',
  color: '#f5f5f4',
  fontSize: '0.875rem',
  outline: 'none',
  colorScheme: 'dark',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type ModalMode = 'create' | 'update-status';

interface ModalState {
  mode: ModalMode;
  room?: RoomWithDetails;
}

export default function StaffRoomsPage() {
  const [branches, setBranches]     = useState<BranchOption[]>(DEFAULT_BRANCHES);
  const [roomTypes, setRoomTypes]   = useState<RoomTypeOption[]>(DEFAULT_ROOM_TYPES);
  const [rooms, setRooms]           = useState<RoomWithDetails[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filters, setFilters]       = useState<FilterState>({ branchId: '', status: '', typeId: '' });
  const [sortKey, setSortKey]       = useState<SortKey>('room_number');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [modal, setModal]           = useState<ModalState | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data) && json.data.length > 0) {
          setBranches(
            json.data.map((b: { branch_id: number; location_name: string }) => ({
              id: Number(b.branch_id),
              name: b.location_name,
            }))
          );
        }
      })
      .catch(() => {});

    fetch('/api/room-types')
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data) && json.data.length > 0) {
          setRoomTypes(
            json.data.map((t: { type_id: number; type_name: string }) => ({
              id: Number(t.type_id),
              name: t.type_name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.set('branchId', filters.branchId);
      if (filters.status)   params.set('status', filters.status);
      if (filters.typeId)   params.set('typeId', filters.typeId);

      const res = await fetch(`/api/staff/rooms?${params.toString()}`);
      const json = await res.json() as { data?: RoomWithDetails[]; error?: { message?: string } };

      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to load rooms.');
        setRooms([]);
        return;
      }

      setRooms(json.data ?? []);
    } catch {
      setError('Network error - could not reach the server. Please try again.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.branchId) params.set('branchId', filters.branchId);
        if (filters.status)   params.set('status', filters.status);
        if (filters.typeId)   params.set('typeId', filters.typeId);

        const res = await fetch(`/api/staff/rooms?${params.toString()}`);
        const json = await res.json() as { data?: RoomWithDetails[]; error?: { message?: string } };

        if (ignore) return;
        if (!res.ok) {
          setError(json?.error?.message ?? 'Failed to load rooms.');
          setRooms([]);
        } else {
          setRooms(json.data ?? []);
        }
      } catch {
        if (!ignore) {
          setError('Network error - could not reach the server. Please try again.');
          setRooms([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [filters]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const clearFilters = () => setFilters({ branchId: '', status: '', typeId: '' });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const openCreate = () => setModal({ mode: 'create' });
  const openUpdateStatus = (room: RoomWithDetails) => setModal({ mode: 'update-status', room });
  const closeModal = () => setModal(null);

  const handleFormSuccess = async (msg: string) => {
    closeModal();
    setSuccessMsg(msg);
    await fetchRooms();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const sortedRooms = sortRooms(rooms, sortKey, sortDir, branches);

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <>
      <main
        id="main-content"
        className="min-h-screen bg-[var(--color-bg)] text-[#f7f5f2] selection:bg-[#c5a880]/30 selection:text-[#161514]"
      >
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8">

          {/* ── Page header ── */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-sm bg-[#c5a880]/20 border border-[#c5a880]/60 flex items-center justify-center text-[#c5a880] shadow-sm flex-shrink-0">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <h1 className="font-serif text-3xl font-semibold text-[#f7f5f2] m-0 tracking-[0.02em]">
                  Room Management
                </h1>
                <p className="text-sm text-[#a8a29e] mt-1">
                  View and manage room inventory across all branches.
                </p>
              </div>
            </div>
            <button
              id="btn-create-room"
              type="button"
              onClick={openCreate}
              aria-label="Create a new room"
              className="gold-btn py-2.5 px-6 text-xs font-semibold uppercase tracking-[0.16em] flex items-center gap-2 cursor-pointer shadow-md rounded-sm"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Room
            </button>
          </div>

          {/* ── Success toast ── */}
          {successMsg && (
            <div role="status" aria-live="polite" className="mb-4 bg-[#064e3b]/30 border border-[#065f46]/50 rounded-lg px-4 py-3 text-[#d1fae5] text-sm font-medium">
              ✓ {successMsg}
            </div>
          )}

          {/* ── Error alert ── */}
          {error && (
            <div role="alert" className="mb-4 bg-[#7f1d1d]/30 border border-[#991b1b]/50 rounded-lg px-4 py-3 text-[#fca5a5] text-sm">
              <p className="font-semibold mb-1">Error loading rooms</p>
              <p className="mb-2">{error}</p>
              <button
                id="btn-retry-fetch"
                type="button"
                onClick={fetchRooms}
                className="text-[#fca5a5] underline text-sm cursor-pointer hover:text-white"
              >
                Try again
              </button>
            </div>
          )}

          {/* ── Filter bar ── */}
          <div className="card p-5 mb-5 bg-[#1c1917] border border-[#2e2a27] rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#c5a880] mb-3">
              Filter &amp; Search
            </p>
            <div className="flex flex-wrap items-end gap-3.5">

              {/* Branch */}
              <div className="flex flex-col gap-1 min-w-[160px]">
                <label htmlFor="filter-branch" className="text-xs font-medium text-[#a8a29e]">Branch</label>
                <select id="filter-branch" value={filters.branchId} onChange={(e) => handleFilterChange('branchId', e.target.value)} style={SELECT}>
                  <option value="" className="bg-[#1c1917] text-[#f5f5f4]">All Branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id} className="bg-[#1c1917] text-[#f5f5f4]">{b.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label htmlFor="filter-status" className="text-xs font-medium text-[#a8a29e]">Status</label>
                <select id="filter-status" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} style={SELECT}>
                  <option value="" className="bg-[#1c1917] text-[#f5f5f4]">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="bg-[#1c1917] text-[#f5f5f4]">{s}</option>)}
                </select>
              </div>

              {/* Room Type */}
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label htmlFor="filter-type" className="text-xs font-medium text-[#a8a29e]">Room Type</label>
                <select id="filter-type" value={filters.typeId} onChange={(e) => handleFilterChange('typeId', e.target.value)} style={SELECT}>
                  <option value="" className="bg-[#1c1917] text-[#f5f5f4]">All Types</option>
                  {roomTypes.map((t) => <option key={t.id} value={t.id} className="bg-[#1c1917] text-[#f5f5f4]">{t.name}</option>)}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  id="btn-clear-filters"
                  type="button"
                  onClick={clearFilters}
                  className="self-end px-3.5 py-2 border border-[#3b3631] hover:border-[#c5a880] text-xs uppercase tracking-wider text-[#c5a880] hover:text-[#e0c49c] rounded-md transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              )}

              {!loading && !error && (
                <span className="self-end ml-auto text-xs text-[#a8a29e]">
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          </div>

          {/* ── Table panel ── */}
          <div className="card overflow-hidden bg-[#1c1917] border border-[#2e2a27] rounded-xl shadow-sm">
            {loading ? (
              <div role="status" aria-label="Loading rooms" className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-[#2e2a27] border-t-[#c5a880] animate-spin" />
                <p className="text-sm text-[#a8a29e]">Loading rooms…</p>
              </div>
            ) : sortedRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[#161514] border border-[#2e2a27] flex items-center justify-center text-2xl text-[#c5a880]">
                  🚪
                </div>
                <div>
                  <p className="font-semibold text-base mb-1 text-[#f7f5f2]">No rooms found</p>
                  <p className="text-sm text-[#a8a29e] max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'No rooms match the current filters. Try adjusting or clearing them.'
                      : 'No rooms have been added yet. Use "Add Room" to create one.'}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    id="btn-empty-clear-filters"
                    type="button"
                    onClick={clearFilters}
                    className="text-xs uppercase tracking-wider text-[#c5a880] underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table id="rooms-table" className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: 700 }} aria-label="Rooms list">
                  <thead>
                    <tr>
                      {[
                        { label: 'Room #',      key: 'room_number' as SortKey },
                        { label: 'Branch',      key: 'branch_id'  as SortKey },
                        { label: 'Type',        key: 'type_name'  as SortKey },
                        { label: 'Rate / Night', key: null },
                        { label: 'Status',      key: 'status'     as SortKey },
                        { label: 'Actions',     key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          style={{ ...TH, textAlign: label === 'Rate / Night' || label === 'Actions' ? 'right' : 'left' }}
                          onClick={key ? () => handleSort(key) : undefined}
                          aria-sort={key && sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                        >
                          {label}{key ? sortArrow(key) : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRooms.map((room) => (
                      <tr
                        key={room.room_id}
                        id={`room-row-${room.room_id}`}
                        className="hover:bg-[#23201d]/60 transition-colors"
                      >
                        <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 600, color: '#c5a880' }}>
                          {room.room_number}
                        </td>
                        <td style={TD}>{branchName(room.branch_id, branches)}</td>
                        <td style={TD}>{room.room_type?.type_name ?? `Type ${room.type_id}`}</td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>
                          {formatRate(room.room_type?.daily_rate)}
                        </td>
                        <td style={TD}>
                          <span style={{
                            ...statusBadgeStyle(room.status),
                            borderRadius: 9999, padding: '3px 10px',
                            fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex',
                            alignItems: 'center', gap: '0.35rem',
                          }}>
                            <span>{statusIcon(room.status)}</span>
                            {room.status}
                          </span>
                        </td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <button
                            id={`btn-update-status-${room.room_id}`}
                            type="button"
                            onClick={() => openUpdateStatus(room)}
                            aria-label={`Change status of room ${room.room_number}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#3b3631] hover:border-[#c5a880] text-xs uppercase tracking-wider text-[#c5a880] hover:text-[#e0c49c] hover:bg-[#c5a880]/10 rounded-sm transition-all cursor-pointer"
                          >
                            ✎ Update Status
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
