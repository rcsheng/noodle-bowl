import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

export function loadEnv(): void {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

export function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}. Check .env.local.`);
  return val;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function dataPath(...parts: string[]): string {
  return path.resolve(__dirname, 'data', ...parts);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
  });
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export function extractJson(text: string): unknown {
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(stripped);
}

export function latestFile(dir: string, label: string): string {
  ensureDir(dir);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
  if (!files.length) throw new Error(`No files in ${dir}. ${label}`);
  return path.join(dir, files[0]);
}
