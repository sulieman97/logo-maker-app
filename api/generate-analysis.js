// api/generate-analysis.js
// Vercel Serverless Function لتحليل النصوص

// Rate Limiting بسيط (في الذاكرة)
const requestCounts = new Map();
const RATE_LIMIT = 10; // 10 طلبات
const RATE_WINDOW = 60 * 1000; // في الدقيقة

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
  // تنظيف الطلبات القديمة
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // استخراج IP المستخدم
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  
  // فحص Rate Limiting
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      error: 'Too many requests',
      message: 'يرجى الانتظار قليلاً قبل المحاولة مرة أخرى',
      retryAfter: 60
    });
  }

  const { projectName, inputText } = req.body;

  if (!projectName || !inputText) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'يرجى إدخال اسم المشروع والوصف'
    });
  }

  // API Key من Environment Variables (مخفي تماماً)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'خطأ في إعدادات الخادم'
    });
  }

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
    const response = await fetch(
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.candidates[0].content.parts[0].text);

    // Logging (اختياري)
    console.log(`Request from ${ip} for project: ${projectName}`);

    res.status(200).json(content);

  } catch (error) {
    console.error('Error in generate-analysis:', error);
    res.status(500).json({ 
      error: 'Generation failed',
      message: 'فشل في توليد التحليل. حاول مرة أخرى',
      details: error.message
    });
  }
}
