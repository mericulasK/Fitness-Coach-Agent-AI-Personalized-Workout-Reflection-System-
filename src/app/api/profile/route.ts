import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/agent/memory';
import { orchestrateWeeklyPlanGeneration } from '@/lib/agent/orchestrator';

export async function GET() {
  try {
    const profile = getUserProfile('default_user');
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Run orchestrator with the new profile. This will validate input,
    // save profile, and generate initial plan if none exists.
    const result = await orchestrateWeeklyPlanGeneration(body, false);
    
    if (!result.success) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      profile: getUserProfile(body.id || 'default_user'),
      plan: result.plan,
      trace: result.trace,
      warnings: result.warnings
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
