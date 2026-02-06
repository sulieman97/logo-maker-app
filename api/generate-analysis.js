// استبدل السطر الخاص بالرابط في كود الـ Backend بهذا الرابط المستقر:
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: analysisPrompt }] }],
      generationConfig: { 
        responseMimeType: "application/json", // هذا الموديل يدعم JSON بشكل مستقر
        temperature: 0.7
      }
    })
  }
);