import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});
