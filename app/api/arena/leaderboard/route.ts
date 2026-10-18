import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface ModelStats {
  model: string;
  wins: number;
  totalMatches: number;
  winRate: number;
  avgLatencyMs: number;
  avgTps: number;
}

export async function GET() {
  try {
    const rows = db.prepare(`
      SELECT model_a, model_b, winner, latency_a_ms, latency_b_ms, tps_a, tps_b, created_at
      FROM arena_results
      ORDER BY created_at DESC
    `).all() as Array<{
      model_a: string;
      model_b: string;
      winner: string;
      latency_a_ms: number;
      latency_b_ms: number;
      tps_a: number;
      tps_b: number;
      created_at: string;
    }>;

    const statsMap: Map<string, { wins: number; matches: number; totalLatency: number; totalTps: number }> = new Map();

    const getOrInit = (model: string) => {
      if (!statsMap.has(model)) {
        statsMap.set(model, { wins: 0, matches: 0, totalLatency: 0, totalTps: 0 });
      }
      return statsMap.get(model)!;
    };

    for (const r of rows) {
      const statsA = getOrInit(r.model_a);
      statsA.matches++;
      statsA.totalLatency += r.latency_a_ms || 0;
      statsA.totalTps += r.tps_a || 0;
      if (r.winner === r.model_a) statsA.wins++;

      const statsB = getOrInit(r.model_b);
      statsB.matches++;
      statsB.totalLatency += r.latency_b_ms || 0;
      statsB.totalTps += r.tps_b || 0;
      if (r.winner === r.model_b) statsB.wins++;
    }

    const leaderboard: ModelStats[] = Array.from(statsMap.entries()).map(([model, data]) => ({
      model,
      wins: data.wins,
      totalMatches: data.matches,
      winRate: data.matches > 0 ? Math.round((data.wins / data.matches) * 100) : 0,
      avgLatencyMs: data.matches > 0 ? Math.round(data.totalLatency / data.matches) : 0,
      avgTps: data.matches > 0 ? Math.round((data.totalTps / data.matches) * 10) / 10 : 0,
    })).sort((a, b) => b.winRate - a.winRate);

    return NextResponse.json({
      totalBattles: rows.length,
      leaderboard,
      recentBattles: rows.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to compute leaderboard.' }, { status: 500 });
  }
}
