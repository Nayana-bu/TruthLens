import { Router } from 'express';
import { handleCreateReport } from '../controllers/reportController.ts';

export const reportRoutes = Router();

reportRoutes.post('/report', handleCreateReport);
