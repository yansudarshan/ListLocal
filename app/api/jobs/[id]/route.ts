import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const job = db.prepare(`
      SELECT id, type, payload_json as payloadJson, status, progress, error, created_at as createdAt, updated_at as updatedAt
      FROM jobs 
      WHERE id = ?
    `).get(id) as any;

    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    let payload: any = null;
    try {
      payload = JSON.parse(job.payloadJson || '{}');
    } catch {}

    return NextResponse.json({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      error: job.error,
      itemCount: payload?.items?.length || 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve job status.' }, { status: 500 });
  }
}
