export async function synthesizeNativeTtsAudio(
  text: string,
  lang?: string
): Promise<{ success: boolean; audioBase64?: string; fallbackToBrowser?: boolean }> {
  const tl = lang === 'kn' ? 'kn' : lang === 'hi' ? 'hi' : 'en';

  const cleanText = text
    .replace(/[*_#`~>🚨⚠️✅❌]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const rawChunks = cleanText.split(/(?<=[.!?\n।॥])\s+/);
  const textChunks: string[] = [];
  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (trimmed.length > 150) {
      const sub = trimmed.split(/(?<=[,;:—])\s+/);
      let buf = '';
      for (const item of sub) {
        if ((buf + ' ' + item).length > 140 && buf.length > 0) {
          textChunks.push(buf.trim());
          buf = item;
        } else {
          buf = buf ? `${buf} ${item}` : item;
        }
      }
      if (buf.trim()) textChunks.push(buf.trim());
    } else {
      textChunks.push(trimmed);
    }
  }

  const chunksToSynthesize = textChunks.slice(0, 4);
  if (chunksToSynthesize.length === 0) {
    chunksToSynthesize.push(cleanText.slice(0, 140));
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunksToSynthesize) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=${tl}&client=tw-ob`;
      const audioRes = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (audioRes.ok) {
        const ab = await audioRes.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }
    } catch {
      // Continue with other chunks
    }
  }

  if (buffers.length > 0) {
    const combinedMp3 = Buffer.concat(buffers);
    return {
      success: true,
      audioBase64: combinedMp3.toString('base64'),
    };
  }

  return { success: false, fallbackToBrowser: true };
}
