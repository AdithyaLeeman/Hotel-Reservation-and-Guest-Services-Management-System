import { NextResponse } from 'next/server';
import { branchRepository } from '@/repositories/branch.repository';

export async function GET() {
  try {
    const branches = await branchRepository.listBranches();
    return NextResponse.json({
      data: branches,
      meta: { requestId: crypto.randomUUID() },
    });
  } catch (err) {
    console.error('[GET /api/branches] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch branches' } },
      { status: 500 }
    );
  }
}
