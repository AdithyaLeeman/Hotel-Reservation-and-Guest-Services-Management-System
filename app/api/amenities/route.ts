import { NextResponse } from 'next/server';
import { amenityRepository } from '@/repositories/amenity.repository';

export async function GET() {
  try {
    const amenities = await amenityRepository.listAmenities();
    return NextResponse.json({
      data: amenities,
      meta: { requestId: crypto.randomUUID() },
    });
  } catch (err) {
    console.error('[GET /api/amenities] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch amenities' } },
      { status: 500 }
    );
  }
}
