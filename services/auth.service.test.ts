import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, AuthServiceError } from './auth.service';
import { withTransaction } from '@/lib/db/transaction';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { userRepository } from '@/repositories/user.repository';
import { guestRepository } from '@/repositories/guest.repository';
import type { PoolClient } from '@/lib/db/pool';

vi.mock('@/lib/db/transaction', () => ({
  withTransaction: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('@/repositories/user.repository', () => ({
  userRepository: {
    insertUserAccount: vi.fn(),
    findByUsername: vi.fn(),
    findStaffByUsername: vi.fn(),
  },
}));

vi.mock('@/repositories/guest.repository', () => ({
  guestRepository: {
    insertGuest: vi.fn(),
    findByUserId: vi.fn(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerGuest', () => {
    it('hashes password and registers user_account + guest inside transaction', async () => {
      const mockClient = {} as PoolClient;
      const mockUser = {
        user_id: 'user-uuid-1',
        username: 'johndoe',
        role: 'Guest' as const,
        status: 'Active' as const,
      };
      const mockGuest = {
        guest_id: 'guest-uuid-1',
        user_id: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        identification: 'NIC123456',
      };

      vi.mocked(hashPassword).mockResolvedValueOnce('$2a$12$hashedpassword');
      vi.mocked(withTransaction).mockImplementationOnce(async (callback) => {
        return callback(mockClient);
      });
      vi.mocked(userRepository.insertUserAccount).mockResolvedValueOnce(mockUser);
      vi.mocked(guestRepository.insertGuest).mockResolvedValueOnce(mockGuest);

      const input = {
        username: 'johndoe',
        password: 'SecurePassword123!',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        identification: 'NIC123456',
      };

      const result = await authService.registerGuest(input);

      expect(hashPassword).toHaveBeenCalledWith('SecurePassword123!');
      expect(userRepository.insertUserAccount).toHaveBeenCalledWith(mockClient, {
        username: 'johndoe',
        password_hash: '$2a$12$hashedpassword',
        role: 'Guest',
      });
      expect(guestRepository.insertGuest).toHaveBeenCalledWith(mockClient, {
        user_id: 'user-uuid-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+94771234567',
        identification: 'NIC123456',
      });
      expect(result).toEqual({ user: mockUser, guest: mockGuest });
    });

    it('re-throws transaction failure (e.g. UNIQUE violation 23505)', async () => {
      const dbError = Object.assign(new Error('duplicate key value violates unique constraint'), {
        code: '23505',
      });

      vi.mocked(hashPassword).mockResolvedValueOnce('$2a$12$hashedpassword');
      vi.mocked(withTransaction).mockRejectedValueOnce(dbError);

      await expect(
        authService.registerGuest({
          username: 'existinguser',
          password: 'Password123!',
          full_name: 'Existing User',
          email: 'exist@example.com',
        })
      ).rejects.toThrow(dbError);
    });
  });

  describe('loginGuest', () => {
    const mockUser = {
      user_id: 'user-uuid-1',
      username: 'johndoe',
      role: 'Guest' as const,
      status: 'Active' as const,
      password_hash: '$2a$12$hashedpassword',
    };
    const mockGuest = {
      guest_id: 'guest-uuid-1',
      user_id: 'user-uuid-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: null,
      identification: null,
    };

    it('authenticates guest and returns SessionData', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(guestRepository.findByUserId).mockResolvedValueOnce(mockGuest);

      const session = await authService.loginGuest({
        username: 'johndoe',
        password: 'CorrectPassword123!',
      });

      expect(userRepository.findByUsername).toHaveBeenCalledWith('johndoe');
      expect(verifyPassword).toHaveBeenCalledWith('CorrectPassword123!', '$2a$12$hashedpassword');
      expect(guestRepository.findByUserId).toHaveBeenCalledWith('user-uuid-1');
      expect(session).toEqual({
        userId: 'user-uuid-1',
        role: 'Guest',
        guestId: 'guest-uuid-1',
      });
    });

    it('throws INVALID_CREDENTIALS when user is not found', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValueOnce(null);

      const err = await authService
        .loginGuest({ username: 'nonexistent', password: 'Password123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('INVALID_CREDENTIALS');
    });

    it('throws INVALID_CREDENTIALS when password does not match', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const err = await authService
        .loginGuest({ username: 'johndoe', password: 'WrongPassword123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('INVALID_CREDENTIALS');
    });

    it('throws INVALID_CREDENTIALS when user role is not Guest', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValueOnce({
        ...mockUser,
        role: 'Receptionist' as const,
      });
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const err = await authService
        .loginGuest({ username: 'johndoe', password: 'Password123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('INVALID_CREDENTIALS');
    });

    it('throws ACCOUNT_INACTIVE when account status is Inactive', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValueOnce({
        ...mockUser,
        status: 'Inactive' as const,
      });
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const err = await authService
        .loginGuest({ username: 'johndoe', password: 'Password123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('ACCOUNT_INACTIVE');
    });

    it('throws Error if guest profile is unexpectedly missing', async () => {
      vi.mocked(userRepository.findByUsername).mockResolvedValueOnce(mockUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(guestRepository.findByUserId).mockResolvedValueOnce(null);

      await expect(
        authService.loginGuest({ username: 'johndoe', password: 'Password123!' })
      ).rejects.toThrow(/No guest profile found/);
    });
  });

  describe('loginStaff', () => {
    const mockStaffUser = {
      user_id: 'staff-uuid-1',
      username: 'receptionist1',
      role: 'Receptionist' as const,
      status: 'Active' as const,
      password_hash: '$2a$12$hashedstaffpassword',
      employee_id: 5,
      branch_id: 1,
    };

    it('authenticates Receptionist staff with branch_id', async () => {
      vi.mocked(userRepository.findStaffByUsername).mockResolvedValueOnce(mockStaffUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const session = await authService.loginStaff({
        username: 'receptionist1',
        password: 'StaffPassword123!',
      });

      expect(userRepository.findStaffByUsername).toHaveBeenCalledWith('receptionist1');
      expect(session).toEqual({
        userId: 'staff-uuid-1',
        role: 'Receptionist',
        employeeId: 5,
        branchId: 1,
      });
    });

    it('authenticates Admin staff where branch_id is null', async () => {
      vi.mocked(userRepository.findStaffByUsername).mockResolvedValueOnce({
        ...mockStaffUser,
        role: 'Admin' as const,
        branch_id: null,
      });
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const session = await authService.loginStaff({
        username: 'adminuser',
        password: 'AdminPassword123!',
      });

      expect(session).toEqual({
        userId: 'staff-uuid-1',
        role: 'Admin',
        employeeId: 5,
        branchId: undefined,
      });
    });

    it('throws INVALID_CREDENTIALS when staff username is not found', async () => {
      vi.mocked(userRepository.findStaffByUsername).mockResolvedValueOnce(null);

      const err = await authService
        .loginStaff({ username: 'unknown', password: 'Password123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('INVALID_CREDENTIALS');
    });

    it('throws INVALID_CREDENTIALS when staff password is incorrect', async () => {
      vi.mocked(userRepository.findStaffByUsername).mockResolvedValueOnce(mockStaffUser);
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const err = await authService
        .loginStaff({ username: 'receptionist1', password: 'WrongPassword!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('INVALID_CREDENTIALS');
    });

    it('throws INVALID_CREDENTIALS if a Guest user attempts staff login', async () => {
      vi.mocked(userRepository.findStaffByUsername).mockResolvedValueOnce({
        ...mockStaffUser,
        role: 'Guest' as const,
      });
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const err = await authService
        .loginStaff({ username: 'receptionist1', password: 'Password123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('INVALID_CREDENTIALS');
    });

    it('throws ACCOUNT_INACTIVE when staff account status is Inactive', async () => {
      vi.mocked(userRepository.findStaffByUsername).mockResolvedValueOnce({
        ...mockStaffUser,
        status: 'Inactive' as const,
      });
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const err = await authService
        .loginStaff({ username: 'receptionist1', password: 'Password123!' })
        .catch((e) => e);

      expect(err).toBeInstanceOf(AuthServiceError);
      expect(err.code).toBe('ACCOUNT_INACTIVE');
    });
  });
});
