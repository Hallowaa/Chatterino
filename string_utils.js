import crypto from 'crypto';

export function newToken(length) {
    return crypto.randomBytes(length).toString('hex');
}