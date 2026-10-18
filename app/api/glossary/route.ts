import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language');

    let query = 'SELECT id, term, translation, language FROM glossary';
    const params: string[] = [];

    if (language) {
      query += ' WHERE language = ?';
      params.push(language);
    }
    query += ' ORDER BY term ASC';

    const terms = db.prepare(query).all(...params);
    return NextResponse.json({ terms });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve glossary terms.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { term, translation, language = 'Hindi' } = body;

    if (!term || !translation) {
      return NextResponse.json({ error: 'Both term and translation are required.' }, { status: 400 });
    }

    const id = body.id || crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO glossary (id, term, translation, language)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        term = excluded.term,
        translation = excluded.translation,
        language = excluded.language
    `);

    stmt.run(id, term.trim(), translation.trim(), language.trim());

    return NextResponse.json({ success: true, id, term, translation, language });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save glossary term.' }, { status: 500 });
  }
}
