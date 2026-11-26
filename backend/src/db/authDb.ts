import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.ts';

export interface StoredUserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  authProvider: 'google' | 'password' | 'demo';
  passwordSalt?: string;
  passwordHash?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

const USERS_FILE = path.join(ENV.DATA_DIR, 'users.json');

function ensureUsersDbSync(): void {
  if (!fs.existsSync(ENV.DATA_DIR)) {
    fs.mkdirSync(ENV.DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function readUsersSync(): StoredUserRecord[] {
  ensureUsersDbSync();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeUsersSync(users: StoredUserRecord[]): void {
  ensureUsersDbSync();
  const tempFile = `${USERS_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2), 'utf-8');
    fs.renameSync(tempFile, USERS_FILE);
  } catch (err) {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore cleanup failure
      }
    }
    throw err;
  }
}

export function findUserByIdentifier(identifier: string): StoredUserRecord | undefined {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return undefined;
  return readUsersSync().find(
    (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
}

export function saveUserRecord(user: StoredUserRecord): StoredUserRecord {
  const users = readUsersSync();
  const idx = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (idx !== -1) {
    users[idx] = { ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push(user);
  }
  writeUsersSync(users);
  return user;
}
