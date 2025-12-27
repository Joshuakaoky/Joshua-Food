import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';

export const protectedRoutes = Router();

protectedRoutes.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});
