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

  const { audioData, mimeType, prompt } = JSON.parse(event.body);
  if (!audioData) return { statusCode: 400, body: JSON.stringify({ error: 'audioData is required' }) };

  const sttPrompt = prompt || `아래 오디오를 한국어로 정확히 받아쓰기하고, 다음 JSON 형식으로만 응답하세요:
{"transcript":"전체 내용","keywords":["키워드1","키워드2","키워드3"],"mood":"happy|excited|sad|angry|lonely|nostalgic|nervous|neutral 중 하나"}
JSON 외 다른 텍스트 없이.`;

  // gemini.js 와 동일한 패턴 — SDK 미사용, fetch 직접 호출
  const models = [
    { ver: 'v1beta', model: 'gemini-2.0-flash-lite' },
    { ver: 'v1beta', model: 'gemini-2.0-flash' },
    { ver: 'v1beta', model: 'gemini-1.5-flash-latest' },
  ];

  for (const { ver, model } of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType || 'audio/webm', data: audioData } },
                { text: sttPrompt },
              ],
            }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );
      if (!r.ok) { console.warn(`[gemini-audio] ${model} failed: ${r.status}`); continue; }

      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) continue;

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { transcript: text, keywords: [], mood: 'neutral' };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ result: parsed, model }),
      };
    } catch (e) { console.warn(`[gemini-audio] ${model} error:`, e.message); }
  }

  return {
    statusCode: 502,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'All models failed' }),
  };
};
