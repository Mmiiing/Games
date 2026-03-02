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

  const { prompt, maxTokens = 1200, temperature = 0.9 } = JSON.parse(event.body);

  const models = [
    { ver: 'v1beta', model: 'gemini-2.0-flash' },
    { ver: 'v1beta', model: 'gemini-2.5-flash' },
    { ver: 'v1beta', model: 'gemini-2.0-flash-lite-001' },
  ];

  for (const { ver, model } of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );
      if (!r.ok) {
        const errBody = await r.text();
        console.warn(`[gemini] ${model} failed: ${r.status} ${errBody.slice(0,200)}`);
        continue;
      }
      const d = await r.json();
      const candidate = d.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || '';
      const finishReason = candidate?.finishReason || 'UNKNOWN';

      console.log(`[gemini] ${model} finishReason=${finishReason} textLen=${text.length} text=${text.slice(0,100)}`);

      // SAFETY로 막혔으면 다음 모델 시도
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
        console.warn(`[gemini] ${model} blocked by ${finishReason}, trying next model`);
        continue;
      }

      if (text) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ text, model, finishReason }),
        };
      }
    } catch (e) {
      console.warn(`[gemini] ${model} error:`, e.message);
    }
  }

  return {
    statusCode: 502,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'All models failed' }),
  };
};