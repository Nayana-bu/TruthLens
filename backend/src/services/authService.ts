import crypto from 'node:crypto';
import { ENV } from '../config/env.ts';
import { findUserByIdentifier, saveUserRecord, type StoredUserRecord } from '../db/authDb.ts';
import type { UserSession } from '../types.ts';

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

export function createSessionToken(session: UserSession): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: session.id,
      email: session.email,
      username: session.username,
      iat: Date.now(),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', ENV.AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { id: string; email: string; username: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', ENV.AUTH_SECRET).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

function toUserSession(user: StoredUserRecord): UserSession {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isVerified: user.isVerified,
    authProvider: user.authProvider,
    loginTime: new Date().toISOString(),
  };
}

export function loginWithPassword(params: {
  identifier: string;
  password: string;
}): { success: boolean; user?: UserSession; token?: string; error?: string } {
  const idClean = params.identifier.trim();
  if (!idClean || !params.password) {
    return { success: false, error: 'Identifier and password are required.' };
  }

  const existing = findUserByIdentifier(idClean);
  if (existing && existing.passwordSalt && existing.passwordHash) {
    const valid = verifyPassword(params.password, existing.passwordSalt, existing.passwordHash);
    if (!valid) {
      return { success: false, error: 'Invalid credentials. Please check your password.' };
    }
    const session = toUserSession(existing);
    return { success: true, user: session, token: createSessionToken(session) };
  }

  // Preserve compatibility with existing TruthLens direct/auditor sign-in workflow
  const isEmail = idClean.includes('@');
  const nowIso = new Date().toISOString();
  const { salt, hash } = hashPassword(params.password);
  const newUser: StoredUserRecord = {
    id: `user-${Date.now()}`,
    name: isEmail && idClean.toLowerCase().startsWith('nayana') ? 'Nayana Umesh' : idClean.split('@')[0],
    username: isEmail ? idClean.split('@')[0] : idClean,
    email: isEmail ? idClean : `${idClean}@truthlens.civic.in`,
    role: 'Verified Civic Researcher',
    isVerified: true,
    authProvider: 'password',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  saveUserRecord(newUser);
  const session = toUserSession(newUser);
  return { success: true, user: session, token: createSessionToken(session) };
}

export function registerAccount(params: {
  fullName: string;
  username?: string;
  email: string;
  password: string;
  role?: string;
}): { success: boolean; user?: UserSession; token?: string; error?: string } {
  const emailClean = params.email.trim();
  const nameClean = params.fullName.trim();
  if (!nameClean || !emailClean || !params.password) {
    return { success: false, error: 'Full name, email, and password are required.' };
  }

  const existing = findUserByIdentifier(emailClean);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const nowIso = new Date().toISOString();
  const { salt, hash } = hashPassword(params.password);
  const user: StoredUserRecord = {
    id: `user-${Date.now()}`,
    name: nameClean,
    username: params.username?.trim() || emailClean.split('@')[0],
    email: emailClean,
    role: params.role || 'Citizen Fact-Checker',
    isVerified: true,
    authProvider: 'password',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  saveUserRecord(user);
  const session = toUserSession(user);
  return { success: true, user: session, token: createSessionToken(session) };
}

export function loginWithGoogleProfile(): { success: boolean; user: UserSession; token: string } {
  const email = 'nayanabumesh22@gmail.com';
  const existing = findUserByIdentifier(email);
  const nowIso = new Date().toISOString();

  const record: StoredUserRecord = existing || {
    id: `google-${Date.now()}`,
    name: 'Nayana Umesh',
    username: 'nayana_umesh',
    email,
    role: 'Authorized Fact-Checking Analyst',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    authProvider: 'google',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  saveUserRecord(record);
  const session = toUserSession(record);
  return { success: true, user: session, token: createSessionToken(session) };
}

export function resetAccountPassword(params: {
  identifier: string;
  newPassword: string;
}): { success: boolean; error?: string } {
  const cleanId = params.identifier.trim();
  if (!cleanId || !params.newPassword || params.newPassword.length < 6) {
    return { success: false, error: 'Valid identifier and a password of at least 6 characters are required.' };
  }
  const existing = findUserByIdentifier(cleanId);
  if (existing) {
    const { salt, hash } = hashPassword(params.newPassword);
    saveUserRecord({
      ...existing,
      passwordSalt: salt,
      passwordHash: hash,
      updatedAt: new Date().toISOString(),
    });
  }
  return { success: true };
}
