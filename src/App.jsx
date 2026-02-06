import React, { useState } from 'react';
import { 
  Palette, 
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  PenTool,
  Copy,
  Zap,
  LayoutGrid,
  Sparkles,
  AlertCircle,
  Hash,
  Crown
} from 'lucide-react';

// 1. تعريف المفتاح بشكل صحيح من متغيرات البيئة
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const App = () => {
  const [projectName, setProjectName] = useState('');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [images, setImages] = useState([null, null]);
  const [isGeneratingImages, setIsGeneratingImages] = useState([false, false]);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  // دالة جلب البيانات مع محاولة إعادة الاتصال
  const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  // الدالة الأساسية لتحليل النص وتوليد البرومبتات
  const analyzeAndGenerate = async () => {
    if (!inputText.trim() || !projectName.trim()) {
      setError("يرجى إدخال اسم المشروع بالإنجليزية ووصف الشعار.");
      return;
    }

    if (!apiKey) {
      setError("مفتاح الـ API غير موجود. تأكد من إعدادات البيئة.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setResults(null);
    setImages([null, null]);

    // استخدام موديل 1.5-flash المستقر
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const analysisPrompt = `
      Project Name: "${projectName}"
      Visual Identity Description: "${inputText}"
      Task: Create 2 distinct logo prompts in English. 
      Return ONLY a JSON object:
      {
        "concept_summary": "Arabic summary",
        "variants": [
          {"id": 1, "title": "عصري بسيط", "prompt": "Minimalist logo for ${projectName}, white background"},
          {"id": 2, "title": "إبداعي فاخر", "prompt": "Luxury logo for ${projectName}, elegant, white background"}
        ]
      }
    `;

    try {
      const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const content = JSON.parse(data.candidates[0].content.parts[0].text);
        setResults(content);
        
        // توليد الصور فوراً
        content.variants.forEach((variant, index) => {
          generateImage(variant.prompt, index);
        });
      }
    } catch (err) {
      setError(err.message || "فشل في معالجة البيانات.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // دالة توليد الصور باستخدام Pollinations
  const generateImage = async (prompt, index) => {
    setIsGeneratingImages(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    try {
      const professionalPrompt = `${prompt}, professional vector logo, flat design, white background, high resolution`;
      const encodedPrompt = encodeURIComponent(professionalPrompt);
      const randomSeed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${randomSeed}`;

      setImages(prev => {
        const updated = [...prev];
        updated[index] = imageUrl;
        return updated;
      });

      // ننتظر قليلاً ثم نغلق حالة التحميل
      setTimeout(() => {
        setIsGeneratingImages(prev => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
      }, 2000);

    } catch (err) {
      console.error("Image error:", err);
      setIsGeneratingImages(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(idx);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest text-[10px]">AI Logo Lab Duo</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">مختبر التصميم <span className="text-indigo-600">الثنائي</span></h1>
        <p className="text-slate-500">توليد نموذجين احترافيين لهويتك البصرية في ثوانٍ</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 sticky top-8">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 font-black text-slate-700 mb-2 text-sm">
                  <Hash className="w-4 h-4 text-indigo-600" /> اسم المشروع (English)
                </label>
                <input 
                  type="text"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-left"
                  placeholder="e.g. SKYLINE"
                  dir="ltr"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-slate-700 mb-2 text-sm">
                  <PenTool className="w-4 h-4 text-indigo-600" /> وصف الشعار بالعربي
                </label>
                <textarea 
                  className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm leading-relaxed resize-none"
                  placeholder="اشرح مفهومك هنا..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <button 
                onClick={analyzeAndGenerate}
                disabled={isGenerating || !inputText.trim() || !projectName.trim()}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                بدء التوليد الثنائي
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {!results && !isGenerating ? (
            <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-white/50">
              <LayoutGrid className="w-20 h-20 mb-4 opacity-10" />
              <p className="text-xl font-black text-slate-400">نظام التصميم جاهز</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
              {[0, 1].map((idx) => (
                <div key={idx} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100 transition-all hover:translate-y-[-4px]">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-md shadow-indigo-200">
                      0{idx + 1}
                    </span>
                    <h4 className="font-black text-slate-800 text-sm truncate">
                      {results?.variants[idx]?.title || "تحليل الهوية..."}
                    </h4>
                  </div>

                  <div className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 relative mb-5 flex items-center justify-center shadow-inner">
                    {isGeneratingImages[idx] ? (
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                        <span className="text-[10px] font-black text-slate-400">جاري التوليد...</span>
                      </div>
                    ) : images[idx] ? (
                      <img src={images[idx]} alt="Logo AI" className="w-full h-full object-contain p-6 animate-in fade-in zoom-in-95 duration-700" />
                    ) : (
                      <ImageIcon className="w-16 h-16 opacity-5" />
                    )}
                  </div>

                  {results && (
                    <button 
                      onClick={() => handleCopy(results.variants[idx].prompt, idx)}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 border-2 ${
                        copySuccess === idx 
                        ? 'bg-green-500 text-white border-green-500 shadow-lg' 
                        : 'bg-slate-50 text-slate-500 border-transparent hover:border-indigo-500'
                      }`}
                    >
                      {copySuccess === idx ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copySuccess === idx ? 'تم النسخ' : 'نسخ وصف الرسم'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 py-6 z-50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-black text-sm uppercase">Professional Identity Lab</span>
              <span className="text-[9px] font-bold text-slate-400 tracking-widest mt-1">Trainer Sulieman Alkhateeb</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;