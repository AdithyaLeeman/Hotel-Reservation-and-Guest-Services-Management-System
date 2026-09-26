import { getSession } from '@/lib/auth/session';
import type { StaffRole } from '@/types/enums';
import StaffNavClient from './StaffNavClient';

export default async function StaffNav() {
  const session = await getSession();

  const role = session?.role as StaffRole | undefined;
  if (!role) return null;

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
