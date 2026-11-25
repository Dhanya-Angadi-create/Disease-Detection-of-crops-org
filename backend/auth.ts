import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage.ts';

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : EPHEMERAL_FALLBACK_SECRET;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'farmer' | 'admin';
  language_pref: 'en' | 'kn';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derivedKey.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derivedKey, storedBuf);
}

export function signToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token: string): { id: number; email: string; role: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded.id !== 'number' || typeof decoded.exp !== 'number') {
      return null;
    }
    if (Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function extractBearerUser(req: Request): Promise<AuthUser | undefined> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) return undefined;

  const row = await storage.findUserById(payload.id);
  if (!row) return undefined;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    language_pref: row.language_pref,
  };
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    req.user = await extractBearerUser(req);
  } catch {
    req.user = undefined;
  }
  next();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await extractBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await extractBearerUser(req);
    if (!user) {
      res.status(401).json({ error: 'Administrator authentication required.' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges required for this action.' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Administrator authentication required.' });
  }
}

export async function getAdminPasscodeStatus(): Promise<{ configuredViaEnv: boolean; claimedInDb: boolean }> {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const dbHash = await storage.getAdminPasscodeHash();
  return {
    configuredViaEnv: Boolean(envPasscode && envPasscode.length > 0),
    claimedInDb: Boolean(dbHash && dbHash.length > 0),
  };
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode && envPasscode.length > 0) {
    const a = Buffer.from(passcode, 'utf8');
    const b = Buffer.from(envPasscode, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const dbHash = await storage.getAdminPasscodeHash();
  if (!dbHash) return false;
  return verifyPassword(passcode, dbHash);
}
