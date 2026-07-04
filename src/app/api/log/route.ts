import { NextResponse } from 'next/server';
import { logExerciseCompletion, getActiveWorkoutPlan } from '@/lib/agent/memory';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { exerciseId, actualSets, actualReps, actualWeight, rpe, notes } = body;

    if (!exerciseId || !actualSets || !actualReps || !actualWeight || !rpe) {
      return NextResponse.json({ success: false, error: 'Eksik parametre.' }, { status: 400 });
    }

    logExerciseCompletion({
      exerciseId,
      actualSets,
      actualReps,
      actualWeight,
      rpe,
      notes
    });

    const activePlan = getActiveWorkoutPlan('default_user');

    return NextResponse.json({
      success: true,
      message: 'Egzersiz başarıyla kaydedildi.',
      plan: activePlan
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
