import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ENV, FRONTEND_ROOT, SERVE_FRONTEND } from './config/env.ts';
import { corsMiddleware } from './middleware/cors.ts';
import { investigationRoutes } from './routes/investigationRoutes.ts';
import { authRoutes } from './routes/authRoutes.ts';
import { ttsRoutes } from './routes/ttsRoutes.ts';
import { reportRoutes } from './routes/reportRoutes.ts';

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '15mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'truthlens-backend',
    mode: ENV.NODE_ENV,
    serveFrontend: SERVE_FRONTEND,
    geminiConfigured: Boolean(ENV.GEMINI_API_KEY),
  });
});

// Modular API Routes
app.use('/api', investigationRoutes);
app.use('/api', authRoutes);
app.use('/api', ttsRoutes);
app.use('/api', reportRoutes);

async function startServer() {
  if (SERVE_FRONTEND) {
    const viteConfigPath = path.join(FRONTEND_ROOT, 'vite.config.ts');
    if (ENV.NODE_ENV !== 'production' && fs.existsSync(viteConfigPath)) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        configFile: viteConfigPath,
        root: FRONTEND_ROOT,
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(FRONTEND_ROOT, 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req: Request, res: Response) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(
      `TruthLens Verify backend server running on port ${ENV.PORT} (SERVE_FRONTEND=${SERVE_FRONTEND})`
    );
  });
}

startServer();
