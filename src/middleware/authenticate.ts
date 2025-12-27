// @ts-nocheck
import { NextFunction, Request, Response } from '../lib/miniExpress.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { userRepository } from '../repositories/inMemoryUserRepository.js';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ message: 'Unauthorized: missing token' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = userRepository.findById(payload.sub);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: user not found' });
      return;
    }
    const { passwordHash, ...publicUser } = user;
    req.user = publicUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
}
// @ts-nocheck
