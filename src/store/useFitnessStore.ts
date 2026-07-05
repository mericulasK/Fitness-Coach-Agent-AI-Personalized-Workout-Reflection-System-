import { create } from 'zustand';
import { NormalizedProfile, RawProfileInput } from '@/lib/agent/perception';
import { DbWorkoutPlan, ChatMsg } from '@/lib/agent/memory';
import { DeveloperTraceStep } from '@/lib/agent/orchestrator';

interface FitnessState {
  profile: NormalizedProfile | null;
  plan: DbWorkoutPlan | null;
  chatHistory: ChatMsg[];
  developerTrace: DeveloperTraceStep[];
  warnings: string[];
  weightUnit: 'kg' | 'lb';
  heightUnit: 'cm' | 'inch';
  isDarkTheme: boolean;
  
  // Ollama status
  ollamaOnline: boolean;
  ollamaModels: string[];
  selectedOllamaModel: string;
  
  // UI States — separate flags to avoid race conditions
  loading: boolean;
  error: string | null;
  profileFetched: boolean;
  planFetched: boolean;
  isOnboardingProcessing: boolean;
  
  // Setters & Actions
  setUnits: (weight: 'kg' | 'lb', height: 'cm' | 'inch') => void;
  toggleTheme: () => void;
  setSelectedOllamaModel: (model: string) => void;
  clearError: () => void;
  setIsOnboardingProcessing: (val: boolean) => void;
  
  fetchProfile: () => Promise<void>;
  saveProfile: (profileData: RawProfileInput) => Promise<boolean>;
  fetchPlan: () => Promise<void>;
  generatePlan: (force?: boolean) => Promise<boolean>;
  logExercise: (logData: {
    exerciseId: string;
    actualSets: number[];
    actualReps: number[];
    actualWeight: number[];
    rpe: number[];
    notes?: string;
  }) => Promise<boolean>;
  fetchChatHistory: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  checkOllamaStatus: () => Promise<void>;
  
  // Export/Import backup
  exportBackup: () => string;
  importBackup: (backupStr: string) => Promise<boolean>;
}

export const useFitnessStore = create<FitnessState>((set, get) => ({
  profile: null,
  plan: null,
  chatHistory: [],
  developerTrace: [],
  warnings: [],
  weightUnit: 'kg',
  heightUnit: 'cm',
  isDarkTheme: true,
  
  ollamaOnline: false,
  ollamaModels: [],
  selectedOllamaModel: '',
  
  loading: false,
  error: null,
  profileFetched: false,
  planFetched: false,
  isOnboardingProcessing: false,

  setUnits: (weight, height) => set({ weightUnit: weight, heightUnit: height }),
  toggleTheme: () => set((state) => ({ isDarkTheme: !state.isDarkTheme })),
  setSelectedOllamaModel: (model) => set({ selectedOllamaModel: model }),
  clearError: () => set({ error: null }),
  setIsOnboardingProcessing: (val) => set({ isOnboardingProcessing: val }),

  fetchProfile: async () => {
    if (get().profileFetched) return;
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success) {
        set({ profile: data.profile, profileFetched: true });
      } else {
        set({ profileFetched: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Profil yüklenemedi:', msg);
      set({ profileFetched: true });
    }
  },

  saveProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        set({ 
          profile: data.profile,
          plan: data.plan,
          developerTrace: data.trace || [],
          warnings: data.warnings || [],
          profileFetched: true,
          planFetched: true,
          loading: false
        });
        return true;
      } else {
        set({ error: data.errors?.join(', ') || 'Profil kaydedilemedi.', loading: false });
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: 'Profil kaydedilirken hata oluştu: ' + msg, loading: false });
      return false;
    }
  },

  fetchPlan: async () => {
    if (get().planFetched) return;
    try {
      const res = await fetch('/api/plan/today');
      const data = await res.json();
      if (data.success) {
        set({ plan: data.plan, planFetched: true });
      } else {
        set({ planFetched: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Plan yüklenemedi:', msg);
      set({ planFetched: true });
    }
  },

  generatePlan: async (force = false) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      const data = await res.json();
      if (data.success) {
        set({ 
          plan: data.plan,
          developerTrace: data.trace || [],
          warnings: data.warnings || [],
          planFetched: true,
          loading: false
        });
        return true;
      } else {
        set({ error: data.error || 'Plan oluşturulamadı.', loading: false });
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: 'Plan oluşturulurken hata oluştu: ' + msg, loading: false });
      return false;
    }
  },

  logExercise: async (logData) => {
    set({ error: null });
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const data = await res.json();
      if (data.success) {
        set({ plan: data.plan, planFetched: true });
        return true;
      } else {
        set({ error: data.error || 'Antrenman kaydedilemedi.' });
        return false;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: 'Antrenman kaydedilirken hata oluştu: ' + msg });
      return false;
    }
  },

  fetchChatHistory: async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      if (data.success) {
        set({ chatHistory: data.history || [] });
      }
    } catch (err) {
      console.error('Sohbet geçmişi yüklenemedi:', err);
    }
  },

  sendMessage: async (message) => {
    const tempUserMsg: ChatMsg = { role: 'user', content: message };
    set((state) => ({ 
      chatHistory: [...state.chatHistory, tempUserMsg] 
    }));

    try {
      const { selectedOllamaModel, ollamaOnline } = get();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          ollamaModel: ollamaOnline ? selectedOllamaModel : undefined 
        })
      });
      const data = await res.json();
      if (data.success) {
        set({ chatHistory: data.history || [] });
      }
    } catch (err) {
      console.error('Mesaj gönderilemedi:', err);
    }
  },

  checkOllamaStatus: async () => {
    try {
      const res = await fetch('/api/ollama/status');
      const data = await res.json();
      if (data.success) {
        set({ 
          ollamaOnline: data.online,
          ollamaModels: data.models || [],
          selectedOllamaModel: data.online && data.models?.length > 0 && !get().selectedOllamaModel
            ? data.models[0] 
            : get().selectedOllamaModel
        });
      }
    } catch {
      set({ ollamaOnline: false, ollamaModels: [] });
    }
  },

  exportBackup: () => {
    const backupObj = {
      profile: get().profile,
      plan: get().plan,
      weightUnit: get().weightUnit,
      heightUnit: get().heightUnit,
      isDarkTheme: get().isDarkTheme,
      chatHistory: get().chatHistory,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(backupObj);
  },

  importBackup: async (backupStr) => {
    try {
      const backup = JSON.parse(backupStr);
      if (!backup.profile) return false;

      // Update state
      set({
        profile: backup.profile,
        plan: backup.plan,
        weightUnit: backup.weightUnit || 'kg',
        heightUnit: backup.heightUnit || 'cm',
        isDarkTheme: backup.isDarkTheme !== undefined ? backup.isDarkTheme : true,
        chatHistory: backup.chatHistory || [],
        profileFetched: true,
        planFetched: true
      });

      // Commit profile and plan to local database via API
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup.profile)
      });

      if (backup.plan) {
        await fetch('/api/plan/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
      }

      return true;
    } catch (_err) {
      console.error('Yedek yükleme hatası:', _err);
      return false;
    }
  }
}));
