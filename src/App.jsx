import React, { useState } from 'react';
import { 
  Palette, RefreshCw, CheckCircle2, Image as ImageIcon,
  PenTool, Copy, Zap, LayoutGrid, Sparkles, AlertCircle,
  Hash, Crown
} from 'lucide-react';

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

    // البرومبت الخاص بتحليل الشعار
    const analysisPrompt = `
      You are a professional logo designer. 
      Project Name: "${projectName}"
      Description: "${inputText}"
      Task: Create 2 distinct logo design prompts for an AI image generator.
      Return ONLY a valid JSON object (no markdown, no backticks):
      {
        "concept_summary": "Short Arabic summary of the idea",
        "variants": [
          {"id": 1, "title": "تصميم عصري", "prompt": "Professional minimalist logo for ${projectName}, vector, clean, white background"},
          {"id": 2, "title": "تصميم إبداعي", "prompt": "Creative artistic logo for ${projectName}, elegant, high quality, white background"}
        ]
      }
    `;

    try {
      // استخدام Pollinations لتوليد النصوص (بديل Gemini)
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: analysisPrompt }],
          model: 'openai', // موديل قوي وسريع ومجاني هنا
          jsonMode: true
        })
      });

      const text = await response.text();
      // تنظيف النص في حال وجود علامات markdown
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const content = JSON.parse(cleanJson);
      
      setResults(content);
      
      // توليد الصور فوراً
      content.variants.forEach((variant, index) => {
        generateImage(variant.prompt, index);
      });
    } catch (err) {
      setError("حدث خطأ أثناء الاتصال بالخادم. حاول مرة أخرى.");
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
    // رابط الصورة المباشر من Pollinations
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    setImages(prev => {
      const updated = [...prev];
      updated[index] = imageUrl;
      return updated;
    });

    // إيقاف مؤشر التحميل بعد فترة بسيطة لأن الصورة تظهر تدريجياً
    setTimeout(() => {
      setIsGeneratingImages(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }, 2000);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(idx);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Unlimited AI Mode</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">مختبر التصميم <span className="text-indigo-600">الحر</span></h1>
        <p className="text-slate-500 font-medium italic underline decoration-indigo-200">توليد لا محدود بدون قيود مفاتيح الـ API</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="space-y-4">
              <input 
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold text-left"
                placeholder="اسم المشروع (English)"
                dir="ltr"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.toUpperCase())}
              />
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="اشرح لي فكرة الشعار..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">{error}</div>}
              <button 
                onClick={analyzeAndGenerate}
                disabled={isGenerating}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                توليد التصاميم الآن
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[0, 1].map((idx) => (
              <div key={idx} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden mb-5 flex items-center justify-center relative">
                  {isGeneratingImages[idx] ? (
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                  ) : images[idx] ? (
                    <img src={images[idx]} className="w-full h-full object-contain p-4 animate-in fade-in duration-500" alt="Logo" />
                  ) : (
                    <ImageIcon className="w-16 h-16 opacity-5" />
                  )}
                </div>
                {results && (
                  <button 
                    onClick={() => handleCopy(results.variants[idx].prompt, idx)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${copySuccess === idx ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {copySuccess === idx ? 'تم النسخ' : 'نسخ وصف الرسم'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="mt-10 text-center pb-10">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
           Trainer Sulieman Alkhateeb | Powered by Pollinations
        </span>
      </footer>
    </div>
  );
};

export default App;