import React, { useState } from 'react';
import { 
  Palette, RefreshCw, CheckCircle2, Image as ImageIcon,
  PenTool, Copy, Zap, LayoutGrid, Sparkles, AlertCircle,
  Hash, Crown
} from 'lucide-react';

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

  const analyzeAndGenerate = async () => {
    if (!inputText.trim() || !projectName.trim()) {
      setError("يرجى إدخال اسم المشروع بالإنجليزية ووصف الشعار.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setResults(null);
    setImages([null, null]);

    // الرابط المحدث لموديل Gemini 2.0 Flash Experimental
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const analysisPrompt = `
      Project Name: "${projectName}"
      Description: "${inputText}"
      Task: Create 2 distinct English logo design prompts.
      Return ONLY a valid JSON object following this structure:
      {
        "concept_summary": "Short Arabic summary",
        "variants": [
          {"id": 1, "title": "Concept 1 Name", "prompt": "Prompt 1"},
          {"id": 2, "title": "Concept 2 Name", "prompt": "Prompt 2"}
        ]
      }
    `;

    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { 
            responseMimeType: "application/json"
          }
        })
      });

      // تنظيف النص الناتج من أي علامات Markdown قد تظهر
      let contentText = response.candidates[0].content.parts[0].text;
      const cleanJson = contentText.replace(/```json|```/g, "").trim();
      const content = JSON.parse(cleanJson);
      
      setResults(content);
      
      content.variants.forEach((variant, index) => {
        generateImage(variant.prompt, index);
      });
    } catch (err) {
      setError(`خطأ: ${err.message}. يرجى التحقق من المفتاح أو المحاولة لاحقاً.`);
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
    // إضافة لمسة احترافية للبرومبت لضمان جودة الصور من Pollinations
    const enhancedPrompt = encodeURIComponent(`${prompt}, professional minimalist logo, high quality, vector, white background`);
    const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    setImages(prev => {
      const updated = [...prev];
      updated[index] = imageUrl;
      return updated;
    });

    // تأخير بسيط لمحاكاة عملية التوليد
    setTimeout(() => {
      setIsGeneratingImages(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }, 2500);
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
          <span className="text-[10px] font-bold uppercase tracking-widest">Gemini 2.0 Flash AI</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3">مختبر التصميم <span className="text-indigo-600">الذكي</span></h1>
        <p className="text-slate-500 font-medium italic">بواسطة الموديل التجريبي الأسرع من Google</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* مدخلات المستخدم */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 sticky top-8">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 font-black text-slate-700 mb-2 text-sm">
                  <Hash className="w-4 h-4 text-indigo-600" /> اسم المشروع (EN)
                </label>
                <input 
                  type="text"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold text-left"
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
                  className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-sm leading-relaxed resize-none"
                  placeholder="مثال: شعار دائري يدمج بين السحاب والبناء..."
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
                بدء التوليد الذكي
              </button>
            </div>
          </div>
        </div>

        {/* النتائج والنتائج */}
        <div className="lg:col-span-8">
          {!results && !isGenerating ? (
            <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-white/50">
              <LayoutGrid className="w-20 h-20 mb-4 opacity-10" />
              <p className="text-xl font-black text-slate-400">نظام Gemini 2.0 جاهز</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
              {[0, 1].map((idx) => (
                <div key={idx} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100 transition-all hover:translate-y-[-4px]">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black">
                      0{idx + 1}
                    </span>
                    <h4 className="font-black text-slate-800 text-sm truncate">
                      {results?.variants[idx]?.title || "جاري التفكير..."}
                    </h4>
                  </div>

                  <div className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 relative mb-5 flex items-center justify-center shadow-inner">
                    {isGeneratingImages[idx] ? (
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendering AI...</span>
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
                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-100' 
                        : 'bg-slate-50 text-slate-500 border-transparent hover:border-indigo-500 hover:bg-white'
                      }`}
                    >
                      {copySuccess === idx ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copySuccess === idx ? 'تم النسخ' : 'نسخ وصف التصميم'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 py-4 z-50 text-center">
        <span className="text-xs font-black text-slate-900"> Trainer Sulieman Alkhateeb | Gemini 2.0 Lab </span>
      </footer>
    </div>
  );
};

export default App;