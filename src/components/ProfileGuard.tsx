"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFitnessStore } from '@/store/useFitnessStore';
import { Loader2 } from 'lucide-react';

export default function ProfileGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, profileFetched, fetchProfile, fetchPlan, isOnboardingProcessing } = useFitnessStore();

  useEffect(() => {
    fetchProfile();
    fetchPlan();
  }, [fetchProfile, fetchPlan]);

  const hasProfile = !!profile;

  // Handle redirects in useEffect to prevent React render-phase state update warnings
  useEffect(() => {
    if (!profileFetched) return;

    if (!hasProfile && pathname !== '/') {
      router.replace('/');
    } else if (hasProfile && pathname === '/' && !isOnboardingProcessing) {
      router.replace('/dashboard');
    }
  }, [profileFetched, hasProfile, pathname, isOnboardingProcessing, router]);

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

  // If redirect is needed, show the spinner while the router transitions
  if (!hasProfile && pathname !== '/') {
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
