"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFitnessStore } from '@/store/useFitnessStore';
import { LayoutDashboard, LineChart, MessageSquare, Settings, Flame, BrainCircuit } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { profile, ollamaOnline, checkOllamaStatus, fetchProfile, fetchPlan } = useFitnessStore();

  useEffect(() => {
    // Initial fetch
    fetchProfile();
    fetchPlan();
    checkOllamaStatus();

    // Check Ollama every 10 seconds
    const interval = setInterval(() => {
      checkOllamaStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchProfile, fetchPlan, checkOllamaStatus]);

  // Calculate workout streak based on logs count/streak (can be fetched from profile/history)
  // Let's assume a streak state or compute from last logs
  const streak = profile ? 2 : 0; // default indicator, can be populated dynamically

  // Don't show navbar if we are in onboarding wizard
  if (!profile) return null;

  const links = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/progress', label: 'İlerleme', icon: LineChart },
    { href: '/coach', label: 'AI Koç', icon: MessageSquare },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-black/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <BrainCircuit className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Fitness Agent
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/25">
              CAPSTONE
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-emerald-400 ${
                    isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Status / Info */}
          <div className="flex items-center gap-4">
            {/* Streak Badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500 border border-orange-500/20">
              <Flame className="h-4 w-4 fill-orange-500" />
              <span>{streak} Gün Seri</span>
            </div>

            {/* Ollama Status Badge */}
            <div 
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                ollamaOnline 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'
              }`}
              title={ollamaOnline ? 'Yerel LLM (Ollama) Bağlı' : 'Yerel LLM Çevrimdışı (Şablon Fallback Aktif)'}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${ollamaOnline ? 'bg-emerald-500 animate-ping' : 'bg-zinc-600'}`} />
              <span className="hidden sm:inline">{ollamaOnline ? 'Ollama Aktif' : 'Ollama Çevrimdışı'}</span>
              <span className="sm:hidden">{ollamaOnline ? 'Ollama' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Links */}
        <div className="flex md:hidden h-12 items-center justify-around border-t border-white/5 py-2">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center text-[10px] transition-colors hover:text-emerald-400 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
