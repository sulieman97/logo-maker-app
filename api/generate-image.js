// api/generate-image.js
// Vercel Serverless Function لتوليد الصور

const requestCounts = new Map();
const RATE_LIMIT = 20; // 20 صورة
const RATE_WINDOW = 60 * 1000; // في الدقيقة

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

export default async function handler(req, res) {
  // CORS
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

  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      error: 'Too many requests',
      message: 'تجاوزت الحد المسموح. انتظر دقيقة',
      retryAfter: 60
    });
  }

  const { prompt, useGemini = true } = req.body;

  if (!prompt) {
    return res.status(400).json({ 
      error: 'Missing prompt',
      message: 'وصف الصورة مطلوب'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // محاولة 1: Gemini Image API
  if (useGemini && apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              negativePrompt: "blurry, low quality, distorted, watermark",
              safetySetting: "block_some"
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        let base64 = null;

        if (data.predictions && data.predictions[0]) {
          base64 = data.predictions[0].bytesBase64Encoded;
        } else if (data.candidates && data.candidates[0]) {
          const inlineData = data.candidates[0].content?.parts?.find(p => p.inlineData);
          base64 = inlineData?.inlineData?.data;
        }

        if (base64) {
          console.log(`Gemini image generated for ${ip}`);
          return res.status(200).json({ 
            image: `data:image/png;base64,${base64}`,
            source: 'gemini'
          });
        }
      }
    } catch (error) {
      console.warn('Gemini Image API failed, falling back:', error.message);
    }
  }

  // محاولة 2: Pollinations AI (مجاني دائماً)
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true&model=flux`;
    
    console.log(`Fallback to Pollinations for ${ip}`);
    
    return res.status(200).json({ 
      image: pollinationsUrl,
      source: 'pollinations'
    });

  } catch (error) {
    console.error('All image generation methods failed:', error);
    return res.status(500).json({ 
      error: 'Image generation failed',
      message: 'فشل في توليد الصورة'
    });
  }
}
