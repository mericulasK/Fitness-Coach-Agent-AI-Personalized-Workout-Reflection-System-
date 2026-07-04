# ROL

Sen kıdemli (senior) bir Full Stack Developer'sın. 10+ yıllık deneyimin var; modern React/Next.js mimarileri, temiz backend tasarımı, veritabanı modelleme, ve özellikle **çok yüksek kaliteli, akıcı animasyonlu UI/UX** konusunda uzmansın. Aşağıdaki projeyi baştan sona, production-quality kod kalitesiyle, TEK SEFERDE eksiksiz şekilde inşa etmeni istiyorum. Varsayımda bulunman gerekirse en makul ve en kaliteli seçeneği seç, durma, sormadan devam et ve inşa et.

---

# PROJE BAĞLAMI

Bu proje, Google x Kaggle işbirliğiyle düzenlenen **"AI Agents: Intensive Vibe Coding Capstone Project"** yarışması için hazırlanıyor. Yarışmanın "Concierge Agents" kategorisinden **"Fitness Coach Agent" (Personalized Workout Plans)** fikrini hayata geçireceğiz.

Değerlendiricilerin arayacağı şeyler: gerçek bir **agent mimarisi** (algılama → planlama → araç kullanımı (tool use) → hafıza (memory) → eylem → geri bildirimle kendini güncelleme (reflection/adaptation)), güvenlik/guardrail düşüncesi, ve iyi bir kullanıcı deneyimi. Bunların hepsini aşağıda kod seviyesinde tarif ediyorum.

---

# MUTLAK, KIRMIZI ÇİZGİ KURALLAR (ASLA İHLAL ETME)

1. **HİÇBİR API KEY GEREKTİRMEYECEK.** OpenAI, Gemini, Anthropic, herhangi bir bulut LLM sağlayıcısı, herhangi bir "sign up" / "get your API key" adımı — YOK. `.env` dosyasında API key alanı bile olmayacak.
2. **%100 LOCAL ÇALIŞACAK.** Uygulama internet bağlantısı olmadan (airplane mode'da) sıfırdan kurulup çalışabilmeli. Tek istisna: kullanıcı kendi isteğiyle, kendi bilgisayarına kurduğu **Ollama** (yerel LLM runtime, `http://localhost:11434`) varsa, ona bağlanabilir — bu da bir "cloud API key" değil, tamamen kullanıcının kendi makinesinde çalışan opsiyonel bir katman.
3. **Zeka katmanı iki modlu olacak (kullanıcı kararı: ikisi de olsun):**
   - **Varsayılan mod (her zaman çalışır, kurulum gerektirmez):** Tamamen deterministik, kural/algoritma tabanlı bir "Agent Reasoning Engine". Aşağıda tarif edilen hesaplama ve karar algoritmalarıyla çalışır. Hiçbir LLM'e ihtiyaç duymaz.
   - **Opsiyonel gelişmiş mod:** Eğer kullanıcının bilgisayarında Ollama çalışıyorsa (uygulama açılışta `http://localhost:11434/api/tags` adresine kısa timeout'lu bir istek atarak sessizce kontrol eder), ayarlar ekranında bunu tespit edip kullanıcıya "Yerel LLM bulundu: llama3 / phi3 / gemma2 vb." şeklinde gösterir ve **sadece doğal dil üretimi katmanında** (motivasyon mesajları, antrenman açıklamaları, coach sohbet arayüzü) kullanır. **Planın kendisi (hangi hareket, kaç set/tekrar, kaç kg) HER ZAMAN deterministik motor tarafından hesaplanır** — LLM asla sayısal/güvenlik kritik kararlar üretmez. Bu hem güvenlik hem tutarlılık için şart.
   - Ollama yoksa uygulama sorunsuz şekilde şablon-tabanlı (template-based) doğal dil üretimine düşer (fallback), kullanıcı hiçbir hata/kesinti görmez.
4. Hiçbir üçüncü parti ücretli servis, hiçbir telemetri/analytics çağrısı, hiçbir dış CDN'e zorunlu bağımlılık olmayacak (fontlar/ikonlar dahil yerel olarak paketlenecek).

---

# TEKNOLOJİ YIĞINI (KESİN KARAR — bunu kullan, alternatif önerme)

- **Framework:** Next.js 14+ (App Router), TypeScript (tam tip güvenliği)
- **Styling:** Tailwind CSS + shadcn/ui bileşenleri (temiz, modern, tutarlı tasarım sistemi için)
- **Animasyon:** Framer Motion (sayfa geçişleri, kart animasyonları, micro-interactions, confetti/kutlama efekti, circular timer animasyonu)
- **Grafikler:** Recharts (kilo/hacim/güç ilerleme grafikleri, animasyonlu giriş)
- **State management:** Zustand (client-side global state için)
- **Veritabanı:** SQLite, `better-sqlite3` ile — tek dosya (`fitness_coach.db`), sıfır kurulum, sıfır ayrı sunucu süreci
- **Backend mantığı:** Next.js Route Handlers (`app/api/.../route.ts`) — ayrı bir backend sunucusuna gerek yok, tek proje, tek `npm run dev`, tek `npm install`
- **Opsiyonel LLM köprüsü:** Next.js server tarafından `fetch("http://localhost:11434/api/generate", ...)` — sadece server-side, hiçbir key yok, kısa timeout (ör. 800ms) ile bağlantı kontrolü

Bu yığının seçilme sebebi: tek dil (TypeScript), tek komutla ayağa kalkma, en hızlı şekilde çok kaliteli ve akıcı animasyonlu bir arayüz üretme kapasitesi.

---

# AGENT MİMARİSİ (bunu kod organizasyonunda birebir yansıt)

Kursun öğrettiği agent bileşenlerini (models/tools/orchestration/memory/evaluation) gerçek bir framework yerine kendi deterministik motorumuzda birebir modelle. `lib/agent/` klasörü altında şu modüller olsun, her biri ayrı, test edilebilir, "tool" gibi çağrılan bağımsız fonksiyonlar:

### 1. Perception (Algılama) — `lib/agent/perception.ts`
Kullanıcı profilini ve son antrenman loglarını toplayıp normalize eden katman. Girdi: yaş, cinsiyet, boy, kilo, hedef (kas kütlesi / yağ yakımı / güç / genel fitness / dayanıklılık), deneyim seviyesi (yeni başlayan/orta/ileri), haftada kaç gün antrenman yapabileceği, erişilebilir ekipman (ev/vücut ağırlığı, dambıl, tam donanımlı salon), sakatlık/kısıtlama bilgisi (ör. "diz sorunu", "bel sorunu").

### 2. Tools (Araçlar) — `lib/agent/tools/`
Her biri saf fonksiyon, girdi/çıktı tipleri net, birim testli:
- `calculateBMI(weightKg, heightCm)`
- `calculateTDEE(profile)` → Mifflin-St Jeor formülüyle bazal metabolizma + aktivite katsayısı
- `estimateOneRepMax(weight, reps)` → Epley formülü
- `selectExercises(goal, equipment, injuries, targetMuscleGroups, experienceLevel)` → yerel, kod içine gömülü egzersiz veritabanından (JSON, ~80-120 hareket: isim, kas grubu, ekipman, zorluk, sakatlık uyarı etiketleri) filtreli seçim yapar
- `generateWeeklyPlan(profile, weekNumber, previousPerformanceLogs)` → periodizasyon mantığıyla (lineer veya dalgalı — hedefe göre) haftalık antrenman planı üretir
- `adjustPlanBasedOnFeedback(plan, rpeLogs)` → **autoregulation algoritması**: kullanıcı bir seti "çok kolay" (düşük RPE) bildirdiyse bir sonraki hafta yükü %2.5–5 artır; "çok zor" bildirdiyse yükü azalt veya set sayısını düşür; bu klasik progressive overload + autoregulation mantığı
- `detectPlateau(progressHistory)` → son 3 haftada aynı ağırlıkta takılma tespit edilirse deload haftası öner
- `scheduleDeload(trainingAge, currentWeek)` → her 4-6 haftada bir otomatik hafif hafta planla
- `generateMotivationalMessage(context)` → Ollama varsa ona kısa prompt gönderip doğal dil üretir; yoksa önceden yazılmış, bağlama göre seçilen şablon havuzundan (30+ varyasyon) rastgele/mantıklı seçim yapar

### 3. Memory (Hafıza) — `lib/agent/memory.ts` + SQLite şeması
- Kısa süreli hafıza: mevcut oturumdaki state (Zustand store)
- Uzun süreli hafıza: SQLite'da kalıcı — `UserProfile`, `WorkoutPlan` (hafta/gün/egzersiz), `WorkoutLog` (gerçekleşen set/tekrar/ağırlık/RPE), `ProgressSnapshot` (kilo/ölçüm geçmişi), `ChatHistory`
- Agent her plan ürettiğinde geçmiş performansı (memory) girdi olarak kullanır — bu "context engineering" / kalıcı hafıza konseptini gösterir

### 4. Planning & Orchestration — `lib/agent/orchestrator.ts`
Tüm tool'ları sırayla çağıran ana orkestratör: Perception → ilgili tool'ları çağır → Plan oluştur → Guardrail kontrolünden geçir → Kaydet (Memory) → Kullanıcıya sun (Action). Bu dosya, agent'ın "beyni" gibi davranır ve loglama ile hangi tool'un ne zaman, neden çağrıldığını konsol/debug panelinde gösterebilir (şeffaflık — juriler için harika bir demo noktası).

### 5. Guardrails / Safety — `lib/agent/guardrails.ts`
- Girdi doğrulama (negatif kilo, mantıksız boy/yaş değerleri reddedilir)
- Sakatlık etiketli egzersizler otomatik filtrelenir, kullanıcı override etmek isterse açık bir uyarı gösterilir
- Haftalık yük artışı asla %10'u geçemez (aşırı yüklenme/sakatlanma riskine karşı sert üst sınır)
- Tıbbi tavsiye olmadığı, ciddi sağlık sorunlarında doktora danışılması gerektiği net bir uyarı (disclaimer) her zaman görünür
- Tüm kişisel veri cihazda kalır, hiçbir yere gönderilmez (privacy-by-design)

### 6. Reflection Loop (Kendini güncelleme)
Her hafta sonunda `adjustPlanBasedOnFeedback` + `detectPlateau` otomatik çalışır, bir sonraki haftanın planı bir öncekinin ham kopyası değil, **gerçek geri bildirime dayalı** yeni bir plandır. Bunu UI'da açıkça göster ("Geçen hafta squat'ta RPE 6 bildirdin, bu hafta ağırlığı %5 artırdım 💪").

---

# VERİ MODELİ (SQLite şeması, `lib/db/schema.ts`)

```
UserProfile: id, age, gender, heightCm, weightKg, goal, experienceLevel,
             daysPerWeek, equipment, injuries[], createdAt, updatedAt

WorkoutPlan: id, userId, weekNumber, startDate, isDeloadWeek, createdAt

WorkoutDay: id, planId, dayIndex, focus (ör. "Push", "Pull", "Legs"), status

Exercise: id, dayId, exerciseName, targetSets, targetReps, targetWeight,
          muscleGroup, equipment, orderIndex

WorkoutLog: id, exerciseId, actualSets, actualReps, actualWeight, rpe,
            completedAt, notes

ProgressSnapshot: id, userId, date, weightKg, bodyMeasurements(json)

ChatMessage: id, userId, role (user/agent), content, timestamp
```

---

# UI/UX GEREKSİNİMLERİ (öncelik: modern görünüm + akıcı animasyon)

1. **Onboarding Wizard** — çok adımlı, ilerleme çubuklu, her adım geçişinde Framer Motion slide/fade animasyonu. Yaş, cinsiyet, boy/kilo, hedef seçimi (görsel kartlar), deneyim seviyesi, haftalık gün sayısı, ekipman, sakatlık/kısıtlama bilgisi toplanır.
2. **Dashboard** — bugünün antrenmanı kartı (öne çıkan, hafif glow/gradient), haftalık özet, seri (streak) sayacı, hızlı istatistikler (kalori, kilo trendi mini-grafik).
3. **Antrenman Oturumu Ekranı** — egzersiz kartları arasında akıcı geçiş animasyonu, set/tekrar/ağırlık girişi, dairesel (circular) geri sayım animasyonlu dinlenme süresi (rest timer), set tamamlandığında hafif haptic-benzeri görsel geri bildirim, tüm antrenman bitince **confetti / kutlama animasyonu**.
4. **İlerleme Sayfası** — Recharts ile kilo, hacim (volume), egzersiz bazlı güç ilerlemesi grafikleri; grafikler sayfa yüklenince animasyonla çizilir.
5. **Coach Sohbet Widget'ı** — konuşma balonu arayüzü; kullanıcı "bugün ne yapmalıyım", "bu hareketi neden seçtin", "planımı zorlaştır" gibi mesajlar yazabilir; yanıt Ollama varsa ondan, yoksa şablon motorundan gelir; typing-indicator animasyonu.
6. **Ayarlar** — koyu/açık tema geçişi, birim seçimi (kg/lb, cm/inch), veri yedekleme/geri yükleme (yerel JSON export/import — bulut olmadığı için bu şart), Ollama bağlantı durumu göstergesi + model seçici dropdown.
7. **Tasarım dili:** koyu tema öncelikli, canlı vurgu rengi (elektrik yeşili veya turuncu), glassmorphism kartlar, büyük okunaklı tipografi, bol boşluk (whitespace), tutarlı 8px grid spacing sistemi. Sayfa geçişlerinde Framer Motion `AnimatePresence`, buton hover/press durumlarında mikro-animasyon, iskelet (skeleton) yükleyiciler.

---

# KLASÖR YAPISI

```
fitness-coach-agent/
├── app/
│   ├── (onboarding)/
│   ├── dashboard/
│   ├── workout/[dayId]/
│   ├── progress/
│   ├── coach/
│   ├── settings/
│   └── api/
│       ├── profile/route.ts
│       ├── plan/generate/route.ts
│       ├── plan/today/route.ts
│       ├── log/route.ts
│       ├── progress/route.ts
│       ├── chat/route.ts
│       └── ollama/status/route.ts
├── lib/
│   ├── agent/
│   │   ├── perception.ts
│   │   ├── tools/
│   │   ├── memory.ts
│   │   ├── orchestrator.ts
│   │   └── guardrails.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── client.ts
│   └── data/exercises.json
├── components/ (UI bileşenleri, animasyonlu kartlar, chart wrapper'lar)
├── store/ (Zustand store'ları)
├── fitness_coach.db  (otomatik oluşur, .gitignore'da)
├── README.md
└── package.json
```

---

# ADIM ADIM GELİŞTİRME SIRASI

1. Next.js + TypeScript + Tailwind + shadcn/ui projesini scaffold et.
2. SQLite şemasını ve `better-sqlite3` bağlantısını kur, migration script'i yaz.
3. `lib/data/exercises.json` içine en az 80-120 hareketlik yerel egzersiz veritabanı oluştur (isim, kas grubu, ekipman, zorluk, sakatlık uyarı etiketleri).
4. Agent tool fonksiyonlarını tek tek yaz (`lib/agent/tools/`), her biri için basit birim testleri ekle.
5. Guardrails modülünü yaz.
6. Orchestrator'ı yaz, tüm tool'ları birbirine bağla.
7. API route'larını yaz (profile, plan/generate, plan/today, log, progress, chat, ollama/status).
8. Ollama entegrasyon modülünü yaz — kısa timeout'lu health-check, model listesi çekme, opsiyonel generate çağrısı, hatalı/erişilemez durumda sessiz fallback.
9. Onboarding wizard UI'ını animasyonlarla inşa et.
10. Dashboard + Antrenman Oturumu ekranını (timer, confetti dahil) inşa et.
11. İlerleme sayfasını (Recharts) inşa et.
12. Coach sohbet widget'ını inşa et.
13. Ayarlar sayfasını (tema, birim, yedekleme, Ollama durumu) inşa et.
14. `README.md` yaz: kurulum (`npm install && npm run dev`), Ollama'yı opsiyonel nasıl kurup bağlayacağı, agent mimarisinin kısa açıklaması (kurs konseptleriyle eşleştirilmiş: tools, memory, orchestration, guardrails, reflection).
15. Uygulamanın internet bağlantısı olmadan da tamamen çalıştığını doğrula (Ollama hariç hiçbir dış istek atılmamalı).

---

# KAGGLE CAPSTONE TESLİMİ İÇİN NOT (README'ye ekle)

README'nin sonuna kısa bir "Agent Design Doc" bölümü ekle: Perception → Tools → Memory → Planning/Orchestration → Guardrails → Reflection döngüsünü bir diyagram/madde listesiyle açıkla. Bu, jüriye projenin "gerçek bir agent" gibi tasarlandığını (rastgele bir form uygulaması değil) net şekilde gösterir.

---

# ŞİMDİ YAP

Yukarıdaki her şeyi tek seferde, eksiksiz, çalışan bir proje olarak üret. Placeholder/TODO bırakma — her fonksiyon gerçek mantıkla dolu olsun. Kod kalitesi production-ready olsun (tip güvenliği, hata yönetimi, temiz isimlendirme). UI'ın "modern ve çok iyi gözüken" olması ve animasyonların "smooth" olması en kritik öncelik — bu konuda taviz verme.
