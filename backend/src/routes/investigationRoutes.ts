import { Router } from 'express';
import {
  handleDeleteInvestigation,
  handleGetInvestigation,
  handleGetStatistics,
  handleInvestigateClaim,
  handleListInvestigations,
  handleUpdateInvestigation,
} from '../controllers/investigationController.ts';

export const investigationRoutes = Router();

investigationRoutes.post('/investigate', handleInvestigateClaim);
investigationRoutes.get('/investigations', handleListInvestigations);
investigationRoutes.get('/investigations/:id', handleGetInvestigation);
investigationRoutes.put('/investigations/:id', handleUpdateInvestigation);
investigationRoutes.delete('/investigations/:id', handleDeleteInvestigation);
investigationRoutes.get('/statistics', handleGetStatistics);
