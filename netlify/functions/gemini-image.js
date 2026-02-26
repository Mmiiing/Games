exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  const { prompt } = JSON.parse(event.body);
  if (!prompt) return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) };
  const imageModels = [
    { ver: 'v1alpha', model: 'gemini-2.0-flash-exp-image-generation' },
    { ver: 'v1beta',  model: 'gemini-2.0-flash-exp' },
  ];
  for (const { ver, model } of imageModels) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
        }
      );
      if (!r.ok) continue;
      const d = await r.json();
      const parts = d.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData);
      if (imagePart) return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          imageData: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
          model,
        }),
      };
    } catch (e) { console.warn(e); }
  }
  return {
    statusCode: 502,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'Image generation failed' }),
  };
};