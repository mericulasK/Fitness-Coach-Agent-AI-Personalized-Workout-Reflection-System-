"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFitnessStore } from '@/store/useFitnessStore';
import { Loader2 } from 'lucide-react';

export default function ProfileGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, profileFetched, fetchProfile, fetchPlan, isOnboardingProcessing } = useFitnessStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
    fetchPlan();
  }, [fetchProfile, fetchPlan]);

  // SSR Hydration safety
  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Show a root spinner while fetching the profile initially
  if (!profileFetched) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm font-medium">Profil bilgileri doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  const hasProfile = !!profile;

  // Routing checks
  if (!hasProfile && pathname !== '/') {
    // No profile, trying to access a restricted page -> redirect to onboarding
    router.replace('/');
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm font-medium">Kurulum sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  if (hasProfile && pathname === '/' && !isOnboardingProcessing) {
    // Already has profile, trying to access onboarding -> redirect to dashboard
    router.replace('/dashboard');
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm font-medium">Panele yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}
