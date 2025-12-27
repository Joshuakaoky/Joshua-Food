// @ts-nocheck
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { PublicUser } from '../types/user.js';

interface JwtPayload {
  sub: string;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

export function signAccessToken(user: PublicUser): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JwtPayload = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2 };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyAccessToken(token: string): JwtPayload {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token');
  }
  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
  if (expected !== signature) {
    throw new Error('Invalid token signature');
  }
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}
// @ts-nocheck
