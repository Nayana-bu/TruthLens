import type { Request, Response } from 'express';
import {
  loginWithGoogleProfile,
  loginWithPassword,
  registerAccount,
  resetAccountPassword,
  verifySessionToken,
} from '../services/authService.ts';

export function handleLogin(req: Request, res: Response) {
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
  }

  const result = loginWithPassword({ identifier, password });
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.json(result);
}

export function handleRegister(req: Request, res: Response) {
  const { fullName, username, email, password, role } = req.body || {};
  if (typeof fullName !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Full name, email, and password are required.' });
  }

  const result = registerAccount({
    fullName,
    username: typeof username === 'string' ? username : undefined,
    email,
    password,
    role: typeof role === 'string' ? role : undefined,
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
}

export function handleGoogleLogin(_req: Request, res: Response) {
  const result = loginWithGoogleProfile();
  return res.json(result);
}

export function handleResetPassword(req: Request, res: Response) {
  const { identifier, newPassword } = req.body || {};
  if (typeof identifier !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ success: false, error: 'Identifier and new password are required.' });
  }

  const result = resetAccountPassword({ identifier, newPassword });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
}

export function handleSessionCheck(req: Request, res: Response) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const verified = token ? verifySessionToken(token) : null;
  if (!verified) {
    return res.status(401).json({ success: false, authenticated: false });
  }
  return res.json({ success: true, authenticated: true, session: verified });
}
