import { NextRequest, NextResponse } from 'next/server';
import { batchWorker } from '@/lib/worker';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one product item with images is required for batch processing.' },
        { status: 400 }
      );
    }

    const jobId = batchWorker.enqueueJob(items);

    return NextResponse.json({
      success: true,
      jobId,
      queuedItems: items.length,
      message: `Enqueued batch job for ${items.length} items. Worker processing sequentially.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit batch job.' }, { status: 500 });
  }
}
