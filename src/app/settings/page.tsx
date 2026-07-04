"use client";

import React, { useState, useEffect } from 'react';
import { useFitnessStore } from '@/store/useFitnessStore';
import { 
  Settings, Database, BrainCircuit, ShieldAlert, 
  Download, Upload, Moon, Sun, CheckCircle2, RefreshCw 
} from 'lucide-react';

export default function SettingsPage() {
  const {
    weightUnit,
    heightUnit,
    isDarkTheme,
    ollamaOnline,
    ollamaModels,
    selectedOllamaModel,
    setUnits,
    toggleTheme,
    setSelectedOllamaModel,
    checkOllamaStatus,
    exportBackup,
    importBackup
  } = useFitnessStore();

  const [importStr, setImportStr] = useState('');
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkOllamaStatus();
  }, [checkOllamaStatus]);

  const handleRefreshOllama = async () => {
    setRefreshing(true);
    await checkOllamaStatus();
    setRefreshing(false);
  };

  const handleExport = () => {
    const dataStr = exportBackup();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'fitness_coach_agent_backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importStr) return;

    const success = await importBackup(importStr);
    setImportSuccess(success);
    if (success) {
      setImportStr('');
      // Refresh page to load everything clean
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-emerald-400" />
          Uygulama Ayarları
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Yerel LLM bağlantısı, birim ayarları ve veri yedekleme ayarlarınızı buradan yönetebilirsiniz.
        </p>
      </div>

      {/* Unit Settings Card */}
      <div className="p-6 rounded-2xl glass-card space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Moon className="h-4 w-4 text-emerald-400" />
          Birim ve Tema Tercihleri
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-zinc-500 font-semibold uppercase mb-1.5">Ağırlık Birimi</label>
            <div className="flex gap-2">
              {['kg', 'lb'].map(unit => (
                <button
                  key={unit}
                  onClick={() => setUnits(unit as 'kg' | 'lb', heightUnit)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    weightUnit === unit
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-white/5 text-zinc-400'
                  }`}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-500 font-semibold uppercase mb-1.5 font-mono">Boy Birimi</label>
            <div className="flex gap-2">
              {['cm', 'inch'].map(unit => (
                <button
                  key={unit}
                  onClick={() => setUnits(weightUnit, unit as 'cm' | 'inch')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    heightUnit === unit
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900 border-white/5 text-zinc-400'
                  }`}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-200">Görünüm Teması</span>
            <span className="text-[10px] text-zinc-500">Karanlık ve aydınlık arayüz seçimi.</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            {isDarkTheme ? (
              <span className="flex items-center gap-1.5 text-xs">
                <Moon className="h-4 w-4 text-emerald-400" /> Koyu Mod
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs">
                <Sun className="h-4 w-4 text-yellow-400" /> Aydınlık Mod
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ollama Connection Settings Card */}
      <div className="p-6 rounded-2xl glass-card space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-emerald-400" />
              Yerel LLM Entegrasyonu (Ollama)
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Yerel bilgisayarınızda çalışan Ollama sunucusuyla (port: 3000) bağlantıyı yönetin.
            </p>
          </div>

          <button 
            onClick={handleRefreshOllama}
            disabled={refreshing}
            className="p-1.5 rounded bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          ollamaOnline 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-zinc-900 border-white/5 text-zinc-400'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${ollamaOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
            <div>
              <span className="font-semibold block text-white">Bağlantı Durumu</span>
              <span className="text-[10px] text-zinc-500">
                {ollamaOnline ? 'Bağlantı Başarılı' : 'Sunucu Çevrimdışı (Şablon Motoru devrede)'}
              </span>
            </div>
          </div>
        </div>

        {ollamaOnline && (
          <div>
            <label className="block text-[11px] text-zinc-500 font-semibold uppercase mb-1.5">
              Aktif Doğal Dil Üretim Modeli (LLM)
            </label>
            {ollamaModels.length > 0 ? (
              <select
                value={selectedOllamaModel}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 text-xs text-white rounded-lg p-2.5 outline-none focus:border-emerald-500"
              >
                {ollamaModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-lg bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 italic">
                Ollama sunucusunda yüklü model bulunamadı. Lütfen terminalden &apos;ollama run llama3&apos; çalıştırarak bir model indirin.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Database Backup & Recovery Card */}
      <div className="p-6 rounded-2xl glass-card space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-400" />
          Veri Yedekleme ve Kurtarma
        </h2>
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Tüm verileriniz yerel SQLite üzerinde saklanır. Tarayıcı veya bilgisayar değiştirdiğinizde verilerinizi kaybetmemek için JSON formatında yedek alabilirsiniz.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Yedek Dosyasını İndir
          </button>
        </div>

        {/* Restore Section */}
        <form onSubmit={handleImport} className="pt-4 border-t border-white/5 space-y-3">
          <div>
            <label className="block text-[11px] text-zinc-500 font-semibold uppercase mb-1.5">Yedek Metnini Yapıştır (JSON)</label>
            <textarea
              required
              rows={3}
              value={importStr}
              onChange={(e) => setImportStr(e.target.value)}
              placeholder='{"profile": ... , "plan": ... } şeklinde yedeğinizi buraya yapıştırın.'
              className="w-full bg-zinc-950 border border-white/5 rounded-lg text-[10px] font-mono p-3 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-between items-center">
            {importSuccess === true && (
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Yedek başarıyla yüklendi! Sayfa yenileniyor...
              </span>
            )}
            {importSuccess === false && (
              <span className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                Geçersiz yedek verisi. Lütfen JSON formatını kontrol edin.
              </span>
            )}
            {importSuccess === null && <span />}

            <button
              type="submit"
              className="flex items-center gap-1.5 py-1.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer ml-auto"
            >
              <Upload className="h-3.5 w-3.5" />
              Yedek Yükle
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
