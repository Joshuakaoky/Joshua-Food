import { Router } from '../lib/miniExpress.js';
import { signAccessToken } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { userRepository } from '../repositories/inMemoryUserRepository.js';
import { PublicUser } from '../types/user.js';

export const authRoutes = Router();

authRoutes.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ message: 'name, email, password are required' });
    return;
  }
  if (userRepository.findByEmail(email)) {
    res.status(409).json({ message: 'User already exists' });
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = userRepository.create(name, email, passwordHash);
  const { passwordHash: _, ...publicUser } = user;
  const token = signAccessToken(publicUser);
  res.status(201).json({ user: publicUser, token });
});

authRoutes.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }
  const user = userRepository.findByEmail(email);
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  const { passwordHash: _, ...publicUser } = user;
  const token = signAccessToken(publicUser as PublicUser);
  res.json({ user: publicUser, token });
});
