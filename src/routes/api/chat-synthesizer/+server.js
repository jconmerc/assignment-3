import { json } from '@sveltejs/kit';
import { LeadershipSynthesizer } from '$lib/orchestrators/LeadershipSynthesizer.js';

/**
 * Handle chat POST requests for synthesizer pipeline execution.
 * This endpoint uses the synthesizer that combines all 6 leadership styles.
 */
export async function POST({ request }) {
  const body = await request.json();
  const { history, apiKey } = body || {};

  if (!Array.isArray(history)) {
    return json({ error: 'history array is required' }, { status: 400 });
  }

  try {
    const synthesizer = new LeadershipSynthesizer();
    const contents = history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));

    // Use user's API key if provided, otherwise use environment variable
    const { assistantMessage, frameSet, agent, reasons, individualResponses } = await synthesizer.orchestrate(contents, apiKey);

    return json({
      assistantMessage,
      replierInput: {
        frameSet,
        contextCount: history.length,
        agent,
        reasons,
        individualResponses
      }
    });
  } catch (err) {
    const msg = String(err?.message || err || '').toLowerCase();
    if (msg.includes('gemini_api_key') || msg.includes('gemini') || msg.includes('api key')) {
      // Only show this error if no user API key was provided AND no environment key exists
      if (!apiKey && !process.env.GEMINI_API_KEY) {
        return json({ error: 'Gemini API key not found. Please add your API key using the "Add API Key" button.' }, { status: 400 });
      } else {
        return json({ error: 'API key validation failed. Please check your API key.' }, { status: 400 });
      }
    }
    return json({ error: 'Pipeline error', details: String(err?.message || err) }, { status: 500 });
  }
}
