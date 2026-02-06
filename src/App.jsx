import React, { useState } from 'react';
import { 
  Palette, RefreshCw, CheckCircle2, Image as ImageIcon,
  PenTool, Copy, Zap, LayoutGrid, Sparkles, AlertCircle, Hash
} from 'lucide-react';

// يفضل دائماً وضع المفتاح في متغيرات البيئة بـ Vercel
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const App = () => {
  const [projectName, setProjectName] = useState('');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [images, setImages] = useState([null, null]);
  const [isGeneratingImages, setIsGeneratingImages] = useState([false, false]);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini Error Details:", errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
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

  const analyzeAndGenerate = async () => {
    if (!inputText.trim() || !projectName.trim()) {
      setError("يرجى إدخال اسم المشروع ووصف الشعار.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setResults(null);
    setImages([null, null]);

    // أضفنا كلمة "json" بشكل صريح داخل البرومبت لتفادي خطأ 400
    const analysisPrompt = `
      Return a JSON object for a logo design project.
      Project Name: "${projectName}"
      Description: "${inputText}"
      
      The JSON must have this structure:
      {
        "concept_summary": "Arabic summary",
        "variants": [
          {"id": 1, "title": "تصميم عصري", "prompt": "Professional minimalist vector logo for ${projectName}, white background"},
          {"id": 2, "title": "تصميم فاخر", "prompt": "Luxury elegant logo for ${projectName}, white background"}
        ],
        "colors": [{"name": "اللون المقترح", "hex": "#4f46e5"}]
      }
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { 
            // قمنا بإزالة responseMimeType مؤقتاً إذا كان يسبب تعارضاً في حسابك
            // وسنقوم بتنظيف النص يدوياً لضمان أعلى استقرار
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
          }
        })
      });

      let contentText = data.candidates[0].content.parts[0].text;
      // تنظيف النص من علامات الـ markdown لضمان تحويله لـ JSON
      const cleanJson = contentText.replace(/```json|```/g, "").trim();
      const content = JSON.parse(cleanJson);
      
      setResults(content);
      
      content.variants.forEach((variant, index) => {
        generateImage(variant.prompt, index);
      });
    } catch (err) {
      setError("حدث خطأ في الطلب. تأكد من إعدادات الـ API Key.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImage = async (prompt, index) => {
    setIsGeneratingImages(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    try {
      const seed = Math.floor(Math.random() * 1000000);
      // استخدام محرك Pollinations للصور لضمان عدم استهلاك الكوتا وتجنب التعقيد
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      
      setImages(prev => {
        const updated = [...prev];
        updated[index] = imageUrl;
        return updated;
      });
    } catch (err) {
      console.error(`Image generation failed:`, err);
    } finally {
      setIsGeneratingImages(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(idx);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Logo Lab Dual</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">مختبر التصميم <span className="text-indigo-600">الذكي</span></h1>
        <p className="text-slate-500 font-bold underline decoration-indigo-200">نتيجتين حصريتين لكل فكرة</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="space-y-4">
              <input 
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold"
                placeholder="اسم المشروع (English)"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toUpperCase())}
              />
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="اشرح لي فكرة الشعار بالعربي..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] animate-bounce">{error}</div>}
              <button 
                onClick={analyzeAndGenerate}
                disabled={isGenerating}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                توليد التصاميم
              </button>
            </div>
          </div>
          
          {results && (
            <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-black mb-4 flex items-center gap-2 text-indigo-400 text-xs italic">
                <Palette className="w-4 h-4" /> الألوان المقترحة
              </h3>
              {results.colors.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md" style={{backgroundColor: c.hex}} />
                    <span className="text-[10px] font-bold">{c.name}</span>
                  </div>
                  <code className="text-[10px] text-indigo-300">{c.hex}</code>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[0, 1].map((idx) => (
              <div key={idx} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg">0{idx + 1}</span>
                  <h4 className="font-black text-slate-800 text-[10px] truncate">{results?.variants[idx]?.title || "تحليل المفهوم..."}</h4>
                </div>
                <div className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden mb-5 flex items-center justify-center relative shadow-inner border border-slate-100">
                  {isGeneratingImages[idx] ? (
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                  ) : images[idx] ? (
                    <img src={images[idx]} className="w-full h-full object-contain p-6 animate-in fade-in duration-1000" alt="Logo" />
                  ) : (
                    <ImageIcon className="w-16 h-16 opacity-5" />
                  )}
                </div>
                {results && (
                  <button 
                    onClick={() => handleCopy(results.variants[idx].prompt, idx)}
                    className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 border-2 ${
                      copySuccess === idx ? 'bg-green-500 text-white border-green-500' : 'bg-slate-50 text-slate-500 border-transparent hover:border-indigo-500'
                    }`}
                  >
                    {copySuccess === idx ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copySuccess === idx ? 'تم النسخ' : 'نسخ الوصف'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      
      <footer className="mt-16 pb-10 text-center">
        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Trainer Sulieman Alkhateeb | Dual Edition</span>
      </footer>
    </div>
  );
};

export default App;