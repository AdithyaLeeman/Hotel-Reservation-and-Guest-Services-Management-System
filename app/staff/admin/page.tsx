/**
 * Staff Administration Panel — /staff/admin
 *
 * Admin-only page for managing staff accounts, viewing branch info,
 * and system administration tasks.
 *
 * Features (v2 — interactive):
 *   - Add Staff Member modal (create Receptionist / Manager)
 *   - Change Branch inline modal
 *   - Toggle account status (Active / Suspended)
 *   - Reservation Audit Log table (from vw_audit_log)
 *
 * Access: Admin role only (enforced server-side via session check).
 * Theme: Royella luxury 5-star hotel dark & gold aesthetic.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface StaffRow {
  employee_id: number;
  user_id: string;
  employee_number: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  branch_id: number | null;
  branch_name: string | null;
  department: string | null;
  position: string | null;
}

interface BranchRow {
  branch_id: number;
  location_name: string;
}

interface AuditRow {
  audit_id: string;
  reservation_id: string;
  guest_full_name: string;
  guest_email: string;
  branch_location_name: string;
  old_status: string;
  new_status: string;
  changed_at: string;
  changed_by_name: string;
  actor_role: string;
  employee_number: string | null;
  change_reason: string | null;
}

interface SystemStats {
  total_staff: number;
  total_guests: number;
  total_reservations: number;
  total_rooms: number;
}

interface AdminData {
  staff: StaffRow[];
  branches: BranchRow[];
  stats: SystemStats;
  audit: AuditRow[];
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function roleBadgeStyle(role: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    Admin: { background: 'rgba(197, 168, 128, 0.2)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.45)' },
    Manager: { background: 'rgba(180, 83, 9, 0.16)', color: '#fcd34d', border: '1px solid rgba(180, 83, 9, 0.4)' },
    Receptionist: { background: 'rgba(197, 168, 128, 0.12)', color: '#e0c49c', border: '1px solid rgba(197, 168, 128, 0.35)' },
  };
  return map[role] ?? { background: '#262626', color: '#d1d5db', border: '1px solid #3b3631' };
}

function statusBadgeStyle(status: string): React.CSSProperties {
  if (status === 'Active') return { background: 'rgba(197, 168, 128, 0.15)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.4)' };
  if (status === 'Suspended') return { background: 'rgba(127, 29, 29, 0.2)', color: '#fca5a5', border: '1px solid rgba(127, 29, 29, 0.4)' };
  return { background: '#262626', color: '#d1d5db', border: '1px solid #3b3631' };
}

function statusBadgeSql(status: string): React.CSSProperties {
  const statusMap: Record<string, React.CSSProperties> = {
    Booked: { background: 'rgba(197, 168, 128, 0.15)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.4)' },
    CheckedIn: { background: 'rgba(197, 168, 128, 0.22)', color: '#f5e6d3', border: '1px solid rgba(197, 168, 128, 0.45)' },
    CheckedOut: { background: 'rgba(168, 162, 158, 0.12)', color: '#d6d3d1', border: '1px solid rgba(168, 162, 158, 0.3)' },
    Cancelled: { background: 'rgba(127, 29, 29, 0.2)', color: '#fca5a5', border: '1px solid rgba(127, 29, 29, 0.4)' },
  };
  return statusMap[status] ?? { background: '#262626', color: '#9ca3af', border: '1px solid #3b3631' };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ─── Add Staff Modal ─────────────────────────────────────────────────────── */

interface AddStaffModalProps {
  branches: BranchRow[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddStaffModal({ branches, onClose, onSuccess }: AddStaffModalProps) {
  const [form, setForm] = useState({
    full_name: '', email: '', username: '', password: '',
    role: 'Receptionist', branch_id: branches[0]?.branch_id?.toString() ?? '1',
    employee_number: '', department: '', position: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/staff/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_staff',
          ...form,
          branch_id: parseInt(form.branch_id),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to create staff member');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#161514', border: '1px solid #3b3631',
    borderRadius: 6, padding: '0.6rem 0.8rem', color: '#f5f5f4',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
    colorScheme: 'dark',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#1c1917', border: '1px solid #2e2a27', borderRadius: 14, padding: '2rem',
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        color: '#f7f5f2', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #2e2a27', paddingBottom: '1rem' }}>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#f7f5f2] m-0">Add Staff Member</h2>
            <p className="text-xs text-[#a8a29e] mt-1 m-0">Create credentials and branch assignment for new employee</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(127, 29, 29, 0.3)', border: '1px solid rgba(153, 27, 27, 0.5)', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} placeholder="Jane Smith" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required style={inputStyle} placeholder="jane@skynest.lk" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Username *</label>
              <input name="username" value={form.username} onChange={handleChange} required style={inputStyle} placeholder="recep_kandy" />
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required style={inputStyle} placeholder="Min 8 characters" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Role *</label>
              <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
                <option value="Receptionist" className="bg-[#161514] text-[#f5f5f4]">Receptionist</option>
                <option value="Manager" className="bg-[#161514] text-[#f5f5f4]">Manager</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Branch *</label>
              <select name="branch_id" value={form.branch_id} onChange={handleChange} style={inputStyle}>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id} className="bg-[#161514] text-[#f5f5f4]">{b.location_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Employee Number *</label>
              <input name="employee_number" value={form.employee_number} onChange={handleChange} required style={inputStyle} placeholder="EMP-REC-004" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="+94770000000" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Department</label>
              <input name="department" value={form.department} onChange={handleChange} style={inputStyle} placeholder="Front Office" />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <input name="position" value={form.position} onChange={handleChange} style={inputStyle} placeholder="Receptionist" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #2e2a27' }}>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', border: '1px solid #3b3631', borderRadius: 4,
              color: '#a8a29e', padding: '0.55rem 1.25rem', cursor: 'pointer', fontSize: '0.75rem',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>Cancel</button>
            <button type="submit" disabled={loading} className="gold-btn" style={{
              padding: '0.55rem 1.4rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Creating…' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Change Branch Modal ─────────────────────────────────────────────────── */

interface ChangeBranchModalProps {
  staff: StaffRow;
  branches: BranchRow[];
  onClose: () => void;
  onSuccess: () => void;
}

function ChangeBranchModal({ staff, branches, onClose, onSuccess }: ChangeBranchModalProps) {
  const [branchId, setBranchId] = useState(staff.branch_id?.toString() ?? branches[0]?.branch_id?.toString() ?? '1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/staff/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_branch', employee_id: staff.employee_id, branch_id: parseInt(branchId) }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Failed to update branch'); return; }
      onSuccess();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#1c1917', border: '1px solid #2e2a27', borderRadius: 14, padding: '2rem', width: '100%', maxWidth: 420, color: '#f7f5f2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #2e2a27', paddingBottom: '0.75rem' }}>
          <h2 className="font-serif text-lg font-semibold text-[#f7f5f2] m-0">Change Branch</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ color: '#a8a29e', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Reassigning branch scope for <strong style={{ color: '#f5f5f4' }}>{staff.full_name}</strong>
        </p>
        {error && <div style={{ background: 'rgba(127, 29, 29, 0.3)', border: '1px solid rgba(153, 27, 27, 0.5)', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <select
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
            style={{ background: '#161514', border: '1px solid #3b3631', borderRadius: 6, padding: '0.6rem 0.8rem', color: '#f5f5f4', fontSize: '0.875rem', colorScheme: 'dark' }}
          >
            {branches.map(b => <option key={b.branch_id} value={b.branch_id} className="bg-[#161514] text-[#f5f5f4]">{b.location_name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', border: '1px solid #3b3631', borderRadius: 4,
              color: '#a8a29e', padding: '0.55rem 1.25rem', cursor: 'pointer', fontSize: '0.75rem',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>Cancel</button>
            <button type="submit" disabled={loading} className="gold-btn" style={{
              padding: '0.55rem 1.4rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [changeBranchTarget, setChangeBranchTarget] = useState<StaffRow | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'staff' | 'audit'>('staff');
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/admin/data');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/staff/login';
          return;
        }
        throw new Error('Failed to load admin data');
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleStatus = async (user_id: string, current_status: string) => {
    const new_status = current_status === 'Active' ? 'Suspended' : 'Active';
    setTogglingUserId(user_id);
    try {
      const res = await fetch('/api/staff/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status', user_id, new_status }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(`Error: ${json.error?.message}`); return; }
      showToast(json.data?.message ?? 'Status updated');
      await loadData();
    } catch {
      showToast('Network error');
    } finally {
      setTogglingUserId(null);
    }
  };

  const td: React.CSSProperties = { padding: '0.95rem 1rem', fontSize: '0.85rem', color: '#f5f5f4', borderBottom: '1px solid #262320', verticalAlign: 'middle' };
  const th: React.CSSProperties = { padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #2e2a27', background: '#161514' };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[#f7f5f2] flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #2e2a27', borderTopColor: '#c5a880', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#a8a29e', fontSize: '0.875rem' }}>Loading administration panel…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] text-[#f7f5f2] flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fca5a5', marginBottom: '1rem' }}>{error || 'Failed to load data'}</p>
          <button onClick={loadData} className="gold-btn">Retry</button>
        </div>
      </main>
    );
  }

  const { staff, branches, stats, audit } = data;

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[var(--color-bg)] text-[#f7f5f2] selection:bg-[#c5a880]/30 selection:text-[#161514]"
    >
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Toast ── */}
        {toastMsg && (
          <div style={{
            position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2000,
            background: 'rgba(6, 95, 70, 0.95)', border: '1px solid #059669', borderRadius: 8,
            padding: '0.75rem 1.25rem', color: '#d1fae5', fontSize: '0.875rem', fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            ✓ {toastMsg}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.8125rem', color: '#a8a29e' }}>
            <Link href="/staff/dashboard" style={{ color: '#a8a29e', textDecoration: 'none' }} className="hover:text-[#c5a880] transition-colors">
              Dashboard
            </Link>
            <span style={{ color: '#57534e' }}>›</span>
            <span style={{ color: '#f7f5f2' }}>Administration</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="w-11 h-11 rounded-sm bg-[#c5a880]/20 border border-[#c5a880]/60 flex items-center justify-center text-[#c5a880] shadow-sm flex-shrink-0">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-3xl font-semibold text-[#f7f5f2] m-0 tracking-[0.02em]">Administration</h1>
              <p style={{ color: '#a8a29e', margin: 0, fontSize: '0.875rem', marginTop: '0.2rem' }}>System-wide management — SkyNest Hotels</p>
            </div>
          </div>
        </div>

        {/* ── System Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            {
              label: 'Staff Members',
              value: stats.total_staff,
              icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
            },
            {
              label: 'Registered Guests',
              value: stats.total_guests,
              icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
            },
            {
              label: 'Total Reservations',
              value: stats.total_reservations,
              icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              label: 'Total Rooms',
              value: stats.total_rooms,
              icon: (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.label} className="p-5 bg-[#1c1917] border border-[#2e2a27] rounded-xl shadow-sm flex flex-col justify-between">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {s.label}
                </span>
                <div style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: 'rgba(197, 168, 128, 0.12)', border: '1px solid rgba(197, 168, 128, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c5a880',
                }}>
                  {s.icon}
                </div>
              </div>
              <div className="font-serif text-3xl font-bold text-[#c5a880]">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Branches ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#c5a880', marginBottom: '1rem', margin: 0 }}>
            Branches ({branches.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginTop: '0.75rem' }}>
            {branches.map((b) => {
              const branchStaff = staff.filter(s => s.branch_id === b.branch_id);
              return (
                <div key={b.branch_id} className="p-5 bg-[#1c1917] border border-[#2e2a27] rounded-xl shadow-sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#f7f5f2' }}>{b.location_name}</div>
                    <span style={{
                      background: 'rgba(197, 168, 128, 0.12)', color: '#c5a880', border: '1px solid rgba(197, 168, 128, 0.3)',
                      borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em',
                    }}>
                      Branch #{b.branch_id}
                    </span>
                  </div>
                  <div style={{ color: '#a8a29e', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                    {branchStaff.length} staff member{branchStaff.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #2e2a27' }}>
          {(['staff', 'audit'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.75rem 1.25rem', fontSize: '0.85rem', fontWeight: 600,
                color: activeTab === tab ? '#c5a880' : '#a8a29e',
                borderBottom: activeTab === tab ? '2px solid #c5a880' : '2px solid transparent',
                marginBottom: '-1px', transition: 'all 0.15s',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              {tab === 'staff' ? `Staff Accounts (${staff.length})` : `Audit Log (${audit.length})`}
            </button>
          ))}
        </div>

        {/* ── Staff Accounts Tab ── */}
        {activeTab === 'staff' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="font-serif text-xl font-semibold text-[#f7f5f2] m-0">
                Staff Accounts
              </h2>
              <button
                id="add-staff-btn"
                onClick={() => setShowAddModal(true)}
                className="gold-btn py-2 px-5 text-xs font-semibold uppercase tracking-[0.14em] flex items-center gap-2 cursor-pointer shadow-md rounded-sm"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Staff Member
              </button>
            </div>

            <div style={{ background: '#1c1917', border: '1px solid #2e2a27', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {staff.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#a8a29e' }}>No staff accounts found</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr>
                        {['Employee #', 'Name', 'Email', 'Role', 'Branch', 'Dept / Position', 'Status', 'Actions'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s.employee_id} style={{ transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#221f1d')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ ...td, fontFamily: 'monospace', color: '#c5a880', fontWeight: 600 }}>{s.employee_number}</td>
                          <td style={{ ...td, fontWeight: 500, color: '#f7f5f2' }}>{s.full_name}</td>
                          <td style={{ ...td, color: '#d6d3d1' }}>{s.email}</td>
                          <td style={td}>
                            <span style={{ ...roleBadgeStyle(s.role), borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}>
                              {s.role}
                            </span>
                          </td>
                          <td style={{ ...td, color: '#d6d3d1' }}>{s.branch_name ?? <em style={{ color: '#78716c' }}>All branches</em>}</td>
                          <td style={{ ...td, color: '#a8a29e' }}>{[s.department, s.position].filter(Boolean).join(' · ') || <em style={{ color: '#78716c' }}>—</em>}</td>
                          <td style={td}>
                            <span style={{ ...statusBadgeStyle(s.status), borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block' }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {/* Change Branch */}
                              <button
                                id={`change-branch-${s.employee_id}`}
                                onClick={() => setChangeBranchTarget(s)}
                                style={{
                                  background: '#161514', border: '1px solid #3b3631', borderRadius: 4,
                                  color: '#c5a880', padding: '3px 9px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                                  textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#c5a880')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#3b3631')}
                              >
                                Branch
                              </button>
                              {/* Toggle Status — hide for Admins (protect system accounts) */}
                              {s.role !== 'Admin' && (
                                <button
                                  id={`toggle-status-${s.user_id}`}
                                  onClick={() => handleToggleStatus(s.user_id, s.status)}
                                  disabled={togglingUserId === s.user_id}
                                  style={{
                                    background: s.status === 'Active' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(6, 95, 70, 0.2)',
                                    border: `1px solid ${s.status === 'Active' ? 'rgba(127, 29, 29, 0.5)' : 'rgba(6, 95, 70, 0.5)'}`,
                                    borderRadius: 4, color: s.status === 'Active' ? '#fca5a5' : '#6ee7b7',
                                    padding: '3px 9px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                    opacity: togglingUserId === s.user_id ? 0.6 : 1,
                                  }}
                                >
                                  {s.status === 'Active' ? 'Suspend' : 'Activate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Audit Log Tab ── */}
        {activeTab === 'audit' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="font-serif text-xl font-semibold text-[#f7f5f2] m-0">
                Reservation Audit Log
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last {audit.length} entries · Newest first</span>
            </div>
            <div style={{ background: '#1c1917', border: '1px solid #2e2a27', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {audit.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#a8a29e' }}>No audit entries found</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr>
                        {['Time', 'Reservation', 'Guest', 'Branch', 'Status Change', 'Changed By', 'Employee #', 'Reason'].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((a) => (
                        <tr key={a.audit_id}
                          onMouseEnter={e => (e.currentTarget.style.background = '#221f1d')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ ...td, fontSize: '0.78rem', whiteSpace: 'nowrap', color: '#a8a29e' }}>{formatDate(a.changed_at)}</td>
                          <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#c5a880', maxWidth: 120 }}>
                            <span title={a.reservation_id}>{a.reservation_id.slice(0, 8)}…</span>
                          </td>
                          <td style={td}>
                            <div style={{ fontWeight: 500, color: '#f7f5f2', fontSize: '0.85rem' }}>{a.guest_full_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{a.guest_email}</div>
                          </td>
                          <td style={{ ...td, color: '#d6d3d1' }}>{a.branch_location_name}</td>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ ...statusBadgeSql(a.old_status), borderRadius: 4, padding: '2px 7px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-block' }}>{a.old_status}</span>
                              <span style={{ color: '#78716c', fontSize: '0.75rem' }}>→</span>
                              <span style={{ ...statusBadgeSql(a.new_status), borderRadius: 4, padding: '2px 7px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-block' }}>{a.new_status}</span>
                            </div>
                          </td>
                          <td style={td}>
                            <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#f7f5f2' }}>{a.changed_by_name}</div>
                            <span style={{ ...roleBadgeStyle(a.actor_role), borderRadius: 3, padding: '1px 5px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-block', marginTop: 2 }}>{a.actor_role}</span>
                          </td>
                          <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#c5a880' }}>
                            {a.employee_number ?? <em style={{ color: '#78716c' }}>—</em>}
                          </td>
                          <td style={{ ...td, fontSize: '0.8rem', color: '#a8a29e' }}>
                            {a.change_reason ?? <em style={{ color: '#78716c' }}>—</em>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddStaffModal
          branches={branches}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { showToast('Staff member created successfully'); loadData(); }}
        />
      )}
      {changeBranchTarget && (
        <ChangeBranchModal
          staff={changeBranchTarget}
          branches={branches}
          onClose={() => setChangeBranchTarget(null)}
          onSuccess={() => { showToast('Branch updated successfully'); loadData(); }}
        />
      )}
    </main>
  );
}
