import { NextResponse } from 'next/server';
import { saveChatMessage, getChatHistory, getUserProfile, getActiveWorkoutPlan } from '@/lib/agent/memory';
import { generateMotivationalMessage } from '@/lib/agent/tools';
import { getHistoricalContext } from '@/lib/agent/perception';

export async function GET() {
  try {
    const history = getChatHistory('default_user');
    return NextResponse.json({ success: true, history });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, ollamaModel } = body;
    const userId = 'default_user';

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mesaj boş olamaz.' }, { status: 400 });
    }

    // Save user message to memory
    saveChatMessage(userId, 'user', message);

    const profile = getUserProfile(userId);
    const activePlan = getActiveWorkoutPlan(userId);
    const historyContext = getHistoricalContext(userId);

    let assistantResponse = '';

    // If Ollama model is specified, try generating response via Ollama
    if (ollamaModel) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for chat response

        const systemPrompt = `Sen kullanıcının kişisel fitness koçusun (Fitness Coach Agent). Adın Fitness Agent. 
        Kullanıcı profili: Yaş: ${profile?.age}, Boy: ${profile?.heightCm}cm, Kilo: ${profile?.weightKg}kg, Hedef: ${profile?.goal}, Tecrübe: ${profile?.experienceLevel}, Sakatlıklar: ${profile?.injuries?.join(', ')}.
        Aktif antrenman programı haftalık ${profile?.daysPerWeek} gün. Bugünün antrenman odağı: ${activePlan?.days?.find(d => d.status === 'pending')?.focus || 'Dinlenme Günü'}.
        Yanıtlarını Türkçe dilinde, motive edici, samimi ve profesyonel bir koç gibi ver. Kısa tut (maksimum 3-4 cümle).`;

        const prompt = `Kullanıcı: ${message}`;

        const res = await fetch('http://localhost:3000/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: `${systemPrompt}\n\n${prompt}`,
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          assistantResponse = data.response.trim();
        }
      } catch {
        console.log('Ollama chat response failed or timed out, falling back to rule-based engine.');
      }
    }

    // Rule-based fallback if Ollama didn't return a response
    if (!assistantResponse) {
      const lowerMsg = message.toLowerCase();
      
      if (lowerMsg.includes('neden seçtin') || lowerMsg.includes('neden bu') || lowerMsg.includes('neden egzersiz')) {
        assistantResponse = `Egzersizleri tamamen senin profilini inceleyerek seçtim. Ekipman durumun (${profile?.equipment.join(', ')}), tecrüben (${profile?.experienceLevel}) ve en önemlisi varsa sakatlıklarını (${profile?.injuries.join(', ') || 'Yok'}) göz önünde bulundurarak eklemlerini zorlamayacak en etkili hareketleri planladım.`;
      } 
      else if (lowerMsg.includes('zorlaştır') || lowerMsg.includes('ağırlaştır') || lowerMsg.includes('daha zor') || lowerMsg.includes('kolay')) {
        assistantResponse = `Antrenmanlarını zorlaştırmak için set bitimlerinde girdiğin RPE (Zorluk Algısı) değerlerini düşük (örneğin 5-6) bildirebilirsin. Yansıtma Döngüm (Reflection Loop) bunu algılayıp bir sonraki hafta ağırlıklarını %2.5 ile %5 oranında otomatik olarak artıracaktır! 😉`;
      } 
      else if (lowerMsg.includes('ne yapmalıyım') || lowerMsg.includes('bugün') || lowerMsg.includes('antrenman')) {
        const nextDay = activePlan?.days?.find(d => d.status === 'pending');
        if (nextDay) {
          assistantResponse = `Bugün senin için planlanan odak noktası: **${nextDay.focus}**. Toplam ${nextDay.exercises.length} hareketin var. Göğüs/Sırt/Bacak hedeflerine göre setlerini tamamlayıp RPE değerlerini girmeyi unutma!`;
        } else {
          assistantResponse = `Harika! Haftalık tüm antrenman günlerini tamamlamış görünüyorsun. Dinlenmene odaklan, protein alımına dikkat et ve bir sonraki haftanın planı için hazır ol! 💤`;
        }
      } 
      else if (lowerMsg.includes('selam') || lowerMsg.includes('merhaba') || lowerMsg.includes('hey')) {
        assistantResponse = `Merhaba ${profile?.id ? profile.id : 'sporcu'}! Ben senin Fitness Coach Agent'ınım. Bugün antrenmanınla veya beslenmenle ilgili neyi merak ediyorsun? `;
      } 
      else {
        // Generate random motivational response
        assistantResponse = await generateMotivationalMessage({
          name: profile?.id || 'Sporcu',
          goal: profile?.goal || 'genel fitness',
          streak: historyContext.streakDays,
          bmi: profile?.bmi || 22
        });
      }
    }

    // Save assistant message to memory
    saveChatMessage(userId, 'assistant', assistantResponse);

    const history = getChatHistory(userId);

    return NextResponse.json({
      success: true,
      history
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
