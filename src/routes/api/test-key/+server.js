import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return json({ error: 'API key is required' }, { status: 400 });
    }

    // Use the same model as configured in environment
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Test the API key with a simple request to Gemini
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello'
          }]
        }]
      })
    });

    if (testResponse.ok) {
      return json({ success: true, message: 'API key is valid' });
    } else {
      const errorData = await testResponse.json();
      return json({
        error: errorData.error?.message || 'Invalid API key'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('API key validation error:', error);
    return json({
      error: 'Failed to validate API key'
    }, { status: 500 });
  }
}
