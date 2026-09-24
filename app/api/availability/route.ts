import { NextRequest, NextResponse } from 'next/server';
import { availabilityService, AvailabilityValidationError } from '@/services/availability.service';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const branchIdStr = searchParams.get('branchId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    // Basic required fields check
    if (!branchIdStr || !checkIn || !checkOut) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Missing required query parameters: branchId, checkIn, checkOut',
          },
        },
        { status: 400 }
      );
    }

    const branchId = parseInt(branchIdStr, 10);

    // Delegate to service orchestration
    // Note: service performs deep validation (dates, past dates, min nights)
    const result = await availabilityService.searchAvailable({
      branchId,
      checkIn,
      checkOut,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof AvailabilityValidationError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            fields: error.fields,
          },
        },
        { status: 400 }
      );
    }

    console.error('Unhandled error in GET /api/availability:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while searching for availability',
        },
      },
      { status: 500 }
    );
  }
}
