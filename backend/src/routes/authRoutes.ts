import { Router } from 'express';
import {
  handleGoogleLogin,
  handleLogin,
  handleRegister,
  handleResetPassword,
  handleSessionCheck,
} from '../controllers/authController.ts';

export const authRoutes = Router();

authRoutes.post('/auth/login', handleLogin);
authRoutes.post('/auth/register', handleRegister);
authRoutes.post('/auth/google', handleGoogleLogin);
authRoutes.post('/auth/reset-password', handleResetPassword);
authRoutes.get('/auth/session', handleSessionCheck);
