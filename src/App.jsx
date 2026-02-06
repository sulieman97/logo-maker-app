import React, { useState } from 'react';
import { 
  Palette, RefreshCw, CheckCircle2, Image as ImageIcon,
  PenTool, Copy, Zap, LayoutGrid, Sparkles, AlertCircle, Hash
} from 'lucide-react';

// تأكد من وضع المفتاح هنا أو في متغيرات البيئة
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const App = () => {
  const [projectName, setProjectName] = useState('');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  // مصفوفة بحجم 2 فقط لنتيجتين
  const [images, setImages] = useState([null, null]);
  const [isGeneratingImages, setIsGeneratingImages] = useState([false, false]);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

    const analysisPrompt = `
      Project Name: "${projectName}"
      Visual Identity Description: "${inputText}"
      Task: 
      1. Create 2 distinct logo design prompts for an AI image generator. 
      2. Return ONLY a JSON object:
      {
        "concept_summary": "Short Arabic summary",
        "variants": [
          {"id": 1, "title": "مفهوم عصري", "prompt": "Professional minimalist logo for ${projectName}, vector, clean, white background"},
          {"id": 2, "title": "مفهوم إبداعي", "prompt": "Creative artistic logo for ${projectName}, vibrant, high quality, white background"}
        ],
        "colors": [{"name": "لون رئيسي", "hex": "#4f46e5"}]
      }
    `;

    try {
      // استخدام الإصدار المستقر v1
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const content = JSON.parse(data.candidates[0].content.parts[0].text);
      setResults(content);
      
      content.variants.forEach((variant, index) => {
        generateImage(variant.prompt, index);
      });
    } catch (err) {
      setError("يرجى التحقق من مفتاح الـ API أو المحاولة لاحقاً.");
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
      // ملاحظة: توليد الصور المباشر داخل Gemini يتطلب نماذج خاصة، 
      // سنستخدم Pollinations هنا لضمان النجاح الفوري والمجاني للصورتين.
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      
      // محاكاة تحميل بسيط للصورة
      setImages(prev => {
        const updated = [...prev];
        updated[index] = imageUrl;
        return updated;
      });
    } catch (err) {
      console.error(`Image ${index} generation failed:`, err);
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
          <span className="text-xs font-bold uppercase tracking-widest">Logo Lab Dual v2</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">مختبر التصميم <span className="text-indigo-600">الثنائي</span></h1>
        <p className="text-slate-500 font-bold">توليد نتيجتين احترافيتين فوراً</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 font-black text-slate-700 mb-2">
                  <Hash className="w-4 h-4 text-indigo-600" /> اسم المشروع (EN)
                </label>
                <input 
                  type="text"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold"
                  placeholder="مثال: SKYNET"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-black text-slate-700 mb-2">
                  <PenTool className="w-4 h-4 text-indigo-600" /> الوصف بالعربي
                </label>
                <textarea 
                  className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-sm resize-none"
                  placeholder="صف فكرة شعارك هنا..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <button 
                onClick={analyzeAndGenerate}
                disabled={isGenerating || !inputText.trim() || !projectName.trim()}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                بدء التوليد
              </button>
            </div>
          </div>

          {results && (
            <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
              <h3 className="font-black mb-4 flex items-center gap-2 text-indigo-400 text-sm">
                <Palette className="w-5 h-5" /> لوحة الألوان المقترحة
              </h3>
              <div className="space-y-2">
                {results.colors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg" style={{backgroundColor: c.hex}} />
                      <span className="text-[10px] font-bold">{c.name}</span>
                    </div>
                    <code className="text-[10px] text-indigo-300">{c.hex}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output Area */}
        <div className="lg:col-span-8">
          {!results && !isGenerating ? (
            <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-white/50">
              <LayoutGrid className="w-20 h-20 mb-4 opacity-10" />
              <p className="text-2xl font-black text-slate-400">بانتظار إبداعك</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[0, 1].map((idx) => (
                <div key={idx} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100 relative group">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg">
                      {idx + 1}
                    </span>
                    <h4 className="font-black text-slate-800 text-xs truncate">
                      {results?.variants[idx]?.title || "تحليل..."}
                    </h4>
                  </div>

                  <div className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 relative mb-5 flex items-center justify-center shadow-inner">
                    {isGeneratingImages[idx] || (isGenerating && !results) ? (
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                        <span className="text-[10px] font-black text-slate-400">جاري الرسم...</span>
                      </div>
                    ) : images[idx] ? (
                      <img src={images[idx]} alt="Logo AI" className="w-full h-full object-contain p-6 animate-in fade-in zoom-in-95 duration-700" />
                    ) : (
                      <ImageIcon className="w-12 h-12 opacity-5" />
                    )}
                  </div>

                  {results && (
                    <button 
                      onClick={() => handleCopy(results.variants[idx].prompt, idx)}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 border-2 ${
                        copySuccess === idx 
                        ? 'bg-green-500 text-white border-green-500' 
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

      <footer className="mt-12 pb-10 text-center text-slate-400">
        <div className="bg-slate-900 text-white inline-block px-8 py-3 rounded-full shadow-xl">
           <span className="font-black text-[10px] tracking-widest uppercase">Trainer Sulieman Alkhateeb | Dual Pro</span>
        </div>
      </footer>
    </div>
  );
};

export default App;