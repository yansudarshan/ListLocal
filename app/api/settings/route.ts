import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    rows.forEach((r) => {
      settings[r.key] = r.value;
    });
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve settings. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const updateTx = db.transaction((entries: [string, any][]) => {
      for (const [key, value] of entries) {
        upsertStmt.run(key, String(value));
      }
    });

    updateTx(Object.entries(body));

    return NextResponse.json({ success: true, updated: Object.keys(body).length });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to save settings. Please verify inputs and try again.' },
      { status: 500 }
    );
  }
}
