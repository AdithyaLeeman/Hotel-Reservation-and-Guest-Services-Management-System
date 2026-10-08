import { NextResponse } from 'next/server';
import { roomRepository } from '@/repositories/room.repository';

export async function GET(): Promise<NextResponse> {
  try {
    const roomTypes = await roomRepository.listRoomTypes();
    return NextResponse.json(
      {
        data: roomTypes,
        meta: { requestId: crypto.randomUUID() },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/room-types]', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching room types.',
        },
      },
      { status: 500 }
    );
  }
}
