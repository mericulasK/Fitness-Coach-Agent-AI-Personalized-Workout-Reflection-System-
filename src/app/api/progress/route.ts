import { NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { getProgressSnapshots, saveProgressSnapshot } from '@/lib/agent/memory';

export async function GET() {
  try {
    const userId = 'default_user';
    const weightHistory = getProgressSnapshots(userId);

    // Fetch volume history per day
    const volumeRows = db.prepare(`
      SELECT DATE(wl.completedAt) as date, wl.actualReps, wl.actualWeight
      FROM WorkoutLog wl
      JOIN Exercise e ON wl.exerciseId = e.id
      JOIN WorkoutDay wd ON e.dayId = wd.id
      JOIN WorkoutPlan wp ON wd.planId = wp.id
      WHERE wp.userId = ?
      ORDER BY date ASC
    `).all(userId) as any[];

    // Aggregate volume (sum of reps * weight for all sets) by date
    const volumeMap: Record<string, number> = {};
    volumeRows.forEach(row => {
      try {
        const reps = JSON.parse(row.actualReps) as number[];
        const weights = JSON.parse(row.actualWeight) as number[];
        let total = 0;
        for (let i = 0; i < reps.length; i++) {
          total += (reps[i] || 0) * (weights[i] || 0);
        }
        volumeMap[row.date] = (volumeMap[row.date] || 0) + total;
      } catch (e) {
        // Skip
      }
    });

    const volumeHistory = Object.keys(volumeMap).map(date => ({
      date,
      volume: volumeMap[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      weightHistory,
      volumeHistory
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { weightKg, bodyMeasurements } = body;

    if (!weightKg) {
      return NextResponse.json({ success: false, error: 'Kilo değeri zorunludur.' }, { status: 400 });
    }

    saveProgressSnapshot('default_user', parseFloat(weightKg), bodyMeasurements);

    return NextResponse.json({ success: true, message: 'İlerleme kaydı eklendi.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
