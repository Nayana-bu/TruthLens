import type { Request, Response } from 'express';
import { synthesizeNativeTtsAudio } from '../services/ttsService.ts';

export async function handleTtsSynthesis(req: Request, res: Response) {
  try {
    const { text, lang } = req.body || {};
    if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
      return res.status(400).json({ error: 'Missing or invalid text parameter' });
    }

    const result = await synthesizeNativeTtsAudio(text, typeof lang === 'string' ? lang : undefined);
    return res.json(result);
  } catch {
    return res.json({ success: false, fallbackToBrowser: true });
  }
}
