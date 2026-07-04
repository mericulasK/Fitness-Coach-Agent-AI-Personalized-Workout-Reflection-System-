import { NextResponse } from 'next/server';
import { getActiveWorkoutPlan } from '@/lib/agent/memory';

export async function GET() {
  try {
    const plan = getActiveWorkoutPlan('default_user');
    return NextResponse.json({ success: true, plan });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
