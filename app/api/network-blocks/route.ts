import { NextRequest, NextResponse } from 'next/server';
import { getBlockedCount, getBlockedLogs, recordBlockedAttempt, safeFetch } from '@/lib/safeFetch';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = getBlockedCount();
    const logs = getBlockedLogs(20);
    return NextResponse.json({
      count,
      logs,
      isolationMode: '100% Localhost / Host Only',
      proof: 'All outbound traffic to external domains is strictly prohibited and captured by safeFetch.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve network isolation stats.' }, { status: 500 });
  }
}

// Endpoint to simulate an outbound probe for user manual verification / airplane mode testing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetUrl = body.url || 'https://api.openai.com/v1/models';

    try {
      await safeFetch(targetUrl);
      return NextResponse.json({
        success: true,
        message: 'Request unexpectedly passed. Check host whitelist.',
      });
    } catch (blockErr: any) {
      return NextResponse.json({
        blocked: true,
        message: blockErr.message,
        currentBlockedCount: getBlockedCount(),
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
