import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { PublicUser } from '../types/user.js';

interface JwtPayload {
  sub: string;
}

export function signAccessToken(user: PublicUser): string {
  const payload: JwtPayload = { sub: user.id };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '2h' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
