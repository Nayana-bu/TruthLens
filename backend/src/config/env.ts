import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend root directory (backend/) and workspace root (/)
export const BACKEND_ROOT = path.resolve(__dirname, '../..');
export const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, '..');
export const FRONTEND_ROOT = path.resolve(WORKSPACE_ROOT, 'frontend');

// Load backend/.env first, then workspace root .env if present (without overriding runtime-injected secrets)
dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });
dotenv.config({ path: path.join(WORKSPACE_ROOT, '.env') });

const serveFrontendExplicit = process.env.SERVE_FRONTEND;
export const SERVE_FRONTEND = serveFrontendExplicit !== 'false';

const defaultDevPort = SERVE_FRONTEND ? 3000 : 4000;
const defaultProdPort = process.env.PORT ? parseInt(process.env.PORT, 10) : SERVE_FRONTEND ? 8080 : 4000;

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT:
    process.env.NODE_ENV === 'production'
      ? defaultProdPort
      : process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : defaultDevPort,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',
  AUTH_SECRET: process.env.AUTH_SECRET || 'truthlens-local-dev-secret-change-in-production',
  APP_URL: process.env.APP_URL || '',
  DATA_DIR: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(BACKEND_ROOT, 'data'),
};
