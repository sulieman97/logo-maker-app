import React, { useState } from 'react';
import { 
  Palette, RefreshCw, CheckCircle2, Image as ImageIcon,
  PenTool, Copy, Zap, LayoutGrid, Sparkles, AlertCircle,
  Hash, Crown
} from 'lucide-react';

// تأكد من وجود المفتاح في إعدادات Vercel
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

  const analyzeAndGenerate = async () => {
    if (!inputText.trim() || !projectName.trim()) {
      setError("يرجى إدخال اسم المشروع ووصف الشعار.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setResults(null);
    setImages([null, null]);

    // استخدام الرابط المستقر لـ Gemini 1.5 Flash (الأكثر كفاءة في النسخة المجانية)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
      Project: "${projectName}"
      Idea: "${inputText}"
      Task: Create 2 professional logo prompts for AI image generation.
      Return ONLY a JSON object:
      {
        "concept_summary": "Short Arabic text",
        "variants": [
          {"id": 1, "title": "تصميم عصري", "prompt": "Minimalist vector logo for ${projectName}, white background, high quality"},
          {"id": 2, "title": "تصميم فاخر", "prompt": "Luxury elegant logo for ${projectName}, gold and black, white background"}
        ]
      }
    `;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "خطأ في الاتصال");
      }

      const data = await response.json();
      const content = JSON.parse(data.candidates[0].content.parts[0].text);
      setResults(content);
      
      // توليد الصور باستخدام Pollinations (لأنها لا تحتاج مفتاح ومستقرة جداً للصور)
      content.variants.forEach((variant, index) => {
        generateImage(variant.prompt, index);
      });
    } catch (err) {
      setError("حدث ضغط على النظام. يرجى المحاولة بعد قليل.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImage = (prompt, index) => {
    setIsGeneratingImages(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    const seed = Math.floor(Math.random() * 1000000);
    // إضافة تحسين للوصف لضمان جودة الصورة
    const finalPrompt = encodeURIComponent(prompt + ", high resolution, 4k, professional branding");
    const imageUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    setImages(prev => {
      const updated = [...prev];
      updated[index] = imageUrl;
      return updated;
    });

    setTimeout(() => {
      setIsGeneratingImages(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }, 1500);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(idx);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white">Gemini 1.5 Stable</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3">مختبر التصميم <span className="text-indigo-600">الذكي</span></h1>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="space-y-4">
              <input 
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold text-left"
                placeholder="Project Name (EN)"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toUpperCase())}
              />
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="وصف الشعار..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
              <button 
                onClick={analyzeAndGenerate}
                disabled={isGenerating}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                بدء التوليد
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
            {[0, 1].map((idx) => (
              <div key={idx} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden mb-5 flex items-center justify-center relative">
                  {isGeneratingImages[idx] ? (
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                  ) : images[idx] ? (
                    <img src={images[idx]} className="w-full h-full object-contain p-4" alt="Logo" />
                  ) : (
                    <ImageIcon className="w-16 h-16 opacity-5" />
                  )}
                </div>
                {results && (
                  <button 
                    onClick={() => handleCopy(results.variants[idx].prompt, idx)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${copySuccess === idx ? 'bg-green-500 text-white' : 'bg-slate-100'}`}
                  >
                    {copySuccess === idx ? 'تم النسخ' : 'نسخ الوصف'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="text-center pb-10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Trainer Sulieman Alkhateeb | Google AI Studio Stable Edition
      </footer>
    </div>
  );
};

export default App;