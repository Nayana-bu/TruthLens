import { Router } from 'express';
import { handleTtsSynthesis } from '../controllers/ttsController.ts';

export const ttsRoutes = Router();

ttsRoutes.post('/tts', handleTtsSynthesis);
