// @ts-nocheck
import crypto from 'node:crypto';
export async function hashPassword(plain) {
    const salt = crypto.randomBytes(16);
    const derivedKey = await scryptAsync(plain, salt, 64);
    return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}
export async function verifyPassword(plain, stored) {
    const [saltHex, keyHex] = stored.split(':');
    if (!saltHex || !keyHex)
        return false;
    const salt = Buffer.from(saltHex, 'hex');
    const derivedKey = await scryptAsync(plain, salt, 64);
    return crypto.timingSafeEqual(derivedKey, Buffer.from(keyHex, 'hex'));
}
function scryptAsync(password, salt, keylen) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
            if (err || !derivedKey) {
                reject(err);
                return;
            }
            resolve(derivedKey);
        });
    });
}
// @ts-nocheck
