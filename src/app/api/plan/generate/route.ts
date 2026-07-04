import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/agent/memory';
import { orchestrateWeeklyPlanGeneration } from '@/lib/agent/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const force = !!body.force;
    
    const profile = getUserProfile('default_user');
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profil bulunamadı. Lütfen önce onboarding tamamlayın.' }, { status: 400 });
    }

    const result = await orchestrateWeeklyPlanGeneration(profile, force);
    
    if (!result.success) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      plan: result.plan,
      trace: result.trace,
      warnings: result.warnings
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
