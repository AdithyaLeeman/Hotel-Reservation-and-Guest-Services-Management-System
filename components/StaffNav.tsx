import { getSession } from '@/lib/auth/session';
import { isStaffRole } from '@/types/enums';
import StaffNavClient from './StaffNavClient';

export default async function StaffNav() {
  const session = await getSession();

  if (!session?.role || !isStaffRole(session.role)) return null;

  const role = session.role;

  const staffName: string | null = null;


  const branchName: string | null = null;

  return (
    <StaffNavClient
      role={role}
      staffName={staffName}
      branchName={branchName}
    />
  );
}
