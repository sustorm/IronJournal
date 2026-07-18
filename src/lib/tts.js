// Text-to-speech via OpenAI's TTS API — called directly from the browser,
// same pattern as the Anthropic calls in coach.js (personal single-user app,
// no backend proxy).
export async function synthesizeSpeech(text) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input: text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`TTS request failed (${res.status}): ${detail}`);
  }
  return res.blob();
}
