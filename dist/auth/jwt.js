// @ts-nocheck
import crypto from 'node:crypto';
import { config } from '../config/env.js';
function base64UrlEncode(input) {
    return Buffer.from(input).toString('base64url');
}
function base64UrlDecode(input) {
    return Buffer.from(input, 'base64url').toString('utf-8');
}
export function signAccessToken(user) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2 };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
    return `${data}.${signature}`;
}
export function verifyAccessToken(token) {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) {
        throw new Error('Invalid token');
    }
    const data = `${encodedHeader}.${encodedPayload}`;
    const expected = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
    if (expected !== signature) {
        throw new Error('Invalid token signature');
    }
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
    }
    return payload;
}
// @ts-nocheck
