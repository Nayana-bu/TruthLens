import { buildApiUrl } from './apiClient';

export async function requestTtsAudio(params: {
  text: string;
  lang: 'kn' | 'hi' | 'en';
  signal?: AbortSignal;
}): Promise<{ ok: boolean; success?: boolean; audioBase64?: string }> {
  const response = await fetch(buildApiUrl('/api/tts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: params.text, lang: params.lang }),
    signal: params.signal,
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = (await response.json()) as { success?: boolean; audioBase64?: string };
  return {
    ok: true,
    success: data.success,
    audioBase64: data.audioBase64,
  };
}
