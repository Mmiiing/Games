// netlify/functions/gemini.js
// 텍스트 분석 전용 함수 (성향 분석, 캐릭터 특징, 썰 분석)

exports.handler = async (event) => {
  // CORS preflight 처리
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
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { prompt, maxTokens = 500, temperature = 0.9 } = body;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) };
  }

  // 시도할 모델 목록 (순서대로 fallback)
  const models = [
    { ver: 'v1beta', model: 'gemini-2.0-flash-lite' },
    { ver: 'v1beta', model: 'gemini-2.0-flash' },
    { ver: 'v1beta', model: 'gemini-1.5-flash' },
  ];

  for (const { ver, model } of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        }
      );

      if (!response.ok) {
        console.warn(`[${model}] status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (text) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ text, model }),
        };
      }
    } catch (err) {
      console.warn(`[${model}] error:`, err.message);
    }
  }

  return {
    statusCode: 502,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'All models failed' }),
  };
};