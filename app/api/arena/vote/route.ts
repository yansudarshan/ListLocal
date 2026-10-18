import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelA, modelB, winner, latencyAMs = 0, latencyBMs = 0, tpsA = 0, tpsB = 0 } = body;

    if (!modelA || !modelB || !winner) {
      return NextResponse.json({ error: 'modelA, modelB, and winner are required.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO arena_results (id, model_a, model_b, winner, latency_a_ms, latency_b_ms, tps_a, tps_b, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, modelA, modelB, winner, Number(latencyAMs), Number(latencyBMs), Number(tpsA), Number(tpsB), createdAt);

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record arena vote.' }, { status: 500 });
  }
}
