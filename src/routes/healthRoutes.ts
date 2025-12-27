import { Router } from '../lib/miniExpress.js';

export const healthRoutes = Router();

healthRoutes.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});
