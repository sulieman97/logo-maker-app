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

// استخدم متغير البيئة من Vercel
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
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
      return await response.json();
    } catch (err) {
      if (retries > 0 && !err.message.includes('403')) {
        console.log(`Retrying... (${retries} attempts left)`);
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

    if (!apiKey || apiKey.trim() === "") {
      setError("❌ API Key مفقود! أضفه في Environment Variables على Vercel");
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
      1. Translate the description to professional English design terminology.
      2. Create ONLY 2 distinct logo design prompts. 
      3. Each prompt MUST include the text "${projectName}" as the primary brand name.
      4. Variation: Style 1 (Minimalist & Modern), Style 2 (Creative & Luxurious).

      Return ONLY a JSON object:
      {
        "concept_summary": "Short Arabic summary",
        "variants": [
          {"id": 1, "title": "تصميم عصري بسيط", "prompt": "Professional minimalist logo for '${projectName}', clean lines, white background, vector style"},
          {"id": 2, "title": "تصميم إبداعي فاخر", "prompt": "Luxurious creative logo for '${projectName}', elegant details, high contrast, white background, premium design"}
        ],
        "colors": [{"name": "اللون الأساسي", "hex": "#4f46e5"}]
      }
    `;

    try {
      // استخدام gemini-2.0-flash-exp (الأحدث والمتاح للجميع)
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analysisPrompt }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.8,
              topK: 40,
              topP: 0.95
            }
          })
        }
      );

      const content = JSON.parse(data.candidates[0].content.parts[0].text);
      setResults(content);
      
      // توليد الصور بالتوازي
      content.variants.forEach((variant, index) => {
        generateImage(variant.prompt, index);
      });
    } catch (err) {
      console.error("Analysis error:", err);
      if (err.message.includes('403')) {
        setError("❌ API Key غير صالح أو منتهي. احصل على واحد جديد من Google AI Studio");
      } else if (err.message.includes('404')) {
        setError("❌ النموذج غير متاح. تأكد من تفعيل Gemini API في حسابك");
      } else {
        setError("❌ فشل التحليل. تحقق من الاتصال بالإنترنت");
      }
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
      // استخدام imagen-3.0-generate-001 (Gemini Image Generation)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{
              prompt: prompt
            }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              negativePrompt: "blurry, low quality, distorted, watermark",
              safetySetting: "block_some"
            }
          })
        }
      );

      if (!response.ok) {
        console.warn(`Image API returned ${response.status}, trying alternative...`);
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      
      // محاولة استخراج الصورة من الاستجابة
      let base64 = null;
      
      if (data.predictions && data.predictions[0]) {
        base64 = data.predictions[0].bytesBase64Encoded;
      } else if (data.candidates && data.candidates[0]) {
        const inlineData = data.candidates[0].content?.parts?.find(p => p.inlineData);
        base64 = inlineData?.inlineData?.data;
      }

      if (base64) {
        setImages(prev => {
          const updated = [...prev];
          updated[index] = `data:image/png;base64,${base64}`;
          return updated;
        });
      } else {
        throw new Error("No image data in response");
      }

    } catch (err) {
      console.error(`Image ${index} generation failed, using fallback:`, err);
      
      // استخدام Pollinations كخيار احتياطي مجاني
      const seed = Math.floor(Math.random() * 1000000);
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true&model=flux`;
      
      setImages(prev => {
        const updated = [...prev];
        updated[index] = fallbackUrl;
        return updated;
      });
      
    } finally {
      setIsGeneratingImages(prev => {
        const updated = [...prev];
        updated[index] = false;
        return updated;
      });
    }
  };

  const regenerateImage = (index) => {
    if (results && results.variants[index]) {
      setImages(prev => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      generateImage(results.variants[index].prompt, index);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(idx);
      setTimeout(() => setCopySuccess(null), 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
      // Fallback للمتصفحات القديمة
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(idx);
        setTimeout(() => setCopySuccess(null), 2000);
      } catch (e) {
        console.error('Fallback copy failed', e);
      }
      document.body.removeChild(textArea);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8" dir="rtl">
      <header className="max-w-6xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full mb-4 shadow-lg animate-pulse">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest text-[10px]">AI Logo Lab Duo</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">
          مختبر التصميم <span className="text-indigo-600">الثنائي</span>
        </h1>
        <p className="text-slate-500">توليد نموذجين احترافيين لهويتك البصرية في ثوانٍ</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Area */}
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
                  placeholder="اشرح مفهومك أو الألوان المطلوبة هنا..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[11px]">{error}</span>
                </div>
              )}

              <button 
                onClick={analyzeAndGenerate}
                disabled={isGenerating || !inputText.trim() || !projectName.trim()}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                بدء التوليد الثنائي
              </button>
            </div>
          </div>
        </div>

        {/* Output Area */}
        <div className="lg:col-span-8">
          {!results && !isGenerating ? (
            <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300 p-12 text-center bg-white/50">
              <LayoutGrid className="w-20 h-20 mb-4 opacity-10" />
              <p className="text-xl font-black text-slate-400">نظام التصميم جاهز</p>
              <p className="text-xs mt-2 text-slate-400">أدخل البيانات لبدء العمل</p>
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
                    {isGeneratingImages[idx] || (isGenerating && !results) ? (
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Generating Concept...
                        </span>
                      </div>
                    ) : images[idx] ? (
                      <>
                        <img 
                          src={images[idx]} 
                          alt="Logo AI" 
                          className="w-full h-full object-contain p-6 animate-in fade-in zoom-in-95 duration-700"
                          onError={(e) => {
                            console.error('Image load error');
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(projectName)}&size=1024&background=4f46e5&color=fff&bold=true`;
                          }}
                        />
                        <button
                          onClick={() => regenerateImage(idx)}
                          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg hover:bg-indigo-600 hover:text-white transition-all group"
                          title="إعادة التوليد"
                        >
                          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                      </>
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
                      {copySuccess === idx ? 'تم النسخ بنجاح' : 'نسخ وصف الرسم'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 py-6 z-50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-black text-sm tracking-tight leading-none uppercase">
                    Professional Identity Lab
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Visual Engineering v2.0
                  </span>
                </div>
            </div>
            
            <div className="h-px w-16 bg-slate-200 hidden md:block" />
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Designed By</span>
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-4 py-1.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors cursor-default">
                  Trainer Sulieman Alkhateeb
              </span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;