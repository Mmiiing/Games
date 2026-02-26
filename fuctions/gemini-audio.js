// netlify/functions/gemini-audio.js
// 오디오 base64를 받아 Gemini 1.5 Flash로 STT + 감정/키워드 분석 후 반환

const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { audioData, mimeType, prompt } = JSON.parse(event.body);

    if (!audioData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'audioData is required' }),
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioData,
            },
          },
          {
            text: prompt || `아래 오디오를 한국어로 정확히 받아쓰기하고, 다음 JSON 형식으로만 응답하세요:
{"transcript":"전체 내용","keywords":["키워드1","키워드2","키워드3"],"mood":"happy|excited|sad|angry|lonely|nostalgic|nervous|neutral 중 하나"}
JSON 외 다른 텍스트 없이.`,
          },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const text = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { transcript: text, keywords: [], mood: 'neutral' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: parsed }),
    };
  } catch (err) {
    console.error('[gemini-audio]', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
