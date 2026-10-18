import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { StyleProfile } from '@/lib/schemas/voice';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profileRow = db.prepare('SELECT json FROM style_profile WHERE id = ?').get('active_profile') as
      | { json: string }
      | undefined;

    let profile: StyleProfile | null = null;
    if (profileRow) {
      try {
        profile = JSON.parse(profileRow.json) as StyleProfile;
      } catch {
        profile = null;
      }
    }

    const pastListings = db
      .prepare('SELECT id, text, created_at FROM past_listings ORDER BY created_at DESC LIMIT 30')
      .all() as Array<{ id: string; text: string; created_at: string }>;

    return NextResponse.json({
      profile,
      pastListings,
      hasProfile: profile !== null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve voice profile.' },
      { status: 500 }
    );
  }
}
