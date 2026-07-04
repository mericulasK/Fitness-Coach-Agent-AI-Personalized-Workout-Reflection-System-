"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFitnessStore } from '@/store/useFitnessStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, BrainCircuit, User, Bot, Sparkles, Loader2, 
  HelpCircle, Dumbbell, AlertTriangle, ArrowDownCircle
} from 'lucide-react';

export default function CoachChatPage() {
  const { 
    chatHistory, sendMessage, fetchChatHistory, 
    ollamaOnline, selectedOllamaModel, loading 
  } = useFitnessStore();

  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMsg;
    if (!textToSend.trim()) return;

    setInputMsg('');
    setIsTyping(true);

    // Send to Zustand store (which does the API POST)
    await sendMessage(textToSend);

    setIsTyping(false);
  };

  const suggestionChips = [
    { text: 'Neden bu egzersizleri seçtin?', label: 'Seçim Nedeni' },
    { text: 'Programımı nasıl zorlaştırırım?', label: 'Zorluğu Artırma' },
    { text: 'Bugün ne yapmalıyım?', label: 'Günün Hedefi' }
  ];

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full h-[80vh] pb-6">
      
      {/* Top AI Status Indicator */}
      <div className="flex justify-between items-center p-4 rounded-xl bg-zinc-900 border border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <BrainCircuit className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white">Yapay Zeka Fitness Koçu</h1>
            <span className="text-[10px] text-zinc-500">
              {ollamaOnline 
                ? `Bağlı: Ollama (${selectedOllamaModel})` 
                : 'Şablon Eşleştirme Motoru Aktif'}
            </span>
          </div>
        </div>

        {/* Small Engine Tag Badge */}
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
          ollamaOnline 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 animate-pulse' 
            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
        }`}>
          {ollamaOnline ? 'Yerel LLM' : 'Kural Tabanlı'}
        </span>
      </div>

      {/* Chat Messages Panel */}
      <div className="flex-1 glass-card rounded-2xl p-4 md:p-6 flex flex-col justify-between overflow-hidden">
        
        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <Bot className="h-12 w-12 text-emerald-500/20 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300">Antrenörünüzle Sohbet Edin</h3>
              <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
                Antrenmanlarınızın seçilme nedenlerini öğrenebilir, yüklemeleri nasıl optimize edeceğinizi sorabilirsiniz.
              </p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Bubble Avatar */}
                  <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border ${
                    isUser 
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  {/* Message Bubble Text */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-zinc-900 border border-white/5 text-zinc-200 rounded-tr-none' 
                      : 'bg-emerald-500/5 border border-emerald-500/10 text-zinc-200 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center">
              <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px]">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl rounded-tl-none flex items-center gap-1.5 py-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
          {chatHistory.length < 5 && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, chip.text)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-full text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Field */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              required
              disabled={isTyping}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Fitness hedefleriniz, program detaylarınız hakkında koçunuzla yazışın..."
              className="flex-1 px-4 py-2.5 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isTyping || !inputMsg.trim()}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
