import { randomBytes } from 'crypto';

const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TOKEN_LENGTH = 8;

export function generateToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS[bytes[i] % TOKEN_CHARS.length];
  }
  return token;
}
