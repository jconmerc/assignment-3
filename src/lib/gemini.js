import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';

export function hasGemini(overrideKey) {
    return Boolean(overrideKey || env.GEMINI_API_KEY);
}

export async function geminiGenerate({ contents, systemPrompt = '', config ={}, apiKey = null }) {
    const key = apiKey || env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');

    const ai = new GoogleGenAI({ apiKey: key });
    if (systemPrompt) {
        config.systemInstruction = { role: 'model', parts: [{ text: systemPrompt }] };
    }

    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const request = {
        model: model,
        contents: contents,
        config: config
    };

    const response = await ai.models.generateContent(request);
    const text = typeof response?.text === 'string' ? response.text : '';
    return { text, raw: response };
}
