import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { translateListing } from '@/lib/ollama';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { title, description, tags = [], targetLanguage = 'Hindi', listingId } = body;

    if (listingId && (!title || !description)) {
      const listing = db.prepare('SELECT title, description, tags_json FROM listings WHERE id = ?').get(listingId) as
        | { title: string; description: string; tags_json: string }
        | undefined;

      if (!listing) {
        return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
      }

      title = listing.title;
      description = listing.description;
      tags = JSON.parse(listing.tags_json || '[]');
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required for translation.' },
        { status: 400 }
      );
    }

    // Load active glossary terms for target language
    const glossaryRows = db
      .prepare('SELECT term, translation FROM glossary WHERE language = ?')
      .all(targetLanguage) as Array<{ term: string; translation: string }>;

    // Perform translation
    const result = await translateListing({
      title,
      description,
      tags,
      targetLanguage: targetLanguage as 'Hindi' | 'Kannada',
      glossaryTerms: glossaryRows,
    });

    // Run post-check to verify protected terms appear in output
    const combinedOutput = `${result.translated_title} ${result.translated_description} ${result.translated_tags.join(' ')}`;
    const missingProtectedTerms: string[] = [];

    for (const g of glossaryRows) {
      // Check if original term or specified translation is present in the output
      const termPresent =
        combinedOutput.toLowerCase().includes(g.term.toLowerCase()) ||
        combinedOutput.includes(g.translation);

      if (!termPresent) {
        missingProtectedTerms.push(`"${g.term}" (expected translation: "${g.translation}")`);
      }
    }

    const warning =
      missingProtectedTerms.length > 0
        ? `Protected glossary warning: The following protected term(s) may have been altered by the translation model: ${missingProtectedTerms.join(
            ', '
          )}. Please review carefully.`
        : undefined;

    return NextResponse.json({
      success: true,
      originalLanguage: 'English',
      targetLanguage,
      result,
      warning,
      glossaryTermsApplied: glossaryRows.length,
    });
  } catch (err: any) {
    console.error('Translation error:', err);
    return NextResponse.json(
      { error: err.message || 'Translation failed. Please ensure Ollama is accessible.' },
      { status: 500 }
    );
  }
}
